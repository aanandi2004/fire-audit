from fastapi import FastAPI, Response, HTTPException, Header
from fastapi.middleware.cors import CORSMiddleware
import os
import firebase_admin
from firebase_admin import credentials, auth, firestore
from pydantic import BaseModel
from typing import Optional, List, Union
from datetime import datetime
from backend.logic.calculator import process_audit
from backend.routes.reports import router as reports_router
from backend.logic.charts import generate_section_chart
from backend.pdf.renderer import render_pdf
from backend.routes.auth import router as auth_router
from backend.routes.pdf_routes import router as pdf_router
from backend.routes.organizations import router as organizations_router
from backend.routes.assignments import router as assignments_router
from backend.routes.audit_responses import router as responses_router
from backend.routes.audit_lifecycle import router as lifecycle_router
from backend.routes.observations import router as observations_router

app = FastAPI()

# Enable CORS for React communication
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:5174", "http://localhost:5175", "http://127.0.0.1:5173", "http://127.0.0.1:5174", "http://127.0.0.1:5175"],
    allow_origin_regex=r"https?://(localhost|127\.0\.0\.1)(:\d+)?",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

if not firebase_admin._apps:
    BASE_DIR = os.path.dirname(os.path.abspath(__file__))
    cred_path = os.path.join(BASE_DIR, "service-account.json")
    if not os.path.exists(cred_path):
        raise RuntimeError("Missing service account credentials")
    cred = credentials.Certificate(cred_path)
    firebase_admin.initialize_app(cred)
db = firestore.client()


app.include_router(reports_router)
app.include_router(auth_router)
app.include_router(pdf_router)
app.include_router(organizations_router)
app.include_router(assignments_router)
app.include_router(responses_router)
app.include_router(lifecycle_router)
app.include_router(observations_router)
@app.get("/")
def read_root():
    return {"status": "Backend is Live"}

# --- RBAC helpers ---
def _extract_token(authorization: Optional[str], id_token: Optional[str]) -> str:
    if authorization and isinstance(authorization, str) and authorization.lower().startswith("bearer "):
        return authorization.split(" ", 1)[1].strip()
    if id_token:
        return id_token
    raise HTTPException(status_code=401, detail="Missing Authorization or idToken")

def verify_token(id_token: Optional[str]):
    if not id_token:
        raise HTTPException(status_code=401, detail="Missing Authorization or idToken")
    try:
        decoded = auth.verify_id_token(id_token)
        uid = decoded.get("uid")
    except Exception:
        raise HTTPException(status_code=401, detail="Invalid idToken")
    user_doc = db.collection("users").document(uid).get()
    if not user_doc.exists:
        raise HTTPException(status_code=403, detail="User not registered")
    role = user_doc.to_dict().get("role")
    return uid, role

# --- Contracts ---
class IdentityData(BaseModel):
    name: str
    address: str
    email: str
    phone: str

class EstablishmentData(BaseModel):
    year_of_est: int
    building_type: str
    manpower: int
    built_up_area: float

class InfrastructureData(BaseModel):
    landmark: str
    road_width_m: float
    nearest_fire_station_km: float
    nearest_hospital_km: float

class ConstructionData(BaseModel):
    structure_type: str
    height_m: float
    floors: int
    basement_count: int

class OrganizationContract(BaseModel):
    identity_data: IdentityData
    establishment_data: EstablishmentData
    infrastructure: InfrastructureData
    construction: ConstructionData
    admin_ref: str
    created_at: datetime
    is_active: bool = True

class UserContract(BaseModel):
    uid: str
    email: str
    role: str
    org_id: Optional[str] = None
    created_at: datetime
    is_disabled: bool = False

class SectionAnswer(BaseModel):
    answer: Union[str, float, bool, None] = None
    observation: Optional[str] = None
    evidence_urls: List[str] = []

class AuditCreateContract(BaseModel):
    org_id: str
    auditor_id: str
    status: str = "IN_PROGRESS"
    started_at: datetime

class AuditUpdateContract(BaseModel):
    section_id: str
    question_id: str
    data: SectionAnswer

class ReportContract(BaseModel):
    org_id: str
    audit_id: str
    generated_by: str
    download_url: str
    version: int
    created_at: datetime

@app.delete("/delete-user/{uid}")
async def delete_user(uid: str):
    try:
        user_doc_ref = db.collection("users").document(uid)
        user_snap = user_doc_ref.get()
        role = None
        if user_snap.exists:
            role = user_snap.to_dict().get("role")

        answers_doc_id = f"{uid}_answers"
        db.collection("answers").document(answers_doc_id).delete()

        try:
            assignments_query = db.collection("assignments").where("auditorId", "==", uid).stream()
            for doc_ref in assignments_query:
                db.collection("assignments").document(doc_ref.id).delete()
        except Exception:
            pass

        if role == "Auditor":
            try:
                logs_query = db.collection("attendanceLogs").where("auditorUid", "==", uid).stream()
                for doc_ref in logs_query:
                    db.collection("attendanceLogs").document(doc_ref.id).delete()
            except Exception:
                pass

        user_doc_ref.delete()
        auth.delete_user(uid)
        return {"message": f"Successfully deleted user {uid}"}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

# --- Contracted endpoints ---
@app.post("/organizations/{org_id}")
async def create_organization(org_id: str, org: OrganizationContract, authorization: Optional[str] = Header(default=None, alias="Authorization", description="Primary: Authorization: Bearer <ID_TOKEN>"), idToken: Optional[str] = Header(default=None)):
    token = _extract_token(authorization, idToken)
    uid, role = verify_token(token)
    if role != "ADMIN":
        raise HTTPException(status_code=403, detail="Admin required")
    doc_ref = db.collection("organizations").document(org_id)
    if doc_ref.get().exists:
        raise HTTPException(status_code=409, detail="Organization already exists")
    data = org.model_dump()
    doc_ref.set(data)
    return {"id": org_id, "status": "created"}

@app.post("/users")
async def provision_user(user: UserContract, authorization: Optional[str] = Header(default=None, alias="Authorization", description="Primary: Authorization: Bearer <ID_TOKEN>"), idToken: Optional[str] = Header(default=None)):
    token = _extract_token(authorization, idToken)
    uid, role = verify_token(token)
    if role != "ADMIN":
        raise HTTPException(status_code=403, detail="Admin required")
    doc_ref = db.collection("users").document(user.uid)
    payload = user.model_dump()
    snap = doc_ref.get()
    if snap.exists:
        doc_ref.update(payload)
        return {"uid": user.uid, "status": "updated"}
    else:
        doc_ref.set(payload)
        return {"uid": user.uid, "status": "created"}

@app.post("/audits/{audit_id}")
async def create_audit(audit_id: str, payload: AuditCreateContract, authorization: Optional[str] = Header(default=None, alias="Authorization", description="Primary: Authorization: Bearer <ID_TOKEN>"), idToken: Optional[str] = Header(default=None)):
    token = _extract_token(authorization, idToken)
    uid, role = verify_token(token)
    if role != "AUDITOR" and role != "ADMIN":
        raise HTTPException(status_code=403, detail="Auditor or Admin required")
    if role == "AUDITOR" and uid != payload.auditor_id:
        raise HTTPException(status_code=403, detail="Auditor mismatch")
    doc_ref = db.collection("audits").document(audit_id)
    if doc_ref.get().exists:
        raise HTTPException(status_code=409, detail="Audit already exists")
    doc_ref.set({
        "org_id": payload.org_id,
        "auditor_id": payload.auditor_id,
        "status": payload.status,
        "sections": {},
        "started_at": firestore.SERVER_TIMESTAMP,
        "completed_at": None
    })
    return {"audit_id": audit_id, "status": "created"}

@app.patch("/audits/{audit_id}/sections")
async def update_audit_section(audit_id: str, patch: AuditUpdateContract, idToken: Optional[str] = Header(default=None)):
    raise HTTPException(status_code=410, detail="Deprecated: use audit_responses/{audit_id}/blocks/{block_id}/questions/{question_id}")

@app.post("/audits/{audit_id}/complete")
async def complete_audit(audit_id: str, authorization: Optional[str] = Header(default=None, alias="Authorization", description="Primary: Authorization: Bearer <ID_TOKEN>"), idToken: Optional[str] = Header(default=None)):
    token = _extract_token(authorization, idToken)
    uid, role = verify_token(token)
    doc_ref = db.collection("audits").document(audit_id)
    snap = doc_ref.get()
    if not snap.exists:
        raise HTTPException(status_code=404, detail="Audit not found")
    cur = snap.to_dict()
    if role != "AUDITOR" and role != "ADMIN":
        raise HTTPException(status_code=403, detail="Auditor or Admin required")
    if role == "AUDITOR" and uid != cur.get("auditor_id"):
        raise HTTPException(status_code=403, detail="Auditor mismatch")
    doc_ref.update({
        "status": "COMPLETED",
        "completed_at": firestore.SERVER_TIMESTAMP
    })
    return {"audit_id": audit_id, "status": "completed"}

@app.post("/audits/{audit_id}/ready")
async def mark_ready(audit_id: str, authorization: Optional[str] = Header(default=None, alias="Authorization", description="Primary: Authorization: Bearer <ID_TOKEN>"), idToken: Optional[str] = Header(default=None)):
    token = _extract_token(authorization, idToken)
    uid, role = verify_token(token)
    doc_ref = db.collection("audits").document(audit_id)
    snap = doc_ref.get()
    if not snap.exists:
        raise HTTPException(status_code=404, detail="Audit not found")
    cur = snap.to_dict()
    if role == "CUSTOMER":
        user_doc = db.collection("users").document(uid).get()
        org_id = user_doc.to_dict().get("org_id") if user_doc.exists else None
        if not org_id or org_id != cur.get("org_id"):
            raise HTTPException(status_code=403, detail="Organization mismatch")
    elif role != "ADMIN" and role != "AUDITOR":
        raise HTTPException(status_code=403, detail="Unauthorized")
    doc_ref.update({
        "status": "READY",
        "completed_at": firestore.SERVER_TIMESTAMP
    })
    return {"audit_id": audit_id, "status": "ready"}

@app.post("/reports/{report_id}")
async def create_report(report_id: str, payload: ReportContract, authorization: Optional[str] = Header(default=None, alias="Authorization", description="Primary: Authorization: Bearer <ID_TOKEN>"), idToken: Optional[str] = Header(default=None)):
    token = _extract_token(authorization, idToken)
    uid, role = verify_token(token)
    if role != "ADMIN":
        raise HTTPException(status_code=403, detail="Admin required")
    doc_ref = db.collection("reports").document(report_id)
    if doc_ref.get().exists:
        raise HTTPException(status_code=409, detail="Report already exists")
    doc_ref.set({
        "org_id": payload.org_id,
        "audit_id": payload.audit_id,
        "generated_by": payload.generated_by,
        "download_url": payload.download_url,
        "version": payload.version,
        "created_at": firestore.SERVER_TIMESTAMP
    })
    return {"report_id": report_id, "status": "created"}

@app.post("/generate-pdf")
async def generate_pdf(payload: dict):
    try:
        # 1. Process the audit math
        calc = process_audit(payload)
        chart_b64 = generate_section_chart(calc["chart_sections"])
        
        # 2. Build a Context that satisfies SA1, SA2, and SA3
        ctx = {
            # Data for sa1 (Building Info)
            "org_name": payload.get("org_name") or "",
            "org_type": payload.get("org_type") or "",
            "year": payload.get("year") or "",
            "address": payload.get("address") or "", # Added: Does sa1 need this?
            
            # Data for sa2 (Assessment Table)
            "section_results": calc["section_results"],
            "grand_total_percentage": calc["grand_total_percentage"],
            
            # Data for sa3 (Charts/Summary)
            "chart_b64": chart_b64,
            "observations": payload.get("observations") or [], # Added: Does sa3 need this?
            
            # Metadata
            "block_name": payload.get("block_name") or "",
            "construction_details": payload.get("construction_details") or [],
        }
        
        # 3. Call the renderer
        pdf_bytes = render_pdf(ctx)
        
        headers = {"Content-Disposition": "attachment; filename=Fire_Safety_Report.pdf"}
        return Response(content=pdf_bytes, media_type="application/pdf", headers=headers)
    except Exception as e:
        print(f"MERGE ERROR: {e}")
        raise HTTPException(status_code=400, detail=str(e))

@app.post("/calculate-score/{org_id}")
async def calculate_score(org_id: str):
    try:
        answers_ref = db.collection("answers").where("organizationId", "==", org_id).stream()
        total_earned = 0
        total_possible = 0
        
        for doc in answers_ref:
            data = doc.to_dict()
            status = data.get("status")
            if status == "Satisfactory":
                total_earned += 5
                total_possible += 5
            elif status == "Observation":
                total_earned += 3
                total_possible += 5
            elif status == "Not Satisfactory":
                total_earned += 0
                total_possible += 5
        
        final_percentage = (total_earned / total_possible * 100) if total_possible > 0 else 0
        report_data = {
            "organizationId": org_id,
            "score": round(final_percentage, 2),
            "generatedAt": firestore.SERVER_TIMESTAMP
        }
        db.collection("reports").add(report_data)
        return {"status": "success", "score": report_data["score"]}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/generate-self-assessment")
async def generate_self_assessment(payload: dict, idToken: Optional[str] = Header(default=None)):
    uid, role = verify_token(idToken)
    if role != "ADMIN":
        raise HTTPException(status_code=403, detail="Admin required")
    # 1. Extract IDs from the frontend request
    org_id = payload.get("org_id")
    block_id = payload.get("block_id")

    # 2. Fetch "Building Info" from Firestore [Image 4 Data]
    org_doc = db.collection("organizations").document(org_id).get().to_dict()

    # 3. Fetch "Audit Results" from Firestore [Image 2 Table Data]
    answers_ref = db.collection("answers").where("org_id", "==", org_id).stream()
    answers_list = [d.to_dict() for d in answers_ref]

    # 4. Run your Logic Folder Functions
    calc_results = process_audit(answers_list) # From your calculator.py
    chart_b64 = generate_section_chart(calc_results["sections"]) # From your charts.py

    # 5. Build the Unified Context
    ctx = {
        "building": org_doc,             # For sa1.html
        "results": calc_results,         # For sa2.html (Table)
        "chart_b64": chart_b64,          # For sa3.html (Chart)
        "report_type": "Self Assessment"
    }

    # 6. Render the MERGED PDF
    # This uses the report.html that has the 3 {% include %} tags
    pdf_bytes = render_pdf(ctx) 
    
    return Response(content=pdf_bytes, media_type="application/pdf")
