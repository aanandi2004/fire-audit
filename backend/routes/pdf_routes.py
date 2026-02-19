from fastapi import APIRouter, HTTPException, Header
from fastapi.responses import StreamingResponse, HTMLResponse
from pydantic import BaseModel, Field
from backend.reports.self_assessment.service import build_report, build_context_for_audit, compute_essay3_summary, build_context_for_summary, build_context_for_essay2
from backend.reports.self_assessment.renderer import render_pdf, render_html, env
from firebase_admin import auth, firestore
from backend.reports.final_report_builder import build_final_report
from backend.storage.firebase_storage import upload_pdf_and_url
import re
from pathlib import Path

router = APIRouter()

class SelfAssessmentRequest(BaseModel):
    org_id: str = Field(min_length=1)

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

@router.post("/api/pdf/self-assessment")
async def self_assessment(req: SelfAssessmentRequest, authorization: str = Header(default=None, alias="Authorization", description="Primary: Authorization: Bearer <ID_TOKEN>"), idToken: str = Header(default=None)):
    token = _extract_token(authorization, idToken)
    verify_admin(token)
    try:
        report = build_report(req.org_id)
        pdf_bytes = render_pdf(report)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    return StreamingResponse(iter([pdf_bytes]), media_type="application/pdf")

@router.post("/api/pdf/self-assessment/html")
async def self_assessment_html(req: SelfAssessmentRequest, authorization: str = Header(default=None, alias="Authorization", description="Primary: Authorization: Bearer <ID_TOKEN>"), idToken: str = Header(default=None)):
    token = _extract_token(authorization, idToken)
    verify_admin(token)
    try:
        report = build_report(req.org_id)
        html = render_html(report)
        return HTMLResponse(content=html, media_type="text/html")
    except Exception as e:
        # Fallback: return minimal HTML to avoid breaking the preview
        safe_msg = str(e)
        fallback = f"<!DOCTYPE html><html><head><meta charset='utf-8'><title>Self Assessment Preview</title></head><body><h2>Preview unavailable</h2><p>{safe_msg}</p></body></html>"
        return HTMLResponse(content=fallback, media_type="text/html", status_code=200)

@router.get("/reports/preview/sa3/{audit_id}")
async def preview_sa3(audit_id: str, authorization: str = Header(default=None, alias="Authorization", description="Primary: Authorization: Bearer <ID_TOKEN>"), idToken: str = Header(default=None)):
    token = _extract_token(authorization, idToken)
    verify_admin(token)
    ctx = build_context_for_summary(audit_id)
    html = env.get_template("essay3_summary.html").render(**ctx)
    return HTMLResponse(content=html, media_type="text/html")

@router.get("/reports/preview/sa2/{audit_id}")
async def preview_sa2(audit_id: str, authorization: str = Header(default=None, alias="Authorization", description="Primary: Authorization: Bearer <ID_TOKEN>"), idToken: str = Header(default=None)):
    token = _extract_token(authorization, idToken)
    verify_admin(token)
    ctx = build_context_for_essay2(audit_id)
    html = env.get_template("essay2_checklist.html").render(**ctx)
    return HTMLResponse(content=html, media_type="text/html")

@router.get("/reports/preview/summary/{audit_id}")
async def preview_summary(audit_id: str, authorization: str = Header(default=None, alias="Authorization", description="Primary: Authorization: Bearer <ID_TOKEN>"), idToken: str = Header(default=None)):
    token = _extract_token(authorization, idToken)
    verify_admin(token)
    ctx = build_context_for_summary(audit_id)
    charts_ctx = {
        "overall": ctx["overall"],
        "category_compliance": ctx["category_compliance"],
        "status_distribution": ctx["status_distribution"],
    }
    html = env.get_template("summary_charts.html").render(**charts_ctx)
    return HTMLResponse(content=html, media_type="text/html")

@router.get("/audits/{audit_id}/summary")
async def get_audit_summary(audit_id: str, authorization: str = Header(default=None, alias="Authorization", description="Primary: Authorization: Bearer <ID_TOKEN>"), idToken: str = Header(default=None)):
    token = _extract_token(authorization, idToken)
    verify_admin(token)
    data = compute_essay3_summary(audit_id)
    return data

@router.post("/reports/generate/sa3/{audit_id}")
async def generate_sa3_pdf(audit_id: str, authorization: str = Header(default=None, alias="Authorization", description="Primary: Authorization: Bearer <ID_TOKEN>"), idToken: str = Header(default=None)):
    token = _extract_token(authorization, idToken)
    verify_admin(token)
    ctx = build_context_for_summary(audit_id)
    html_sa3 = env.get_template("essay3_summary.html").render(**ctx)
    charts_ctx = {
        "overall": ctx["overall"],
        "category_compliance": ctx["category_compliance"],
        "status_distribution": ctx["status_distribution"],
    }
    html_charts = env.get_template("summary_charts.html").render(**charts_ctx)
    html_combined = html_sa3 + html_charts
    try:
        from weasyprint import HTML, CSS
        from pathlib import Path
        base_dir = Path(__file__).resolve().parents[1]
        static_css = CSS(filename=str(base_dir / "static" / "report.css"))
        pdf_bytes = HTML(string=html_combined, base_url=str(base_dir)).write_pdf(stylesheets=[static_css])
        from google.cloud import storage
        client = storage.Client()
        bucket_name = f"{firestore.client().project}.appspot.com"
        bucket = client.bucket(bucket_name)
        blob = bucket.blob(f"reports/{audit_id}/essay3_summary.pdf")
        blob.upload_from_string(pdf_bytes, content_type="application/pdf")
        url = f"https://storage.googleapis.com/{bucket_name}/reports/{audit_id}/essay3_summary.pdf"
        firestore.client().collection("reports").document(f"{audit_id}_sa3").set({
            "audit_id": audit_id,
            "type": "SA3_SUMMARY",
            "download_url": url,
            "generated_by": "ADMIN",
            "created_at": firestore.SERVER_TIMESTAMP
        }, merge=True)
        return {"status": "generated", "url": url}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# --- Final Report v1: merge HTML pages, render PDF, upload signed URL ---
def _extract_first_style(html: str) -> str:
    m = re.search(r"<style[^>]*>([\\s\\S]*?)</style>", html, re.IGNORECASE)
    return m.group(0) if m else ""

def _extract_body_inner(html: str) -> str:
    m = re.search(r"<body[^>]*>([\\s\\S]*?)</body>", html, re.IGNORECASE)
    return m.group(1) if m else html

def _merge_final_report_pages(pages: list[str]) -> str:
    if not pages:
        raise ValueError("No pages to merge")
    style_block = _extract_first_style(pages[0])
    bodies = []
    for p in pages:
        bodies.append(_extract_body_inner(p))
    body_joined = "\\n".join(bodies)
    return f"<!DOCTYPE html><html><head><meta charset='utf-8'><title>FINAL REPORT V1</title>{style_block}</head><body>{body_joined}</body></html>"

@router.post("/reports/generate/final/v1/{audit_id}/{block_id}")
async def generate_final_v1(audit_id: str, block_id: str, authorization: str = Header(default=None, alias="Authorization", description="Primary: Authorization: Bearer <ID_TOKEN>"), idToken: str = Header(default=None)):
    token = _extract_token(authorization, idToken)
    verify_admin(token)
    try:
        res = build_final_report(audit_id, block_id)
        pages = res.get("final_report_pages") or []
        if not pages:
            raise ValueError("Final report pages empty")
        merged_html = _merge_final_report_pages(pages)
        from weasyprint import HTML, CSS
        base_dir = Path(__file__).resolve().parents[1]
        css = CSS(filename=str(base_dir / "static" / "report.css"))
        pdf_bytes = HTML(string=merged_html, base_url=str(base_dir)).write_pdf(stylesheets=[css])
        path = f"reports/{audit_id}/{block_id}/final-report-v1.pdf"
        url = upload_pdf_and_url(path, pdf_bytes)
        firestore.client().collection("reports").document(f"{audit_id}_{block_id}_final_v1").set({
            "audit_id": audit_id,
            "block_id": block_id,
            "type": "FINAL_REPORT_V1",
            "download_url": url,
            "generated_by": "ADMIN",
            "version": 1,
            "created_at": firestore.SERVER_TIMESTAMP
        }, merge=True)
        return {"status": "generated", "url": url}
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
