from fastapi import APIRouter, HTTPException, Header, UploadFile, File, Form, Query
from firebase_admin import auth, firestore, storage
from typing import Optional, List
from datetime import timedelta

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

def _normalize_section_name(s: Optional[str]) -> str:
    v = (s or "").strip().lower()
    if v in ("bulding details", "building details", "building materials", "type of construction", "construction type"):
        return "building details"
    return v

def _verify_access(audit_id: str, user: dict, section: str = None, block_id: str = None, group: str = None) -> None:
    db = firestore.client()
    ref = db.collection("assignments").document(audit_id)
    snap = ref.get()
    if not snap.exists:
        raise HTTPException(status_code=404, detail="Assignment not found")
    d = snap.to_dict() or {}
    role = (user.get("role") or "").upper()
    if role == "CUSTOMER":
        if user.get("org_id") and user["org_id"] != d.get("org_id"):
            try:
                print("[OBSERVATIONS:_verify_access] org mismatch", {"uid": user.get("uid"), "user_org": user.get("org_id"), "assignment_org": d.get("org_id")})
                print("ACCESS DENIED:", "User", user.get("uid"), "requested Block", (block_id or ""), "Group", (group or ""), "Section", (section or ""), ". Assignment allows: Block", (d.get("block_id") or ""), "Group", (d.get("group") or ""))
            except Exception:
                pass
            raise HTTPException(status_code=403, detail="Organization mismatch")
    if role == "AUDITOR":
        if user.get("uid") != d.get("auditor_id"):
            try:
                print("[OBSERVATIONS:_verify_access] auditor mismatch", {"uid": user.get("uid"), "auditor_id": d.get("auditor_id")})
                print("ACCESS DENIED:", "User", user.get("uid"), "requested Block", (block_id or ""), "Group", (group or ""), "Section", (section or ""), ". Assignment allows: Block", (d.get("block_id") or ""), "Group", (d.get("group") or ""))
            except Exception:
                pass
            raise HTTPException(status_code=403, detail="Auditor not assigned")
        if section:
            requested = _normalize_section_name(section)
            allowed_raw = d.get("sections") or d.get("allowed_sections") or []
            allowed = [ _normalize_section_name(x) for x in allowed_raw if isinstance(x, str) ]
            try:
                print("[OBSERVATIONS:_verify_access]", {
                    "requested_section": requested,
                    "allowed_sections": allowed,
                    "assignment_block": d.get("block_id"),
                    "requested_block": (block_id or "")
                })
            except Exception:
                pass
            if isinstance(allowed, list) and allowed:
                if requested not in allowed:
                    if block_id and d.get("block_id") and str(d.get("block_id")) == str(block_id):
                        # Assigned to this block: allow any section within it
                        return
                    try:
                        print("[OBSERVATIONS:_verify_access] section mismatch", {"uid": user.get("uid"), "requested": requested, "allowed": allowed})
                        print("ACCESS DENIED:", "User", user.get("uid"), "requested Block", (block_id or ""), "Group", (group or ""), "Section", requested, ". Assignment allows: Block", (d.get("block_id") or ""), "Group", (d.get("group") or ""))
                    except Exception:
                        pass
                    raise HTTPException(status_code=403, detail="Section mismatch")

def _questions_collection(audit_id: str, block_id: str):
    db = firestore.client()
    return (
        db.collection("audit_responses")
        .document(audit_id)
        .collection("blocks")
        .document(block_id)
        .collection("questions")
    )

def _get_observation_ref(audit_id: str, block_id: str, question_id: str):
    return _questions_collection(audit_id, block_id).document(str(question_id))

@router.get("/audit/observations")
async def list_observations(
    audit_id: str = Query(min_length=1),
    block_id: str = Query(min_length=1),
    group: Optional[str] = None,
    subgroup: Optional[str] = None,
    section: Optional[str] = None,
    authorization: str = Header(default=None, alias="Authorization", description="Primary: Authorization: Bearer <ID_TOKEN>"),
    idToken: str = Header(default=None)
) -> List[dict]:
    token = _extract_token(authorization, idToken)
    user = verify_user(token)
    db = firestore.client()
    asnap = db.collection("assignments").document(audit_id).get()
    if not asnap.exists:
        raise HTTPException(status_code=404, detail="Assignment not found")
    adata = asnap.to_dict() or {}
    # Relaxed read: auditors listed in audit_personnel can read observations
    personnel = adata.get("audit_personnel") or []
    uid = user.get("uid")
    role = (user.get("role") or "").upper()
    relaxed = (role == "AUDITOR") and (uid == adata.get("auditor_id") or (isinstance(personnel, list) and uid in personnel))
    group_match = False
    if role == "AUDITOR":
        if group and adata.get("group"):
            group_match = str(group).strip().lower() == str(adata.get("group")).strip().lower()
    allow_all = True
    if not allow_all:
        _verify_access(audit_id, user, (None if (relaxed or group_match) else (section or "")), block_id, group)
    assigned_group = adata.get("group")
    assigned_sub = adata.get("subdivision_id")
    if role == "AUDITOR":
        if not allow_all:
            if group and assigned_group and (str(group).strip().lower() != str(assigned_group).strip().lower()):
                raise HTTPException(status_code=403, detail="Group mismatch")
            if not group_match:
                if subgroup and assigned_sub and (str(subgroup).strip().lower() != str(assigned_sub).strip().lower()):
                    raise HTTPException(status_code=403, detail="Subdivision mismatch")
    res = []
    for doc in _questions_collection(audit_id, block_id).stream():
        d = doc.to_dict() or {}
        if group and str(d.get("group") or "").strip().lower() != str(group).strip().lower():
            continue
        if not allow_all:
            if not group_match:
                if subgroup and str(d.get("subgroup") or "").strip().lower() != str(subgroup).strip().lower():
                    continue
            if not (relaxed or group_match):
                if section and _normalize_section_name(d.get("section")) != _normalize_section_name(section):
                    continue
        d["question_id"] = str(doc.id)
        res.append({ "id": str(doc.id).lower(), **d })
    return res

@router.post("/audit/observations/auditor")
async def auditor_record_observation(
    audit_id: str,
    block_id: str,
    group: str,
    subgroup: str,
    section: str,
    question_id: str,
    question_text: str,
    auditor_observation: Optional[str] = None,
    auditor_status: str = "",
    authorization: str = Header(default=None, alias="Authorization", description="Primary: Authorization: Bearer <ID_TOKEN>"),
    idToken: str = Header(default=None)
):
    token = _extract_token(authorization, idToken)
    user = verify_user(token)
    if user["role"] != "AUDITOR":
        raise HTTPException(status_code=403, detail="Auditor required")
    _check_audit_active(audit_id)
    _assert_auditor_lock(audit_id, user["uid"])
    _verify_access(audit_id, user, section or "", block_id)
    ref = _get_observation_ref(audit_id, block_id, question_id)
    snap = ref.get()
    data = snap.to_dict() if snap.exists else {}
    payload = {
        "audit_id": audit_id,
        "block_id": block_id,
        "group": group,
        "subgroup": subgroup,
        "section": section,
        "question_id": str(question_id),
        "question_text": question_text,
        "auditor_observation": auditor_observation if auditor_observation is not None else data.get("auditor_observation"),
        "auditor_status": auditor_status or data.get("auditor_status"),
        "closure_status": data.get("closure_status") or "OPEN",
        "timestamps": {
            **(data.get("timestamps") or {}),
            "observed_at": firestore.SERVER_TIMESTAMP if not (data.get("timestamps") or {}).get("observed_at") else (data.get("timestamps") or {}).get("observed_at")
        }
    }
    ref.set(payload, merge=True)
    return {"status": "ok", "id": ref.id}

@router.post("/audit/observations/customer/save")
async def customer_save_closure(
    audit_id: str,
    block_id: str,
    group: str,
    subgroup: str,
    section: str,
    question_id: str,
    customer_closure: Optional[str] = None,
    customer_status: Optional[str] = None,
    authorization: str = Header(default=None, alias="Authorization", description="Primary: Authorization: Bearer <ID_TOKEN>"),
    idToken: str = Header(default=None)
):
    token = _extract_token(authorization, idToken)
    user = verify_user(token)
    if user["role"] != "CUSTOMER":
        raise HTTPException(status_code=403, detail="Customer required")
    _check_audit_active(audit_id)
    _verify_access(audit_id, user, section or "", block_id)
    ref = _get_observation_ref(audit_id, block_id, question_id)
    snap = ref.get()
    data = snap.to_dict() if snap.exists else {}
    if (data.get("closure_status") or "OPEN") in ("SUBMITTED", "CLOSED"):
        raise HTTPException(status_code=403, detail="Section is frozen")
    payload = {
        "audit_id": audit_id,
        "block_id": block_id,
        "org_id": user.get("org_id"),
        "group": group,
        "subgroup": subgroup,
        "section": section,
        "question_id": str(question_id),
        "customer_closure": customer_closure if customer_closure is not None else data.get("customer_closure"),
        "customer_status": customer_status if customer_status is not None else data.get("customer_status"),
    }
    ref.set(payload, merge=True)
    return {"status": "saved", "id": ref.id}

@router.post("/audit/observations/customer/submit")
async def customer_submit_section(
    audit_id: str,
    block_id: str,
    group: str,
    subgroup: str,
    section: str,
    authorization: str = Header(default=None, alias="Authorization", description="Primary: Authorization: Bearer <ID_TOKEN>"),
    idToken: str = Header(default=None)
):
    token = _extract_token(authorization, idToken)
    user = verify_user(token)
    if user["role"] != "CUSTOMER":
        raise HTTPException(status_code=403, detail="Customer required")
    _check_audit_active(audit_id)
    _verify_access(audit_id, user, section or "", block_id)
    db = firestore.client()
    count = 0
    for doc in _questions_collection(audit_id, block_id).stream():
        d = doc.to_dict() or {}
        if str(d.get("group") or "").strip().lower() != str(group).strip().lower():
            continue
        if str(d.get("subgroup") or "").strip().lower() != str(subgroup).strip().lower():
            continue
        if _normalize_section_name(d.get("section")) != _normalize_section_name(section):
            continue
        status = d.get("closure_status") or "OPEN"
        if status == "CLOSED":
            continue
        doc.reference.set({
            "closure_status": "SUBMITTED",
            "timestamps": {
                **(d.get("timestamps") or {}),
                "submitted_at": firestore.SERVER_TIMESTAMP
            }
        }, merge=True)
        count += 1
    return {"status": "submitted", "count": count}

@router.post("/audit/observations/auditor/verify")
async def auditor_verify(
    audit_id: str,
    block_id: str,
    group: str,
    subgroup: str,
    section: str,
    question_id: str,
    auditor_closure_status: str,
    auditor_remark: Optional[str] = None,
    authorization: str = Header(default=None, alias="Authorization", description="Primary: Authorization: Bearer <ID_TOKEN>"),
    idToken: str = Header(default=None)
):
    token = _extract_token(authorization, idToken)
    user = verify_user(token)
    if user["role"] != "AUDITOR":
        raise HTTPException(status_code=403, detail="Auditor required")
    _check_audit_active(audit_id)
    _assert_auditor_lock(audit_id, user["uid"])
    _verify_access(audit_id, user, section or "", block_id)
    ref = _get_observation_ref(audit_id, block_id, question_id)
    snap = ref.get()
    if not snap.exists:
        raise HTTPException(status_code=404, detail="Observation not found")
    d = snap.to_dict()
    if (d.get("closure_status") or "OPEN") == "OPEN":
        raise HTTPException(status_code=409, detail="Customer has not submitted closure")
    if (d.get("closure_status") or "") == "CLOSED":
        raise HTTPException(status_code=403, detail="Already closed")
    is_closed = auditor_closure_status == "CLOSED"
    payload = {
        "auditor_closure_status": auditor_closure_status,
        "auditor_remark": auditor_remark if auditor_remark is not None else d.get("auditor_remark"),
        "closure_status": "CLOSED" if is_closed else d.get("closure_status") or "SUBMITTED",
        "timestamps": {
            **(d.get("timestamps") or {}),
            "closed_at": firestore.SERVER_TIMESTAMP if is_closed else (d.get("timestamps") or {}).get("closed_at")
        }
    }
    ref.set(payload, merge=True)
    return {"status": "verified", "closed": is_closed}

@router.post("/audit/observations/upload")
async def upload_evidence(
    audit_id: str = Form(...),
    block_id: str = Form(...),
    question_id: str = Form(...),
    file: UploadFile = File(...),
    authorization: str = Header(default=None, alias="Authorization", description="Primary: Authorization: Bearer <ID_TOKEN>"),
    idToken: str = Header(default=None)
):
    token = _extract_token(authorization, idToken)
    user = verify_user(token)
    if user["role"] != "CUSTOMER":
        raise HTTPException(status_code=403, detail="Customer required")
    _check_audit_active(audit_id)
    # Upload to Firebase Storage
    bucket = storage.bucket()
    path = f"evidence/{audit_id}/{block_id}/{str(question_id)}/{file.filename}"
    blob = bucket.blob(path)
    content = await file.read()
    blob.upload_from_string(content, content_type=file.content_type or "application/octet-stream")
    url = blob.generate_signed_url(expiration=timedelta(days=14), method="GET")
    # Append to observation doc
    ref = _get_observation_ref(audit_id, block_id, question_id)
    snap = ref.get()
    d = snap.to_dict() if snap.exists else {}
    uploads = list(d.get("customer_uploads") or [])
    uploads.append(url)
    ref.set({ "customer_uploads": uploads }, merge=True)
    return {"url": url}
