from fastapi import HTTPException
from firebase_admin import firestore
from datetime import datetime, timedelta

def assert_audit_editable(audit: dict):
    if audit.get("status") == "COMPLETED":
        raise HTTPException(status_code=403, detail="Audit is locked and immutable")

def get_audit(audit_id: str) -> dict:
    db = firestore.client()
    snap = db.collection("audits").document(audit_id).get()
    return snap.to_dict() if snap.exists else {}

def check_audit_active(audit_id: str):
    audit = get_audit(audit_id)
    if audit.get("status") == "COMPLETED":
        raise HTTPException(status_code=403, detail="Audit is locked and immutable")

def assert_auditor_holds_lock(audit_id: str, uid: str):
    audit = get_audit(audit_id)
    locked_by = audit.get("locked_by")
    locked_at = audit.get("locked_at")
    if not locked_by or locked_by != uid:
        raise HTTPException(status_code=403, detail="Audit lock not held by user")
    if locked_at:
        try:
            if isinstance(locked_at, datetime) and datetime.utcnow() - locked_at > timedelta(minutes=30):
                raise HTTPException(status_code=403, detail="Audit lock expired")
        except Exception:
            pass
