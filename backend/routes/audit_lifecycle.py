from fastapi import APIRouter, HTTPException, Header, Query
from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any
from firebase_admin import auth, firestore
from datetime import datetime
import re

router = APIRouter()

def _check_audit_active(audit_id: str):
  db = firestore.client()
  doc = db.collection("audits").document(audit_id).get()
  data = doc.to_dict() if doc.exists else {}
  if (data.get("status") or "") == "COMPLETED":
    raise HTTPException(status_code=403, detail="Audit is locked and immutable")

def _assert_auditor_lock(audit_id: str, uid: str):
  db = firestore.client()
  doc = db.collection("audits").document(audit_id).get()
  data = doc.to_dict() if doc.exists else {}
  if not data.get("locked_by") or data.get("locked_by") != uid:
    raise HTTPException(status_code=403, detail="Audit lock not held by user")
# --- RBAC ---
def _extract_token(authorization: str, id_token: str) -> str:
  if authorization and isinstance(authorization, str) and authorization.lower().startswith("bearer "):
    return authorization.split(" ", 1)[1].strip()
  if id_token:
    return id_token
  raise HTTPException(status_code=401, detail="Missing Authorization or idToken")

def verify_user(id_token: str) -> dict:
  if not id_token:
    raise HTTPException(status_code=401, detail="Missing idToken")
  try:
    decoded = auth.verify_id_token(id_token)
    uid = decoded.get("uid")
    email = decoded.get("email")
  except Exception:
    raise HTTPException(status_code=401, detail="Invalid idToken")
  snap = firestore.client().collection("users").document(uid).get()
  if not snap.exists:
    raise HTTPException(status_code=403, detail="User not registered")
  data = snap.to_dict()
  return {"uid": uid, "email": email, "role": data.get("role"), "org_id": data.get("org_id")}

def verify_admin(id_token: str) -> str:
  if not id_token:
    raise HTTPException(status_code=401, detail="Missing idToken")
  try:
    decoded = auth.verify_id_token(id_token)
    uid = decoded.get("uid")
  except Exception:
    raise HTTPException(status_code=401, detail="Invalid idToken")
  doc = firestore.client().collection("users").document(uid).get()
  if not doc.exists or doc.to_dict().get("role") != "ADMIN":
    raise HTTPException(status_code=403, detail="Admin required")
  return uid

# --- Questions API ---
@router.get("/questions")
async def list_questions(authorization: str = Header(default=None, alias="Authorization", description="Primary: Authorization: Bearer <ID_TOKEN>"), idToken: str = Header(default=None)) -> List[Dict[str, Any]]:
  token = _extract_token(authorization, idToken)
  user = verify_user(token)
  db = firestore.client()
  items: List[Dict[str, Any]] = []
  q = db.collection("self_assessment_questions").order_by("order")
  for doc in q.stream():
    d = doc.to_dict()
    items.append({"id": doc.id, **d})
  return items

# --- User response autosave ---
class UserResponse(BaseModel):
  audit_id: str = Field(min_length=1)
  block_id: str = Field(min_length=1)
  question_id: str = Field(min_length=1)
  target_score: Optional[int] = None
  user_score: int = Field(ge=0)
  observation: Optional[str] = None
  photo_url: Optional[str] = None
  status: Optional[str] = None

@router.post("/audit/user-response")
async def save_user_response(body: UserResponse, authorization: str = Header(default=None, alias="Authorization", description="Primary: Authorization: Bearer <ID_TOKEN>"), idToken: str = Header(default=None)):
  token = _extract_token(authorization, idToken)
  user = verify_user(token)
  _check_audit_active(body.audit_id)
  if (user.get("role") or "").upper() != "CUSTOMER":
    raise HTTPException(status_code=403, detail="Only customers can save user responses")
  if not body.block_id or not body.question_id:
    raise HTTPException(status_code=400, detail="block_id and question_id are required")
  db = firestore.client()
  qref = db.collection("self_assessment_questions").document(str(body.question_id))
  qsnap = qref.get()
  if qsnap.exists:
    qd = qsnap.to_dict() or {}
    derived_category = qd.get("category")
    derived_subcategory = qd.get("subcategory")
  else:
    qd = {}
    m = re.match(r"^([A-F])\-([^-]+)\-", str(body.question_id))
    derived_category = m.group(1) if m else None
    derived_subcategory = m.group(2) if m else None
  status_raw = (body.status or "").strip().upper()
  valid_status = {"IN_PLACE", "PARTIAL", "NOT_IN_PLACE", "NOT_RELEVANT"}
  if status_raw and status_raw not in valid_status:
    raise HTTPException(status_code=400, detail="Invalid status value")
  base = db.collection("audit_responses").document(body.audit_id).collection("blocks").document(body.block_id).collection("questions").document(str(body.question_id))
  snap = base.get()
  prev = snap.to_dict() if snap.exists else {}
  final_score = prev.get("final_score")
  # derive status if not provided from user_score
  next_status = status_raw or ("IN_PLACE" if int(body.user_score) == 5 else "PARTIAL" if int(body.user_score) == 3 else "NOT_IN_PLACE")
  data = {
    "question_id": str(body.question_id),
    "category": qd.get("category"),
    "subcategory": qd.get("subcategory"),
    "status": next_status,
    "user_score": int(body.user_score),
    "auditor_score": prev.get("auditor_score", None),
    "final_score": final_score if isinstance(final_score, (int, float)) else int(body.user_score),
    "observation": body.observation if body.observation is not None else prev.get("observation", None),
    "photo_url": body.photo_url if body.photo_url is not None else prev.get("photo_url", None),
    "updated_by": "CUSTOMER",
    "updated_at": firestore.SERVER_TIMESTAMP
  }
  base.set(data, merge=True)
  return {"status": "upserted", "audit_id": body.audit_id, "question_id": body.question_id}

# --- Auditor response with enforcement ---
class AuditorResponse(BaseModel):
  audit_id: str = Field(min_length=1)
  block_id: str = Field(min_length=1)
  question_id: str = Field(min_length=1)
  auditor_score: Optional[int] = None
  final_score: Optional[int] = None
  observation: Optional[str] = None
  photo_url: Optional[str] = None
  status: Optional[str] = None

@router.post("/audit/auditor-response")
async def save_auditor_response(body: AuditorResponse, authorization: str = Header(default=None, alias="Authorization", description="Primary: Authorization: Bearer <ID_TOKEN>"), idToken: str = Header(default=None)):
  token = _extract_token(authorization, idToken)
  user = verify_user(token)
  _check_audit_active(body.audit_id)
  if (user.get("role") or "").upper() != "AUDITOR":
    raise HTTPException(status_code=403, detail="Only auditors can save auditor responses")
  _assert_auditor_lock(body.audit_id, user["uid"])
  if not body.block_id or not body.question_id:
    raise HTTPException(status_code=400, detail="block_id and question_id are required")
  if body.auditor_score is None and body.final_score is None and body.observation is None and body.photo_url is None:
    raise HTTPException(status_code=400, detail="No fields to update")
  db = firestore.client()
  qref = db.collection("self_assessment_questions").document(str(body.question_id))
  qsnap = qref.get()
  if qsnap.exists:
    qd = qsnap.to_dict() or {}
    derived_category = qd.get("category")
    derived_subcategory = qd.get("subcategory")
  else:
    qd = {}
    m = re.match(r"^([A-F])\-([^-]+)\-", str(body.question_id))
    derived_category = m.group(1) if m else None
    derived_subcategory = m.group(2) if m else None
  base = db.collection("audit_responses").document(body.audit_id).collection("blocks").document(body.block_id).collection("questions").document(str(body.question_id))
  snap = base.get()
  prev = snap.to_dict() if snap.exists else {}
  user_score = prev.get("user_score")
  next_final = body.final_score if body.final_score is not None else prev.get("final_score")
  next_auditor = body.auditor_score if body.auditor_score is not None else prev.get("auditor_score")
  status_raw = (body.status or "").strip().upper()
  valid_status = {"IN_PLACE", "PARTIAL", "NOT_IN_PLACE", "NOT_RELEVANT"}
  if status_raw and status_raw not in valid_status:
    raise HTTPException(status_code=400, detail="Invalid status value")
  # If final differs from user, require observation and photo
  if isinstance(user_score, (int, float)) and isinstance(next_final, (int, float)) and int(next_final) != int(user_score):
    if not body.observation or not body.photo_url:
      raise HTTPException(status_code=400, detail="Observation and photo_url required when final_score differs from user_score")
  # derive status from final if provided
  next_status = status_raw or ("IN_PLACE" if int(next_final or 0) == 5 else "PARTIAL" if int(next_final or -1) == 3 else "NOT_IN_PLACE" if int(next_final or -2) == 0 else prev.get("status") or "")
  data = {
    "question_id": str(body.question_id),
    "category": derived_category,
    "subcategory": derived_subcategory,
    "status": next_status if next_status else prev.get("status", None),
    "user_score": user_score,
    "auditor_score": next_auditor,
    "final_score": next_final,
    "observation": body.observation if body.observation is not None else prev.get("observation", None),
    "photo_url": body.photo_url if body.photo_url is not None else prev.get("photo_url", None),
    "updated_by": "AUDITOR",
    "updated_at": firestore.SERVER_TIMESTAMP
  }
  base.set(data, merge=True)
  return {"status": "upserted", "audit_id": body.audit_id, "question_id": body.question_id}

@router.post("/audits/{audit_id}/lock")
async def lock_audit(audit_id: str, authorization: str = Header(default=None, alias="Authorization", description="Primary: Authorization: Bearer <ID_TOKEN>"), idToken: str = Header(default=None)):
  token = _extract_token(authorization, idToken)
  user = verify_user(token)
  if (user.get("role") or "").upper() != "AUDITOR":
    raise HTTPException(status_code=403, detail="Only auditors can lock audits")
  db = firestore.client()
  ref = db.collection("audits").document(audit_id)
  snap = ref.get()
  cur = snap.to_dict() if snap.exists else {}
  locked_by = cur.get("locked_by")
  locked_at = cur.get("locked_at")
  if locked_by and locked_at:
    try:
      from datetime import datetime, timedelta
      if isinstance(locked_at, datetime) and datetime.utcnow() - locked_at <= timedelta(minutes=30):
        if locked_by != user["uid"]:
          raise HTTPException(status_code=409, detail="Audit already locked")
    except Exception:
      pass
  ref.set({"locked_by": user["uid"], "locked_at": firestore.SERVER_TIMESTAMP}, merge=True)
  return {"audit_id": audit_id, "locked_by": user["uid"]}

@router.get("/audits/{audit_id}")
async def get_audit(audit_id: str, authorization: str = Header(default=None, alias="Authorization", description="Primary: Authorization: Bearer <ID_TOKEN>"), idToken: str = Header(default=None)):
  token = _extract_token(authorization, idToken)
  verify_user(token)
  db = firestore.client()
  snap = db.collection("audits").document(audit_id).get()
  data = snap.to_dict() if snap.exists else {}
  return {"audit_id": audit_id, **data}

@router.get("/audits/{audit_id}/baseline")
async def get_audit_baseline(audit_id: str, authorization: str = Header(default=None, alias="Authorization", description="Primary: Authorization: Bearer <ID_TOKEN>"), idToken: str = Header(default=None)):
  token = _extract_token(authorization, idToken)
  verify_user(token)
  db = firestore.client()
  ref = db.collection("audit_responses").document(audit_id).collection("baseline_snapshot").document("profile")
  snap = ref.get()
  data = snap.to_dict() if snap.exists else {}
  return {"audit_id": audit_id, "baseline": data}

def _validate_audit_internal(db, audit_id: str) -> Dict[str, Any]:
  blockers: List[str] = []
  oq = db.collection("audit_observations").where("audit_id", "==", audit_id)
  for doc in oq.stream():
    d = doc.to_dict() or {}
    status = (d.get("closure_status") or "OPEN")
    if status != "CLOSED":
      b = f"Observation open: block={d.get('block_id')}, section={d.get('section')}, question={d.get('question_id')}"
      blockers.append(b)
  bcol = db.collection("audit_responses").document(audit_id).collection("blocks")
  for bdoc in bcol.stream():
    qcol = bdoc.reference.collection("questions")
    for doc in qcol.stream():
      d = doc.to_dict() or {}
      if d.get("auditor_score", None) is None:
        blockers.append(f"Missing auditor_score: block={bdoc.id}, question={doc.id}")
  return {"valid": len(blockers) == 0, "blockers": blockers}

@router.post("/audits/{audit_id}/validate")
async def validate_audit(audit_id: str, authorization: str = Header(default=None, alias="Authorization", description="Primary: Authorization: Bearer <ID_TOKEN>"), idToken: str = Header(default=None)):
  token = _extract_token(authorization, idToken)
  verify_user(token)
  db = firestore.client()
  return _validate_audit_internal(db, audit_id)

def _finalize_audit_internal(db, audit_id: str, performed_by: str) -> Dict[str, Any]:
  aref = db.collection("audits").document(audit_id)
  snap = aref.get()
  cur = snap.to_dict() if snap.exists else {}
  if (cur.get("status") or "") == "COMPLETED":
    return {"status": "COMPLETED", "audit_id": audit_id}
  aref.set({"status": "COMPLETED", "completed_at": firestore.SERVER_TIMESTAMP}, merge=True)
  db.collection("audit_logs").add({
    "audit_id": audit_id,
    "action": "FINALIZED",
    "performed_by": performed_by,
    "timestamp": firestore.SERVER_TIMESTAMP
  })
  return {"status": "COMPLETED", "audit_id": audit_id}

@router.post("/audits/{audit_id}/complete")
async def complete_audit(audit_id: str, authorization: str = Header(default=None, alias="Authorization", description="Primary: Authorization: Bearer <ID_TOKEN>"), idToken: str = Header(default=None)):
  token = _extract_token(authorization, idToken)
  user = verify_user(token)
  if (user.get("role") or "").upper() != "AUDITOR":
    raise HTTPException(status_code=403, detail="Only auditors can complete audits")
  _assert_auditor_lock(audit_id, user["uid"])
  db = firestore.client()
  res = _validate_audit_internal(db, audit_id)
  if not res.get("valid"):
    raise HTTPException(status_code=400, detail={"valid": False, "blockers": res.get("blockers") or []})
  return _finalize_audit_internal(db, audit_id, user["uid"])

class CompleteBody(BaseModel):
  audit_id: str = Field(min_length=1)

@router.post("/api/admin/audits/complete")
async def admin_complete_audit(body: CompleteBody, authorization: str = Header(default=None, alias="Authorization", description="Primary: Authorization: Bearer <ID_TOKEN>"), idToken: str = Header(default=None)):
  token = _extract_token(authorization, idToken)
  admin_uid = verify_admin(token)
  db = firestore.client()
  res = _validate_audit_internal(db, body.audit_id)
  if not res.get("valid"):
    raise HTTPException(status_code=400, detail={"valid": False, "blockers": res.get("blockers") or []})
  return _finalize_audit_internal(db, body.audit_id, admin_uid)

# --- Report generation helpers ---
def _collect_responses(db, audit_id: str) -> List[Dict[str, Any]]:
  res: List[Dict[str, Any]] = []
  bcol = db.collection("audit_responses").document(audit_id).collection("blocks")
  for bdoc in bcol.stream():
    qcol = bdoc.reference.collection("questions")
    for doc in qcol.stream():
      d = doc.to_dict() or {}
      res.append({"id": doc.id, "block_id": bdoc.id, **d})
  return res

def _report_context(db, audit_id: str) -> Dict[str, Any]:
  items = _collect_responses(db, audit_id)
  total_target = sum(int(x.get("target_score") or 0) for x in items)
  total_user = sum(int(x.get("user_score") or 0) for x in items if isinstance(x.get("user_score"), (int, float)))
  total_final = sum(int(x.get("auditor_final_score") or 0) for x in items if isinstance(x.get("auditor_final_score"), (int, float)))
  deltas = [int(x.get("delta") or 0) for x in items if x.get("delta") is not None]
  return {
    "audit_id": audit_id,
    "totals": {
      "target": total_target,
      "user": total_user,
      "auditor_final": total_final,
      "delta_sum": sum(deltas),
    },
    "questions": items
  }

# --- Initial Report ---
@router.post("/reports/initial/{audit_id}")
async def generate_initial(audit_id: str, authorization: str = Header(default=None, alias="Authorization", description="Primary: Authorization: Bearer <ID_TOKEN>"), idToken: str = Header(default=None)):
  token = _extract_token(authorization, idToken)
  admin_uid = verify_admin(token)
  db = firestore.client()
  ctx = _report_context(db, audit_id)
  # Upload PDF to Firebase Storage (if available)
  try:
    from weasyprint import HTML
    from jinja2 import Environment, FileSystemLoader, select_autoescape
    from pathlib import Path
    tpl_dir = Path(__file__).resolve().parents[1] / "templates" / "initial_report"
    env = Environment(loader=FileSystemLoader(str(tpl_dir)), autoescape=select_autoescape(["html"]))
    # Use existing report2.html if present
    tpl = env.get_template("report2.html")
    html_str = tpl.render(**ctx)
    pdf_bytes = HTML(string=html_str, base_url=str(tpl_dir)).write_pdf()
    # Storage upload
    try:
      from google.cloud import storage
      client = storage.Client()
      bucket_name = f"{firestore.client().project}.appspot.com"
      bucket = client.bucket(bucket_name)
      blob = bucket.blob(f"reports/{audit_id}/initial.pdf")
      blob.upload_from_string(pdf_bytes, content_type="application/pdf")
      url = f"https://storage.googleapis.com/{bucket_name}/reports/{audit_id}/initial.pdf"
    except Exception as e:
      raise HTTPException(status_code=500, detail=f"Storage upload failed: {str(e)}")
    # Firestore metadata
    db.collection("reports").document(f"{audit_id}_initial").set({
      "audit_id": audit_id,
      "type": "INITIAL",
      "download_url": url,
      "generated_by": admin_uid,
      "created_at": firestore.SERVER_TIMESTAMP
    }, merge=True)
    return {"status": "generated", "url": url}
  except HTTPException:
    raise
  except Exception as e:
    raise HTTPException(status_code=500, detail=f"Initial report failed: {str(e)}")

@router.get("/reports/preview/initial/{audit_id}")
async def preview_initial(audit_id: str, authorization: str = Header(default=None, alias="Authorization", description="Primary: Authorization: Bearer <ID_TOKEN>"), idToken: str = Header(default=None)):
  token = _extract_token(authorization, idToken)
  verify_admin(token)
  db = firestore.client()
  ctx = _report_context(db, audit_id)
  try:
    from jinja2 import Environment, FileSystemLoader, select_autoescape
    from pathlib import Path
    tpl_dir = Path(__file__).resolve().parents[1] / "templates" / "initial_report"
    env = Environment(loader=FileSystemLoader(str(tpl_dir)), autoescape=select_autoescape(["html"]))
    tpl = env.get_template("report2.html")
    html_str = tpl.render(**ctx)
    from fastapi.responses import HTMLResponse
    return HTMLResponse(content=html_str, media_type="text/html")
  except Exception as e:
    raise HTTPException(status_code=500, detail=f"Preview failed: {str(e)}")

# --- Final Report ---
@router.post("/reports/final/{audit_id}")
async def generate_final(audit_id: str, authorization: str = Header(default=None, alias="Authorization", description="Primary: Authorization: Bearer <ID_TOKEN>"), idToken: str = Header(default=None)):
  token = _extract_token(authorization, idToken)
  admin_uid = verify_admin(token)
  db = firestore.client()
  ctx = _report_context(db, audit_id)
  try:
    from weasyprint import HTML
    from jinja2 import Environment, FileSystemLoader, select_autoescape
    from pathlib import Path
    tpl_dir = Path(__file__).resolve().parents[1] / "templates" / "self_assessment"
    env = Environment(loader=FileSystemLoader(str(tpl_dir)), autoescape=select_autoescape(["html"]))
    # Reuse essay3_summary + summary_charts combined base if available; fallback to essay3_summary
    tpl = env.get_template("essay3_summary.html")
    html_str = tpl.render(**ctx)
    pdf_bytes = HTML(string=html_str, base_url=str(tpl_dir)).write_pdf()
    # Storage upload
    try:
      from google.cloud import storage
      client = storage.Client()
      bucket_name = f"{firestore.client().project}.appspot.com"
      bucket = client.bucket(bucket_name)
      blob = bucket.blob(f"reports/{audit_id}/final.pdf")
      blob.upload_from_string(pdf_bytes, content_type="application/pdf")
      url = f"https://storage.googleapis.com/{bucket_name}/reports/{audit_id}/final.pdf"
    except Exception as e:
      raise HTTPException(status_code=500, detail=f"Storage upload failed: {str(e)}")
    db.collection("reports").document(f"{audit_id}_final").set({
      "audit_id": audit_id,
      "type": "FINAL",
      "download_url": url,
      "generated_by": admin_uid,
      "created_at": firestore.SERVER_TIMESTAMP
    }, merge=True)
    return {"status": "generated", "url": url}
  except HTTPException:
    raise
  except Exception as e:
    raise HTTPException(status_code=500, detail=f"Final report failed: {str(e)}")

@router.get("/reports/preview/final/{audit_id}")
async def preview_final(audit_id: str, authorization: str = Header(default=None, alias="Authorization", description="Primary: Authorization: Bearer <ID_TOKEN>"), idToken: str = Header(default=None)):
  token = _extract_token(authorization, idToken)
  verify_admin(token)
  db = firestore.client()
  ctx = _report_context(db, audit_id)
  try:
    from jinja2 import Environment, FileSystemLoader, select_autoescape
    from pathlib import Path
    tpl_dir = Path(__file__).resolve().parents[1] / "templates" / "self_assessment"
    env = Environment(loader=FileSystemLoader(str(tpl_dir)), autoescape=select_autoescape(["html"]))
    tpl = env.get_template("essay3_summary.html")
    html_str = tpl.render(**ctx)
    from fastapi.responses import HTMLResponse
    return HTMLResponse(content=html_str, media_type="text/html")
  except Exception as e:
    raise HTTPException(status_code=500, detail=f"Preview failed: {str(e)}")
