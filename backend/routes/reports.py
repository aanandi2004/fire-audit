from fastapi import APIRouter, HTTPException, Header
from firebase_admin import auth, firestore
from backend.reports.report_service import generate_report

router = APIRouter()

def verify_admin(id_token: str):
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

def _extract_token(authorization: str, id_token: str) -> str:
  if authorization and isinstance(authorization, str) and authorization.lower().startswith("bearer "):
    return authorization.split(" ", 1)[1].strip()
  if id_token:
    return id_token
  raise HTTPException(status_code=401, detail="Missing Authorization or idToken")

@router.post("/reports/generate/{audit_id}")
async def generate(audit_id: str, authorization: str = Header(default=None, alias="Authorization", description="Primary: Authorization: Bearer <ID_TOKEN>"), idToken: str = Header(default=None)):
  token = _extract_token(authorization, idToken)
  verify_admin(token)
  res = generate_report(audit_id)
  if "error" in res:
    if res["error"] == "not_found":
      raise HTTPException(status_code=404, detail="Audit not found")
    if res["error"] == "not_completed":
      raise HTTPException(status_code=409, detail="Audit not completed")
    raise HTTPException(status_code=400, detail=res["error"])
  return res
