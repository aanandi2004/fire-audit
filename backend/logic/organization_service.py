from firebase_admin import auth, firestore
from datetime import datetime
from typing import Dict, List, Set

def _now_iso():
    return datetime.utcnow().isoformat()

def create_org_and_link_user(admin_uid: str, payload: dict) -> dict:
    db = firestore.client()
    org_name = payload.get("org_name") or payload.get("name")
    org_type = payload.get("org_type") or payload.get("type")
    subdivision = payload.get("subdivision") or payload.get("assigned_subcategories") or []
    address = payload.get("address") or ""
    block_count = int(payload.get("block_count") or 1)
    block_names = payload.get("block_names") or [f"Block {i+1}" for i in range(block_count)]
    status = payload.get("status") or "Active"
    identity_email = payload.get("user_email") or ""

    user_email = payload.get("user_email")
    user_password = payload.get("user_password")
    user_role = "CUSTOMER"

    if not org_name or not user_email or not user_password:
        return {"error": "invalid_input"}

    try:
        existing_user = auth.get_user_by_email(user_email)
        # duplicate email: do not proceed
        return {"error": "email_exists"}
    except Exception:
        existing_user = None
        user_uid = None
        user_created = True
        user = auth.create_user(email=user_email, password=user_password, display_name=org_name)
        user_uid = user.uid

    org_id = payload.get("org_id") or f"org_{int(datetime.utcnow().timestamp())}"
    org_ref = db.collection("organizations").document(org_id)
    org_ref.set({
        "id": org_id,
        "name": org_name,
        "type": org_type,
        "subdivision": subdivision if isinstance(subdivision, list) else [subdivision],
        "address": address,
        "blockCount": block_count,
        "blockNames": block_names,
        "status": status,
        "createdOn": _now_iso(),
        "model": {
            "org_id": org_id,
            "org_name": org_name,
            "org_type": org_type,
            "status": "ACTIVE" if status == "Active" else "INACTIVE",
            "org_profile": {
                "identity": { "address": address, "email": identity_email, "phone": "", "website": "" },
                "establishment": { "ownership_type": "", "total_manpower": 0, "total_departments": 0, "total_blocks": block_count, "total_area": "", "built_up_area": "" },
                "contacts": { "plant_head": "", "fire_audit_contact": "" }
            },
            "assigned_structure": [],
            "assigned_auditors": [],
            "freeze_structure": True,
            "created_at": _now_iso()
        }
    }, merge=True)

    user_ref = db.collection("users").document(user_uid)
    user_ref.set({
        "uid": user_uid,
        "email": user_email,
        "role": user_role,
        "org_id": org_id,
        "created_at": firestore.SERVER_TIMESTAMP,
        "is_disabled": False,
        "is_active": True
    }, merge=True)

    return {
        "organization": {
            "id": org_id,
            "name": org_name,
            "type": org_type,
            "subdivision": subdivision if isinstance(subdivision, list) else [subdivision],
            "address": address,
            "blockCount": block_count,
            "blockNames": block_names,
            "status": status,
            "createdOn": _now_iso()
        },
        "user": {
            "uid": user_uid,
            "email": user_email,
            "role": user_role,
            "org_id": org_id,
            "created": user_created
        }
    }

def delete_organization_cascade(org_id: str) -> dict:
    db = firestore.client()
    org_ref = db.collection("organizations").document(org_id)
    snap = org_ref.get()
    if not snap.exists:
        raise ValueError("Organization not found")
    deleted: Dict[str, int] = {
        "assignments": 0,
        "audit_responses": 0,
        "attendance_logs": 0,
        "reports": 0,
        "org_subdocs": 0,
        "users_firestore": 0,
        "users_auth": 0,
    }
    assignment_ids: List[str] = []
    try:
        for doc in db.collection("assignments").where("org_id", "==", org_id).stream():
            assignment_ids.append(doc.id)
            db.collection("assignments").document(doc.id).delete()
            deleted["assignments"] += 1
    except Exception:
        raise ValueError("Failed to delete assignments")
    try:
        for aid in assignment_ids:
            for rdoc in db.collection("audit_responses").where("assignment_id", "==", aid).stream():
                db.collection("audit_responses").document(rdoc.id).delete()
                deleted["audit_responses"] += 1
    except Exception:
        raise ValueError("Failed to delete audit responses")
    try:
        seen: Set[str] = set()
        for aid in assignment_ids:
            for ldoc in db.collection("attendance_logs").where("assignment_id", "==", aid).stream():
                if ldoc.id not in seen:
                    db.collection("attendance_logs").document(ldoc.id).delete()
                    seen.add(ldoc.id)
                    deleted["attendance_logs"] += 1
        for ldoc in db.collection("attendance_logs").where("org_id", "==", org_id).stream():
            if ldoc.id not in seen:
                db.collection("attendance_logs").document(ldoc.id).delete()
                seen.add(ldoc.id)
                deleted["attendance_logs"] += 1
    except Exception:
        raise ValueError("Failed to delete attendance logs")
    try:
        for doc in db.collection("reports").where("org_id", "==", org_id).stream():
            db.collection("reports").document(doc.id).delete()
            deleted["reports"] += 1
    except Exception:
        raise ValueError("Failed to delete reports")
    try:
        sa_doc = db.collection("self_assessments").document(org_id)
        for col in sa_doc.collections():
            for doc in col.stream():
                col.document(doc.id).delete()
                deleted["org_subdocs"] += 1
        sa_doc.delete()
    except Exception:
        pass
    try:
        for col in org_ref.collections():
            for doc in col.stream():
                col.document(doc.id).delete()
                deleted["org_subdocs"] += 1
    except Exception:
        pass
    try:
        org_ref.delete()
    except Exception:
        raise ValueError("Failed to delete organization document")
    try:
        users = list(db.collection("users").where("org_id", "==", org_id).stream())
        for u in users:
            uid = u.id
            db.collection("users").document(uid).delete()
            deleted["users_firestore"] += 1
            try:
                auth.delete_user(uid)
                deleted["users_auth"] += 1
            except Exception:
                pass
    except Exception:
        raise ValueError("Failed to delete linked users")
    return {"status": "deleted", "org_id": org_id, "deleted": deleted}
