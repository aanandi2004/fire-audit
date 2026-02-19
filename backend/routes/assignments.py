from fastapi import APIRouter, HTTPException, Header
from pydantic import BaseModel, Field
from firebase_admin import auth, firestore
from typing import List

router = APIRouter()

GROUP_MAP = {
    "Group A – Residential": "A",
    "Group B – Educational": "B",
    "Group C – Institutional": "C",
    "Group D – Assembly": "D",
    "Group E – Business": "E",
    "Group F – Mercantile": "F",
    "Group G – Industrial": "G",
    "Group H – Storage": "H",
    "Group I – Miscellaneous": "I",
    "Group J – Hazardous": "J",
}

SUBDIVISION_MAP = {
    # Group A
    "A-1 Lodging and rooming houses": "A-1",
    "A-2 One or two family private dwellings": "A-2",
    "A-3 Dormitories": "A-3",
    "A-4 Apartment houses": "A-4",
    "A-5 Hotels": "A-5",
    "A-6 Starred hotels": "A-6",
    "General – Group A": "A-GEN",
    # Group B
    "B-1 Schools up to senior secondary level": "B-1",
    "B-2 All others / training institutions": "B-2",
    "General – Group B": "B-GEN",
    # Group C
    "C-2 Custodial institutions": "C-2",
    "C-3 Penal and mental institutions": "C-3",
    "General – Group C": "C-GEN",
    # Group D
    "D-1 Theatres or halls over 1000 persons": "D-1",
    "D-2 Theatres or halls up to 1000 persons": "D-2",
    "D-3 Halls without permanent stage ≥300 persons": "D-3",
    "D-4 Enclosed assembly spaces": "D-4",
    "D-5 Other assembly structures at ground level": "D-5",
    "D-6 Mixed assembly and mercantile": "D-6",
    "D-7 Underground and elevated mass rapid systems": "D-7",
    "General – Group D": "D-GEN",
    # Group E
    "E-1 Offices, banks, professional establishments": "E-1",
    "E-2 Laboratories, clinics, libraries, test houses": "E-2",
    "E-3 Data centres, IT parks, call centres": "E-3",
    "E-4 Telephone exchanges": "E-4",
    "E-5 Broadcasting, TV stations, ATC towers": "E-5",
    "General – Group E": "E-GEN",
    # Group F
    "F-1 Shops and markets up to 500 m²": "F-1",
    "F-2 Shops and markets over 500 m²": "F-2",
    "F-3 Underground shopping centres": "F-3",
    "General – Group F": "F-GEN",
    # Group G
    "G-1 Low hazard industries": "G-1",
    "G-2 Moderate hazard industries": "G-2",
    "G-3 High hazard industries": "G-3",
    "General – Group G": "G-GEN",
    # Group H
    "H-1 Storage occupancies": "H-1",
    "General – Group H": "H-GEN",
    # Group J
    "J-1 Hazardous occupancies": "J-1",
    "General – Group J": "J-GEN",
}
CANONICAL_GROUPS = set(GROUP_MAP.values())
CANONICAL_SUBDIVISIONS = set(SUBDIVISION_MAP.values())

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

def _extract_token(authorization: str, id_token: str) -> str:
    if authorization and isinstance(authorization, str) and authorization.lower().startswith("bearer "):
        return authorization.split(" ", 1)[1].strip()
    if id_token:
        return id_token
    raise HTTPException(status_code=401, detail="Missing Authorization or idToken")

def _group_code_from_label(label: str) -> str:
    code = GROUP_MAP.get(label or "")
    if not code:
        raise HTTPException(status_code=400, detail=f"Invalid occupancy group: {label}")
    return code

def _subdivision_id_from_label(label: str) -> str:
    code = SUBDIVISION_MAP.get(label or "")
    if not code:
        raise HTTPException(status_code=400, detail=f"Invalid subdivision: {label}")
    return code
class AssignmentCreate(BaseModel):
    org_id: str = Field(min_length=1)
    org_name: str = Field(min_length=1)
    block_id: str = Field(min_length=1)
    block_name: str = Field(min_length=1)
    occupancy_group: str = Field(min_length=1)
    subdivision: str = Field(min_length=1)
    auditor_id: str = Field(min_length=1)
    auditor_name: str = Field(min_length=1)

@router.post("/assignments")
async def create_assignment(body: AssignmentCreate, authorization: str = Header(default=None, alias="Authorization", description="Primary: Authorization: Bearer <ID_TOKEN>"), idToken: str = Header(default=None)):
    token = _extract_token(authorization, idToken)
    admin_uid = verify_admin(token)
    db = firestore.client()
    org_snap = db.collection("organizations").document(body.org_id).get()
    if not org_snap.exists:
        raise HTTPException(status_code=404, detail="Organization not found")
    auditor_snap = db.collection("users").document(body.auditor_id).get()
    if not auditor_snap.exists or auditor_snap.to_dict().get("role") != "AUDITOR":
        raise HTTPException(status_code=404, detail="Auditor not found or role mismatch")
    group_code = _group_code_from_label(body.occupancy_group)
    subdivision_id = _subdivision_id_from_label(body.subdivision)
    dup_q = db.collection("assignments")\
        .where("org_id", "==", body.org_id)\
        .where("block_id", "==", body.block_id)\
        .where("group", "==", group_code)\
        .where("subdivision_id", "==", subdivision_id)\
        .where("is_active", "==", True)
    dup_ids = [doc.id for doc in dup_q.stream()]
    if dup_ids:
        raise HTTPException(status_code=409, detail={"error": "DUPLICATE_SCOPE", "assignment_ids": dup_ids})
    payload = {
        "org_id": body.org_id,
        "org_name": body.org_name,
        "block_id": body.block_id,
        "block_name": body.block_name,
        "group": group_code,
        "subdivision_id": subdivision_id,
        "occupancy_group_label": body.occupancy_group,
        "subdivision_label": body.subdivision,
        "auditor_id": body.auditor_id,
        "auditor_name": body.auditor_name,
        "created_by": admin_uid,
        "created_at": firestore.SERVER_TIMESTAMP,
        "is_active": True,
    }
    # --- V1 FREEZE: Assignment → Audit Identity ---
    # audit_id MUST always equal the assignment document id
    # audit_id MUST be created once at assignment creation
    # audit_id MUST NOT be regenerated, mutated, or inferred elsewhere
    ref = db.collection("assignments").document()
    payload["audit_id"] = ref.id
    ref.set(payload)
    audits_ref = db.collection("audits").document(ref.id)
    audits_ref.set({
        "org_id": body.org_id,
        "status": "IN_PROGRESS",
        "locked_by": None,
        "locked_at": None,
        "created_at": firestore.SERVER_TIMESTAMP
    }, merge=True)
    baseline = {}
    try:
        prof = db.collection("org_profiles").document(body.org_id).get()
        baseline = prof.to_dict() or {}
    except Exception:
        baseline = {}
    db.collection("audit_responses").document(ref.id).collection("baseline_snapshot").document("profile").set(baseline or {}, merge=True)
    return {"id": ref.id, "audit_id": ref.id}

class AssignmentPatch(BaseModel):
    updates: dict

@router.patch("/assignments/{assignment_id}")
async def patch_assignment(assignment_id: str, body: AssignmentPatch, authorization: str = Header(default=None, alias="Authorization", description="Primary: Authorization: Bearer <ID_TOKEN>"), idToken: str = Header(default=None)):
    token = _extract_token(authorization, idToken)
    admin_uid = verify_admin(token)
    db = firestore.client()
    ref = db.collection("assignments").document(assignment_id)
    snap = ref.get()
    if not snap.exists:
        raise HTTPException(status_code=404, detail="Assignment not found")
    updates = dict(body.updates or {})
    cur = snap.to_dict() or {}
    group_label = updates.get("occupancy_group")
    subdivision_label = updates.get("subdivision")
    if group_label is not None:
        updates["group"] = _group_code_from_label(group_label)
        updates["occupancy_group_label"] = group_label
        # remove legacy key if present in patch
        updates.pop("occupancy_group", None)
    if subdivision_label is not None:
        updates["subdivision_id"] = _subdivision_id_from_label(subdivision_label)
        updates["subdivision_label"] = subdivision_label
        # remove legacy key if present in patch
        updates.pop("subdivision", None)
    # Prevent removal/corruption of canonical fields
    if "group" in updates and not updates.get("group"):
        raise HTTPException(status_code=400, detail="Canonical group cannot be empty")
    if "subdivision_id" in updates and not updates.get("subdivision_id"):
        raise HTTPException(status_code=400, detail="Canonical subdivision_id cannot be empty")
    # If neither provided, preserve existing labels and canonical fields
    if group_label is None and "group" not in updates:
        if "group" not in cur or "occupancy_group_label" not in cur:
            raise HTTPException(status_code=400, detail="Missing canonical group/label in existing document")
    if subdivision_label is None and "subdivision_id" not in updates:
        if "subdivision_id" not in cur or "subdivision_label" not in cur:
            raise HTTPException(status_code=400, detail="Missing canonical subdivision/label in existing document")
    next_org = updates.get("org_id", cur.get("org_id"))
    next_block = updates.get("block_id", cur.get("block_id"))
    next_group = updates.get("group", cur.get("group"))
    next_sub = updates.get("subdivision_id", cur.get("subdivision_id"))
    if next_org and next_block and next_group and next_sub:
        dup_q = db.collection("assignments")\
            .where("org_id", "==", next_org)\
            .where("block_id", "==", next_block)\
            .where("group", "==", next_group)\
            .where("subdivision_id", "==", next_sub)\
            .where("is_active", "==", True)
        dup_ids = [doc.id for doc in dup_q.stream() if doc.id != assignment_id]
        if dup_ids:
            raise HTTPException(status_code=409, detail={"error": "DUPLICATE_SCOPE", "assignment_ids": dup_ids})
    updates["updated_by"] = admin_uid
    updates["updated_at"] = firestore.SERVER_TIMESTAMP
    ref.set(updates, merge=True)
    return {"status": "updated", "id": assignment_id}

@router.get("/assignments")
async def list_assignments(authorization: str = Header(default=None, alias="Authorization", description="Primary: Authorization: Bearer <ID_TOKEN>"), idToken: str = Header(default=None)) -> List[dict]:
    token = _extract_token(authorization, idToken)
    user = verify_user(token)
    db = firestore.client()
    q = db.collection("assignments").where("is_active", "==", True)
    if user.get("role") == "CUSTOMER" and user.get("org_id"):
        q = q.where("org_id", "==", user["org_id"])
    if user.get("role") == "AUDITOR":
        q = q.where("auditor_id", "==", user["uid"])
    items = []
    missing = []
    missing_per_doc = {}
    for doc in q.stream():
        d = doc.to_dict()
        g = d.get("group") or ""
        sid = d.get("subdivision_id") or ""
        occ_label = d.get("occupancy_group_label") or d.get("occupancy_group") or ""
        sub_label = d.get("subdivision_label") or d.get("subdivision") or ""
        if not g or not sid:
            missing.append(doc.id)
            missing_fields = []
            if not g:
                missing_fields.append("group")
            if not sid:
                missing_fields.append("subdivision_id")
            missing_per_doc[doc.id] = missing_fields
        items.append({
            "id": doc.id,
            # --- V1 FREEZE: Expose audit_id for downstream flows; equals assignment id ---
            "audit_id": doc.id,
            "org_id": d.get("org_id"),
            "org_name": d.get("org_name"),
            "block_id": d.get("block_id"),
            "block_name": d.get("block_name"),
            "occupancy_group": occ_label,
            "subdivision": sub_label,
            "auditor_id": d.get("auditor_id"),
            "auditor_name": d.get("auditor_name"),
            "group": g,
            "subdivision_id": sid,
        })
    if missing:
        raise HTTPException(
            status_code=400,
            detail={
                "error": "INVALID_ASSIGNMENT",
                "missing_fields": ["group", "subdivision_id"],
                "assignment_ids": missing,
                "details": missing_per_doc
            }
        )
    return items

@router.get("/assignments/by-user")
async def list_assignments_by_user(authorization: str = Header(default=None, alias="Authorization", description="Primary: Authorization: Bearer <ID_TOKEN>"), idToken: str = Header(default=None)) -> List[dict]:
    return await list_assignments(authorization, idToken)

 

@router.delete("/assignments/{assignment_id}")
async def delete_assignment(assignment_id: str, authorization: str = Header(default=None, alias="Authorization", description="Primary: Authorization: Bearer <ID_TOKEN>"), idToken: str = Header(default=None)):
    token = _extract_token(authorization, idToken)
    verify_admin(token)
    db = firestore.client()
    ref = db.collection("assignments").document(assignment_id)
    snap = ref.get()
    if not snap.exists:
        raise HTTPException(status_code=404, detail="Assignment not found")
    ref.update({"is_active": False})
    return {"status": "deleted", "id": assignment_id}
