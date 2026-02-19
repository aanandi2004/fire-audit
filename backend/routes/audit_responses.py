from fastapi import APIRouter, HTTPException, Header, Query
from pydantic import BaseModel, Field
from firebase_admin import auth, firestore
from typing import Optional, List, Dict

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

class ResponseBody(BaseModel):
    audit_id: str = Field(min_length=1)
    block_id: str = Field(min_length=1)
    question_id: str = Field(min_length=1)
    status: Optional[str] = None
    user_score: Optional[int] = None
    auditor_score: Optional[int] = None
    final_score: Optional[int] = None
    observation: Optional[str] = None
    photo_url: Optional[str] = None

class LockBody(BaseModel):
    audit_id: str = Field(min_length=1)
    block_id: str = Field(min_length=1)
    question_id: str = Field(min_length=1)
    is_locked: bool = True

@router.post("/audit/response")
async def upsert_response(body: ResponseBody, authorization: str = Header(default=None, alias="Authorization", description="Primary: Authorization: Bearer <ID_TOKEN>"), idToken: str = Header(default=None)):
    token = _extract_token(authorization, idToken)
    user = verify_user(token)
    _check_audit_active(body.audit_id)
    db = firestore.client()
    if user["role"] == "ADMIN":
        raise HTTPException(status_code=403, detail="Admin is read-only for responses")
    if not body.audit_id or not body.block_id or not body.question_id:
        raise HTTPException(status_code=400, detail="audit_id, block_id and question_id are required")
    status_raw = (body.status or "").strip().upper()
    valid_status = {"IN_PLACE", "PARTIAL", "NOT_IN_PLACE", "NOT_RELEVANT"}
    if body.status and status_raw not in valid_status:
        raise HTTPException(status_code=400, detail="Invalid status value")
    qref = db.collection("self_assessment_questions").document(str(body.question_id))
    qsnap = qref.get()
    if not qsnap.exists:
        raise HTTPException(status_code=404, detail="Question not found")
    qd = qsnap.to_dict() or {}
    ref = db.collection("audit_responses").document(body.audit_id).collection("blocks").document(body.block_id).collection("questions").document(str(body.question_id))
    snap = ref.get()
    prev = snap.to_dict() if snap.exists else {}
    if user["role"] == "CUSTOMER":
        if body.user_score is None:
            raise HTTPException(status_code=400, detail="user_score required for customer")
        status_final = status_raw or ("IN_PLACE" if int(body.user_score) == 5 else "PARTIAL" if int(body.user_score) == 3 else "NOT_IN_PLACE")
        payload = {
            "question_id": str(body.question_id),
            "category": qd.get("category"),
            "subcategory": qd.get("subcategory"),
            "status": status_final,
            "user_score": int(body.user_score),
            "auditor_score": prev.get("auditor_score", None),
            "final_score": prev.get("final_score", int(body.user_score)),
            "observation": body.observation if body.observation is not None else prev.get("observation", None),
            "photo_url": body.photo_url if body.photo_url is not None else prev.get("photo_url", None),
            "is_locked": False,
            "updated_by": "CUSTOMER",
            "updated_at": firestore.SERVER_TIMESTAMP
        }
        ref.set(payload, merge=True)
    elif user["role"] == "AUDITOR":
        _assert_auditor_lock(body.audit_id, user["uid"])
        if body.final_score is None and body.auditor_score is None and body.observation is None and body.photo_url is None:
            raise HTTPException(status_code=400, detail="No fields to update")
        next_final = body.final_score if body.final_score is not None else prev.get("final_score")
        if isinstance(prev.get("user_score"), (int, float)) and isinstance(next_final, (int, float)) and int(next_final) != int(prev.get("user_score")):
            if not body.observation or not body.photo_url:
                raise HTTPException(status_code=400, detail="Observation and photo_url required when final_score differs from user_score")
        status_final = status_raw or ("IN_PLACE" if int(next_final or 0) == 5 else "PARTIAL" if int(next_final or -1) == 3 else "NOT_IN_PLACE" if int(next_final or -2) == 0 else prev.get("status") or "")
        payload = {
            "question_id": str(body.question_id),
            "category": qd.get("category"),
            "subcategory": qd.get("subcategory"),
            "status": status_final if status_final else prev.get("status", None),
            "user_score": prev.get("user_score", None),
            "auditor_score": body.auditor_score if body.auditor_score is not None else prev.get("auditor_score", None),
            "final_score": next_final,
            "observation": body.observation if body.observation is not None else prev.get("observation", None),
            "photo_url": body.photo_url if body.photo_url is not None else prev.get("photo_url", None),
            "is_locked": False,
            "updated_by": "AUDITOR",
            "updated_at": firestore.SERVER_TIMESTAMP
        }
        ref.set(payload, merge=True)
    else:
        raise HTTPException(status_code=403, detail="Unsupported role")
    return {"status": "updated", "audit_id": body.audit_id, "block_id": body.block_id, "question_id": body.question_id}

class SaveRequest(BaseModel):
    audit_id: str = Field(min_length=1)
    org_id: str = Field(min_length=1)
    block_id: str = Field(min_length=1)
    group: str = Field(min_length=1)
    subdivision_id: str = Field(min_length=1)
    question_id: str = Field(min_length=1)
    status: str = Field(min_length=1)
    value: Optional[str] = None

def _compound_id(block_id: str, group: str, subdivision_id: str, question_id: str) -> str:
    return f"{str(block_id)}__{str(group)}__{str(subdivision_id)}__{str(question_id)}"

@router.post("/audit-responses/save")
async def save_response(body: SaveRequest, authorization: str = Header(default=None, alias="Authorization", description="Primary: Authorization: Bearer <ID_TOKEN>"), idToken: str = Header(default=None)):
    token = _extract_token(authorization, idToken)
    user = verify_user(token)
    _check_audit_active(body.audit_id)
    if user["role"] != "CUSTOMER" and user["role"] != "AUDITOR":
        raise HTTPException(status_code=403, detail="Only customer or auditor can save responses")
    if user["role"] == "CUSTOMER" and user.get("org_id") and user["org_id"] != body.org_id:
        raise HTTPException(status_code=403, detail="Organization mismatch")
    if user["role"] == "AUDITOR":
        _assert_auditor_lock(body.audit_id, user["uid"])
    db = firestore.client()
    if not all([body.audit_id, body.org_id, body.block_id, body.group, body.subdivision_id, body.question_id, body.status]):
        raise HTTPException(status_code=400, detail="Missing required fields")
    status_upper = (body.status or "").strip().upper().replace(" ", "_")
    valid_status = {"IN_PLACE", "PARTIAL", "NOT_IN_PLACE", "NOT_RELEVANT"}
    if status_upper not in valid_status:
        raise HTTPException(status_code=400, detail="Invalid status")
    # deterministic id
    cid = _compound_id(body.block_id, body.group, body.subdivision_id, body.question_id)
    ref = db.collection("audit_responses").document(body.audit_id).collection("responses").document(cid)
    payload = {
        "audit_id": body.audit_id,
        "org_id": body.org_id,
        "block_id": str(body.block_id),
        "group": str(body.group),
        "subdivision_id": str(body.subdivision_id),
        "question_id": str(body.question_id),
        "status": status_upper,
        "value": body.value or "",
        "updated_by": user["role"],
        "updated_at": firestore.SERVER_TIMESTAMP,
    }
    # idempotent upsert
    ref.set(payload, merge=True)
    return {"status": "saved", "id": cid}

@router.get("/audit-responses/list")
async def list_saved_responses(audit_id: str = Query(min_length=1), block_id: Optional[str] = None, authorization: str = Header(default=None, alias="Authorization", description="Primary: Authorization: Bearer <ID_TOKEN>"), idToken: str = Header(default=None)) -> List[dict]:
    token = _extract_token(authorization, idToken)
    verify_user(token)
    db = firestore.client()
    base = db.collection("audit_responses").document(audit_id).collection("responses")
    res: List[dict] = []
    q = base
    if block_id:
        # client-side filter since compound id includes block; we also store block_id field
        q = base.where("block_id", "==", str(block_id))
    for doc in q.stream():
        d = doc.to_dict() or {}
        res.append({"id": doc.id, **d})
    return res
@router.get("/audit/responses")
async def list_responses(assignment_id: str = Query(min_length=1), authorization: str = Header(default=None, alias="Authorization", description="Primary: Authorization: Bearer <ID_TOKEN>"), idToken: str = Header(default=None)) -> List[dict]:
    token = _extract_token(authorization, idToken)
    user = verify_user(token)
    db = firestore.client()
    asg = db.collection("assignments").document(assignment_id).get()
    if not asg.exists:
        raise HTTPException(status_code=404, detail="Assignment not found")
    asg_data = asg.to_dict()
    if user["role"] == "CUSTOMER" and user.get("org_id") and user["org_id"] != asg_data.get("org_id"):
        raise HTTPException(status_code=403, detail="Organization mismatch")
    res = []
    bcol = db.collection("audit_responses").document(assignment_id).collection("blocks")
    for bdoc in bcol.stream():
        qcol = bdoc.reference.collection("questions")
        for doc in qcol.stream():
            d = doc.to_dict()
            res.append({"id": doc.id, "block_id": bdoc.id, **d})
    return res

@router.post("/audit/lock")
async def lock_response(body: LockBody, authorization: str = Header(default=None, alias="Authorization", description="Primary: Authorization: Bearer <ID_TOKEN>"), idToken: str = Header(default=None)):
    token = _extract_token(authorization, idToken)
    user = verify_user(token)
    if user["role"] not in ("ADMIN", "AUDITOR"):
        raise HTTPException(status_code=403, detail="Not allowed")
    _check_audit_active(body.audit_id)
    db = firestore.client()
    ref = db.collection("audit_responses").document(body.audit_id).collection("blocks").document(body.block_id).collection("questions").document(str(body.question_id))
    if not ref.get().exists:
        raise HTTPException(status_code=404, detail="Response not found")
    ref.update({"is_locked": body.is_locked, "updated_at": firestore.SERVER_TIMESTAMP})
    return {"audit_id": body.audit_id, "block_id": body.block_id, "question_id": body.question_id, "status": "locked" if body.is_locked else "unlocked"}

# ---------------- ORG RESPONSES (CUSTOMER) ----------------

class OrgResponseSaveBody(BaseModel):
    audit_id: str = Field(min_length=1)
    org_id: str = Field(min_length=1)
    block_id: str = Field(min_length=1)
    group: str = Field(min_length=1)
    subdivision_id: str = Field(min_length=1)
    question_id: str = Field(min_length=1)
    status: Optional[str] = None
    value: Optional[str] = None

@router.post("/org-responses/save")
async def save_org_responses(body: List[OrgResponseSaveBody], authorization: str = Header(default=None, alias="Authorization", description="Primary: Authorization: Bearer <ID_TOKEN>"), idToken: str = Header(default=None)):
    LOCKED = False
    if LOCKED:
        raise HTTPException(status_code=403, detail="Org responses are temporarily locked")
    # --- V1 FREEZE: Org Responses Contract ---
    # org_responses is the single source of truth for org-entered data
    # Schema is frozen for v1; fields and document structure MUST NOT change:
    # { audit_id, org_id, block_id, group, subdivision_id, question_id, status?, value, updated_by, updated_at }
    # Idempotent upserts are mandatory
    # TODO: Auditor flows populate audit_responses only
    token = _extract_token(authorization, idToken)
    user = verify_user(token)
    if (user.get("role") or "").upper() != "CUSTOMER":
        raise HTTPException(status_code=403, detail="Only customers can save org responses")
    db = firestore.client()
    valid_status = {"IN_PLACE", "PARTIAL", "NOT_IN_PLACE", "NOT_RELEVANT"}
    results: List[dict] = []
    for item in (body or []):
        _check_audit_active(item.audit_id)
        if not all([item.audit_id, item.org_id, item.block_id, item.group, item.subdivision_id, item.question_id]):
            results.append({"question_id": item.question_id, "status": "failed", "error": "Missing required identifiers"})
            continue
        # org ownership check
        if user.get("org_id") and user["org_id"] != item.org_id:
            results.append({"question_id": item.question_id, "status": "failed", "error": "Organization mismatch"})
            continue
        status_upper = (item.status or "").strip().upper().replace(" ", "_")
        if item.status and status_upper not in valid_status:
            results.append({"question_id": item.question_id, "status": "failed", "error": "Invalid status"})
            continue
        cid = _compound_id(item.block_id, item.group, item.subdivision_id, item.question_id)
        ref = db.collection("org_responses").document(item.audit_id).collection("responses").document(cid)
        payload = {
            "audit_id": item.audit_id,
            "org_id": item.org_id,
            "block_id": str(item.block_id),
            "group": str(item.group),
            "subdivision_id": str(item.subdivision_id),
            "question_id": str(item.question_id),
            "status": status_upper if item.status else None,
            "value": item.value or "",
            "updated_by": "CUSTOMER",
            "updated_at": firestore.SERVER_TIMESTAMP,
        }
        ref.set(payload, merge=True)
        results.append({"question_id": item.question_id, "status": "success"})
    return {"results": results}

@router.get("/org-responses/list")
async def list_org_responses(audit_id: str = Query(min_length=1), block_id: Optional[str] = None, authorization: str = Header(default=None, alias="Authorization", description="Primary: Authorization: Bearer <ID_TOKEN>"), idToken: str = Header(default=None)) -> List[dict]:
    # --- V1 FREEZE: Org Responses Retrieval ---
    # Returns org_responses documents without altering schema; customer users restricted to own org
    token = _extract_token(authorization, idToken)
    user = verify_user(token)
    db = firestore.client()
    base = db.collection("org_responses").document(audit_id).collection("responses")
    res: List[dict] = []
    q = base
    if block_id:
        q = base.where("block_id", "==", str(block_id))
    for doc in q.stream():
        d = doc.to_dict() or {}
        # ensure customer can only read own org responses
        if (user.get("role") or "").upper() == "CUSTOMER" and user.get("org_id") and d.get("org_id") and user["org_id"] != d.get("org_id"):
            continue
        res.append({"id": doc.id, **d})
    return res

# ---------------- ORG BUILDING DETAILS (CUSTOMER) ----------------

class OrgBuildingDetailsSection(BaseModel):
    section_id: str = Field(min_length=1)
    fields: Dict[str, Optional[str]] = Field(default_factory=dict)

class OrgBuildingDetailsSaveBody(BaseModel):
    audit_id: str = Field(min_length=1)
    org_id: str = Field(min_length=1)
    sections: List[OrgBuildingDetailsSection] = Field(default_factory=list)

@router.post("/org-responses/building-details/save")
async def save_org_building_details(body: OrgBuildingDetailsSaveBody, authorization: str = Header(default=None, alias="Authorization", description="Primary: Authorization: Bearer <ID_TOKEN>"), idToken: str = Header(default=None)):
    token = _extract_token(authorization, idToken)
    user = verify_user(token)
    _check_audit_active(body.audit_id)
    if (user.get("role") or "").upper() != "CUSTOMER":
        raise HTTPException(status_code=403, detail="Only customers can save building details")
    if user.get("org_id") and user["org_id"] != body.org_id:
        raise HTTPException(status_code=403, detail="Organization mismatch")
    db = firestore.client()
    parent = db.collection("org_responses").document(body.audit_id)
    parent.set({"org_id": body.org_id, "audit_id": body.audit_id, "updated_at": firestore.SERVER_TIMESTAMP}, merge=True)
    saved = 0
    for sec in (body.sections or []):
        if not sec.section_id:
            continue
        sref = parent.collection("building_details").document(sec.section_id)
        sref.set({
            "section_id": sec.section_id,
            "fields": sec.fields or {},
            "updated_at": firestore.SERVER_TIMESTAMP,
            "updated_by": "CUSTOMER"
        }, merge=True)
        saved += 1
    return {"status": "ok", "sections_saved": saved}

@router.get("/org-responses/building-details/list")
async def list_org_building_details(audit_id: str = Query(min_length=1), authorization: str = Header(default=None, alias="Authorization", description="Primary: Authorization: Bearer <ID_TOKEN>"), idToken: str = Header(default=None)):
    token = _extract_token(authorization, idToken)
    user = verify_user(token)
    db = firestore.client()
    parent = db.collection("org_responses").document(audit_id)
    psnap = parent.get()
    pdata = psnap.to_dict() if psnap.exists else {}
    parent_org_id = str(pdata.get("org_id") or "")
    if (user.get("role") or "").upper() == "CUSTOMER" and user.get("org_id") and parent_org_id and user["org_id"] != parent_org_id:
        raise HTTPException(status_code=403, detail="Organization mismatch")
    sections = []
    merged_fields = {}
    try:
        for doc in parent.collection("building_details").stream():
            d = doc.to_dict() or {}
            sid = str(d.get("section_id") or doc.id)
            fields = d.get("fields") or {}
            sections.append({"section_id": sid, "fields": fields})
            for k, v in (fields or {}).items():
                merged_fields[k] = v
    except Exception:
        sections = []
        merged_fields = {}
    return {"sections": sections, "fields": merged_fields}
