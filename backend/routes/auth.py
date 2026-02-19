from fastapi import APIRouter, HTTPException, Header
from firebase_admin import auth, firestore
from datetime import datetime
import json
import urllib.request
from pydantic import BaseModel, Field
from typing import Optional

router = APIRouter()

def _extract_token(authorization: str, id_token: str) -> str:
    if authorization and isinstance(authorization, str) and authorization.lower().startswith("bearer "):
        return authorization.split(" ", 1)[1].strip()
    if id_token:
        return id_token
    raise HTTPException(status_code=401, detail="Missing Authorization or idToken")

def verify_firebase_user(id_token: str) -> dict:
    if not id_token:
        raise HTTPException(status_code=401, detail="Missing idToken")
    try:
        decoded = auth.verify_id_token(id_token)
    except Exception:
        # Fallback: verify via Firebase Identity Toolkit if Admin credentials are unavailable
        API_KEY = "AIzaSyD-Y1iEywNJ9z1fZCftXUjpxrA1XXj8fsk"
        try:
            url = f"https://identitytoolkit.googleapis.com/v1/accounts:lookup?key={API_KEY}"
            payload = json.dumps({"idToken": id_token}).encode("utf-8")
            req = urllib.request.Request(url, data=payload, headers={"Content-Type": "application/json"}, method="POST")
            with urllib.request.urlopen(req, timeout=10) as resp:
                text = resp.read().decode("utf-8")
                obj = json.loads(text)
                users = obj.get("users") or []
                if not users:
                    raise HTTPException(status_code=401, detail="Invalid idToken")
                u = users[0]
                uid = u.get("localId")
                email = u.get("email")
                if not uid:
                    raise HTTPException(status_code=401, detail="Invalid idToken")
                return {"uid": uid, "email": email}
        except HTTPException:
            raise
        except Exception:
            raise HTTPException(status_code=401, detail="Invalid idToken")
    try:
        print("Firebase project:", auth.verify_id_token(id_token)["iss"])
    except Exception:
        pass
    uid = decoded.get("uid")
    email = decoded.get("email")
    if not uid:
        raise HTTPException(status_code=401, detail="Invalid token payload")
    return {"uid": uid, "email": email}

@router.get("/auth/session")
async def get_session(authorization: str = Header(default=None, alias="Authorization", description="Primary: Authorization: Bearer <ID_TOKEN>"), idToken: str = Header(default=None)):
    token = _extract_token(authorization, idToken)
    user = verify_firebase_user(token)
    uid = user["uid"]

    doc = firestore.client().collection("users").document(uid).get()
    if not doc.exists:
        raise HTTPException(status_code=403, detail="User not registered")

    data = doc.to_dict()
    # Safe mode: only block disabled accounts
    if data.get("is_disabled") is True:
        raise HTTPException(status_code=403, detail="User disabled")

    role = data.get("role")
    if role is None:
        raise HTTPException(status_code=403, detail="Role missing")

    org_id = data.get("org_id")

    return {
        "uid": uid,
        "email": user.get("email"),
        "role": role,
        "org_id": org_id,
        "permissions": data.get("permissions", [])
    }

@router.post("/users/self-upsert")
async def self_upsert_user(authorization: str = Header(default=None, alias="Authorization", description="Primary: Authorization: Bearer <ID_TOKEN>"), idToken: str = Header(default=None)):
    token = _extract_token(authorization, idToken)
    user = verify_firebase_user(token)
    uid = user["uid"]
    email = user.get("email")
    db = firestore.client()
    doc = db.collection("users").document(uid).get()
    if doc.exists:
        data = doc.to_dict() or {}
        if not data.get("role"):
            db.collection("users").document(uid).set({"role": "AUDITOR"}, merge=True)
        return {"status": "exists", "uid": uid}
    db.collection("users").document(uid).set({
        "email": email,
        "role": "AUDITOR",
        "is_active": True,
        "org_id": None,
        "created_at": firestore.SERVER_TIMESTAMP
    }, merge=True)
    return {"status": "created", "uid": uid}

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

def _now_iso() -> str:
    try:
        return datetime.utcnow().isoformat()
    except Exception:
        return ""

def _generate_password_reset_link(email: str) -> str:
    # Use Firebase Identity Toolkit REST API to generate a password reset link
    # This requires the project's Web API Key. Public key is safe to use server-side.
    API_KEY = "AIzaSyD-Y1iEywNJ9z1fZCftXUjpxrA1XXj8fsk"
    url = f"https://identitytoolkit.googleapis.com/v1/accounts:sendOobCode?key={API_KEY}"
    payload = {
        "requestType": "PASSWORD_RESET",
        "email": email,
        "returnOobLink": True
    }
    data = json.dumps(payload).encode("utf-8")
    req = urllib.request.Request(url, data=data, headers={"Content-Type": "application/json"}, method="POST")
    try:
        with urllib.request.urlopen(req, timeout=10) as resp:
            text = resp.read().decode("utf-8")
            obj = json.loads(text)
            link = obj.get("oobLink") or obj.get("resetLink") or ""
            return link
    except Exception:
        return ""

@router.post("/api/admin/users/{uid}/reset-password")
async def admin_reset_password(uid: str, authorization: str = Header(default=None, alias="Authorization", description="Primary: Authorization: Bearer <ID_TOKEN>"), idToken: str = Header(default=None)):
    token = _extract_token(authorization, idToken)
    admin_uid = verify_admin(token)
    try:
        user_record = auth.get_user(uid)
        email = user_record.email
        if not email:
            raise HTTPException(status_code=404, detail="User email not found")
    except Exception:
        raise HTTPException(status_code=404, detail="User not found")
    link = _generate_password_reset_link(email)
    if not link:
        raise HTTPException(status_code=500, detail="Failed to generate reset link")
    # Update last_password_reset in Firestore
    try:
        firestore.client().collection("users").document(uid).set({
            "last_password_reset": _now_iso()
        }, merge=True)
    except Exception:
        # Non-blocking
        pass
    return {"reset_link": link, "email": email, "requested_by": admin_uid}

class AuditorCreate(BaseModel):
    name: str = Field(min_length=1)
    email: str = Field(min_length=1)
    username: Optional[str] = None
    password: Optional[str] = None
    org_id: Optional[str] = None

@router.post("/api/admin/auditors")
async def create_auditor(body: AuditorCreate, authorization: str = Header(default=None, alias="Authorization", description="Primary: Authorization: Bearer <ID_TOKEN>"), idToken: str = Header(default=None)):
    token = _extract_token(authorization, idToken)
    admin_uid = verify_admin(token)
    name = body.name
    email = body.email
    username = (body.username or "").strip() or None
    password = (body.password or "").strip() or None
    org_id = body.org_id or None
    if not name or not email:
        raise HTTPException(status_code=400, detail="Invalid input")
    try:
        existing = auth.get_user_by_email(email)
        raise HTTPException(status_code=409, detail="auth/email-already-in-use")
    except Exception:
        pass
    try:
        if password:
            user_record = auth.create_user(email=email, password=password, display_name=username or name)
        else:
            # Create with temporary random password; admin can reset later
            tmp_password = "Tmp" + str(int(datetime.utcnow().timestamp())) + "Pwd"
            user_record = auth.create_user(email=email, password=tmp_password, display_name=username or name)
        uid = user_record.uid
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to create user: {str(e)}")
    try:
        firestore.client().collection("users").document(uid).set({
            "email": email,
            "role": "AUDITOR",
            "is_active": True,
            "org_id": None,
            "created_at": firestore.SERVER_TIMESTAMP
        }, merge=True)
    except Exception:
        # If Firestore write fails, attempt cleanup
        try:
            auth.delete_user(uid)
        except Exception:
            pass
        raise HTTPException(status_code=500, detail="Failed to persist user profile")
    return {"uid": uid, "email": email, "username": username, "role": "AUDITOR", "org_id": org_id, "created_by": admin_uid}

class AdminUserCreate(BaseModel):
    username: str = Field(min_length=1)
    email: Optional[str] = None
    password: str = Field(min_length=8)
    role: str = Field(min_length=1)
    org_id: Optional[str] = None

@router.get("/api/admin/auditors/list")
async def list_auditors(authorization: str = Header(default=None, alias="Authorization", description="Primary: Authorization: Bearer <ID_TOKEN>"), idToken: str = Header(default=None)):
    token = _extract_token(authorization, idToken)
    verify_admin(token)
    db = firestore.client()
    items = []
    q = db.collection("users").where("role", "==", "AUDITOR").where("is_active", "==", True)
    for doc in q.stream():
        d = doc.to_dict() or {}
        display_name = None
        try:
            user_rec = auth.get_user(doc.id)
            display_name = getattr(user_rec, "display_name", None)
        except Exception:
            display_name = None
        derived_name = (d.get("username") or display_name or (d.get("email") or "").split("@")[0].replace(".", " ").replace("_", " ").title())
        items.append({
            "id": doc.id,
            "email": d.get("email"),
            "username": d.get("username") or display_name or d.get("email"),
            "name": derived_name,
            "org_id": d.get("org_id"),
            "is_active": bool(d.get("is_active", True))
        })
    return items

@router.post("/api/admin/users")
async def admin_create_user(body: AdminUserCreate, authorization: str = Header(default=None, alias="Authorization", description="Primary: Authorization: Bearer <ID_TOKEN>"), idToken: str = Header(default=None)):
    token = _extract_token(authorization, idToken)
    admin_uid = verify_admin(token)
    username = body.username.strip()
    email = (body.email or "").strip() or f"{username}@fireaudit.com"
    password = body.password
    role = body.role.upper()
    org_id = body.org_id or None
    if not username or not password or role not in ("ADMIN", "AUDITOR", "CUSTOMER"):
        raise HTTPException(status_code=400, detail="Invalid input")
    try:
        existing = auth.get_user_by_email(email)
        raise HTTPException(status_code=409, detail="auth/email-already-in-use")
    except Exception:
        pass
    try:
        user_record = auth.create_user(email=email, password=password, display_name=username)
        uid = user_record.uid
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to create user: {str(e)}")
    try:
        firestore.client().collection("users").document(uid).set({
            "email": email,
            "role": role,
            "org_id": org_id,
            "is_active": True,
            "created_at": firestore.SERVER_TIMESTAMP,
            "username": username
        }, merge=True)
    except Exception:
        try:
            auth.delete_user(uid)
        except Exception:
            pass
        raise HTTPException(status_code=500, detail="Failed to persist user profile")
    return {"uid": uid, "email": email, "username": username, "role": role, "org_id": org_id, "created_by": admin_uid}

@router.delete("/api/admin/users/{uid}")
async def admin_delete_user(uid: str, authorization: str = Header(default=None, alias="Authorization", description="Primary: Authorization: Bearer <ID_TOKEN>"), idToken: str = Header(default=None)):
    token = _extract_token(authorization, idToken)
    admin_uid = verify_admin(token)
    db = firestore.client()
    user_doc = db.collection("users").document(uid).get()
    role = None
    org_id = None
    if user_doc.exists:
        data = user_doc.to_dict() or {}
        role = (data.get("role") or "").upper()
        org_id = data.get("org_id") or None
    try:
        auth.delete_user(uid)
    except Exception:
        raise HTTPException(status_code=404, detail="User not found or already deleted")
    try:
        if role == "AUDITOR":
            q = db.collection("assignments").where("auditor_id", "==", uid)
            for doc in q.stream():
                doc.reference.update({"is_active": False})
            ql = db.collection("attendance_logs").where("auditor_id", "==", uid)
            for ldoc in ql.stream():
                ldoc.reference.delete()
        elif role == "CUSTOMER" and org_id:
            q = db.collection("assignments").where("org_id", "==", org_id)
            for doc in q.stream():
                doc.reference.update({"is_active": False})
            ql = db.collection("attendance_logs").where("org_id", "==", org_id)
            for ldoc in ql.stream():
                ldoc.reference.delete()
    except Exception:
        pass
    try:
        db.collection("users").document(uid).delete()
    except Exception:
        pass
    return {"status": "deleted", "deleted_by": admin_uid, "uid": uid}

@router.get("/api/admin/stats")
async def admin_stats(authorization: str = Header(default=None, alias="Authorization", description="Primary: Authorization: Bearer <ID_TOKEN>"), idToken: str = Header(default=None)):
    token = _extract_token(authorization, idToken)
    verify_admin(token)
    db = firestore.client()
    org_count = 0
    auditor_count = 0
    try:
        oq = db.collection("organizations").where("status", "==", "Active")
        org_count = sum(1 for _ in oq.stream())
        if org_count == 0:
            org_count = sum(1 for _ in db.collection("organizations").stream())
    except Exception:
        org_count = 0
    try:
        aq = db.collection("users").where("role", "==", "AUDITOR").where("is_active", "==", True)
        auditor_count = sum(1 for _ in aq.stream())
    except Exception:
        auditor_count = 0
    total_customers = org_count + auditor_count
    return {
        "totalOrganizations": org_count,
        "totalAuditors": auditor_count,
        "totalCustomers": total_customers,
        "totalAudits": 0,
        "auditsCompleted": 0,
        "auditsPending": 0
    }
