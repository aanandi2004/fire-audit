from fastapi import APIRouter, HTTPException, Header
from pydantic import BaseModel, Field
from firebase_admin import auth, firestore
from typing import List, Optional, Union, Any
from backend.logic.organization_service import create_org_and_link_user, delete_organization_cascade
from firebase_admin import auth as admin_auth

router = APIRouter()

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

@router.get("/api/organizations")
async def list_organizations(authorization: str = Header(default=None, alias="Authorization", description="Primary: Authorization: Bearer <ID_TOKEN>"), idToken: str = Header(default=None)) -> list:
    token = _extract_token(authorization, idToken)
    user = verify_user(token)
    db = firestore.client()
    res = []
    if user.get("role") == "ADMIN":
        for doc in db.collection("organizations").stream():
            d = doc.to_dict()
            cust_email = "-"
            cust_role = "-"
            try:
                uq = db.collection("users").where("org_id", "==", doc.id).where("role", "==", "CUSTOMER").where("is_active", "==", True)
                for udoc in uq.stream():
                    ud = udoc.to_dict() or {}
                    cust_email = ud.get("email") or ud.get("username") or "-"
                    cust_role = "CUSTOMER"
                    break
            except Exception:
                cust_email = "-"
                cust_role = "-"
            if cust_email == "-":
                print(f"[organizations] warning: no active customer linked to org {doc.id}")
            res.append({
                "id": doc.id,
                **d,
                "customer_email": cust_email,
                "customer_role": cust_role
            })
        return res
    if user.get("role") == "CUSTOMER" and user.get("org_id"):
        snap = db.collection("organizations").document(user["org_id"]).get()
        if snap.exists:
            d = snap.to_dict()
            return [{"id": snap.id, **d}]
        raise HTTPException(status_code=404, detail="Organization not found")
    if user.get("role") == "AUDITOR":
        org_ids = set()
        q = db.collection("assignments").where("auditor_id", "==", user["uid"]).where("is_active", "==", True)
        for doc in q.stream():
            d = doc.to_dict()
            oid = d.get("org_id")
            if oid:
                org_ids.add(oid)
        for oid in org_ids:
            s = db.collection("organizations").document(oid).get()
            if s.exists:
                res.append({"id": oid, **s.to_dict()})
        return res
    return []

@router.get("/api/admin/organizations")
async def admin_list_organizations(authorization: str = Header(default=None, alias="Authorization", description="Primary: Authorization: Bearer <ID_TOKEN>"), idToken: str = Header(default=None)) -> list:
    token = _extract_token(authorization, idToken)
    admin_uid = verify_admin(token)
    db = firestore.client()
    res = []
    for doc in db.collection("organizations").stream():
        d = doc.to_dict()
        cust_email = ""
        cust_role = ""
        try:
            uq = db.collection("users").where("org_id", "==", doc.id).where("role", "==", "CUSTOMER")
            for udoc in uq.stream():
                ud = udoc.to_dict() or {}
                if ud.get("is_disabled") is True:
                    continue
                cust_email = (ud.get("email") or ud.get("username") or "")
                cust_role = "CUSTOMER"
                break
        except Exception:
            cust_email = ""
            cust_role = ""
        if cust_email == "":
            print(f"[organizations] warning: no active customer linked to org {doc.id}")
        res.append({
            "id": doc.id,
            **d,
            "customer_email": cust_email,
            "customer_role": cust_role
        })
    return res
    if user.get("role") == "CUSTOMER" and user.get("org_id"):
        snap = db.collection("organizations").document(user["org_id"]).get()
        if snap.exists:
            d = snap.to_dict()
            return [{"id": snap.id, **d}]
        raise HTTPException(status_code=404, detail="Organization not found")
    if user.get("role") == "AUDITOR":
        org_ids = set()
        q = db.collection("assignments").where("auditor_id", "==", user["uid"]).where("is_active", "==", True)
        for doc in q.stream():
            d = doc.to_dict()
            oid = d.get("org_id")
            if oid:
                org_ids.add(oid)
        for oid in org_ids:
            s = db.collection("organizations").document(oid).get()
            if s.exists:
                res.append({"id": oid, **s.to_dict()})
        return res
    return []

class OrganizationCreateRequest(BaseModel):
    org_name: str = Field(min_length=1)
    org_type: str = Field(min_length=1)
    subdivision: List[str] = []
    address: str = ""
    block_count: int = 1
    block_names: Optional[List[str]] = None
    status: str = "Active"
    user_email: str = Field(min_length=1)
    user_password: str = Field(min_length=8)

@router.post("/api/organizations")
async def create_organization(req: OrganizationCreateRequest, authorization: str = Header(default=None, alias="Authorization", description="Primary: Authorization: Bearer <ID_TOKEN>"), idToken: str = Header(default=None)):
    token = _extract_token(authorization, idToken)
    admin_uid = verify_admin(token)
    payload = req.model_dump()
    res = create_org_and_link_user(admin_uid, payload)
    if "error" in res:
        if res["error"] == "invalid_input":
            raise HTTPException(status_code=400, detail="Invalid input")
        if res["error"] == "email_exists":
            raise HTTPException(status_code=409, detail="auth/email-already-in-use")
        raise HTTPException(status_code=500, detail=res["error"])
    db = firestore.client()
    org_id = res["organization"]["id"]
    org_ref = db.collection("organizations").document(org_id)
    # Skeleton fields with merge
    org_ref.set({
        "identity_data": {},
        "establishment_data": {},
        "infrastructure": {},
        "construction": {},
        "self_assessment": {},
        "created_at": firestore.SERVER_TIMESTAMP,
        "created_by": admin_uid,
    }, merge=True)
    # Link admin user to org
    db.collection("users").document(admin_uid).set({"org_id": org_id}, merge=True)
    print(f"[organizations] created org {org_id} by {admin_uid}")
    return {"org_id": org_id, "status": "created"}

class AutoSavePayload(BaseModel):
    section: str = Field(min_length=1)
    field: str = Field(min_length=1)
    value: Optional[Union[dict, str, int, float, bool, None]] = None

@router.patch("/api/organizations/{org_id}/self-assessment/save")
async def autosave_self_assessment(org_id: str, body: AutoSavePayload, authorization: str = Header(default=None, alias="Authorization", description="Primary: Authorization: Bearer <ID_TOKEN>"), idToken: str = Header(default=None)):
    token = _extract_token(authorization, idToken)
    user = verify_user(token)
    if user.get("org_id") != org_id and user.get("role") != "ADMIN":
        raise HTTPException(status_code=403, detail="Organization mismatch")
    db = firestore.client()
    org_ref = db.collection("organizations").document(org_id)
    if not org_ref.get().exists:
        raise HTTPException(status_code=404, detail="Organization not found")
    # Merge nested section.field under self_assessment
    org_ref.set({
        "self_assessment": {
            body.section: {
                body.field: body.value
            }
        }
    }, merge=True)
    print(f"[autosave] org={org_id} {body.section}.{body.field} saved")
    return {"status": "ok"}

@router.get("/api/organizations/{org_id}")
async def get_organization(org_id: str, authorization: str = Header(default=None, alias="Authorization", description="Primary: Authorization: Bearer <ID_TOKEN>"), idToken: str = Header(default=None)):
    token = _extract_token(authorization, idToken)
    user = verify_user(token)
    if user.get("org_id") != org_id and user.get("role") != "ADMIN":
        raise HTTPException(status_code=403, detail="Organization mismatch")
    db = firestore.client()
    snap = db.collection("organizations").document(org_id).get()
    if not snap.exists:
        raise HTTPException(status_code=404, detail="Organization not found")
    return snap.to_dict()

class OrganizationPatch(BaseModel):
    updates: dict = Field(default_factory=dict)

@router.patch("/api/organizations/{org_id}")
async def patch_organization(org_id: str, body: OrganizationPatch, authorization: str = Header(default=None, alias="Authorization", description="Primary: Authorization: Bearer <ID_TOKEN>"), idToken: str = Header(default=None)):
    token = _extract_token(authorization, idToken)
    admin_uid = verify_admin(token)
    db = firestore.client()
    org_ref = db.collection("organizations").document(org_id)
    if not org_ref.get().exists:
        raise HTTPException(status_code=404, detail="Organization not found")
    org_ref.set(body.updates or {}, merge=True)
    print(f"[organizations] patched org {org_id} by {admin_uid}")
    return {"status": "updated"}

@router.delete("/api/organizations/{org_id}")
async def delete_organization(org_id: str, authorization: str = Header(default=None, alias="Authorization", description="Primary: Authorization: Bearer <ID_TOKEN>"), idToken: str = Header(default=None)):
    token = _extract_token(authorization, idToken)
    verify_admin(token)
    try:
        res = delete_organization_cascade(org_id)
        return res
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception:
        raise HTTPException(status_code=500, detail="Deletion failed")
