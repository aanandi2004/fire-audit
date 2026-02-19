from typing import Literal
from firebase_admin import firestore
from backend.pdf.renderer import render_pdf

def _safe(s):
    return s if s is not None else "NA"

def generate_self_assessment_pdf(org_id: str, audit_id: str, mode: Literal["sa1", "sa2", "sa3", "full"]) -> bytes:
    if mode not in ("sa1", "sa2", "sa3", "full"):
        raise ValueError("invalid mode")
    db = firestore.client()
    org_snap = db.collection("organizations").document(org_id).get()
    org = org_snap.to_dict() if org_snap.exists else {}
    audit_snap = db.collection("audits").document(audit_id).get()
    audit = audit_snap.to_dict() if audit_snap.exists else {}
    answers = []
    try:
        q1 = db.collection("answers").where("org_id", "==", org_id).stream()
        answers.extend([d.to_dict() for d in q1])
    except Exception:
        pass
    try:
        q2 = db.collection("answers").where("organizationId", "==", org_id).stream()
        answers.extend([d.to_dict() for d in q2])
    except Exception:
        pass
    block_name = _safe(org.get("name"))
    category_label = _safe(org.get("type"))
    subdivision = org.get("subdivision")
    if isinstance(subdivision, list):
        subdivision_id = subdivision[0] if subdivision else ""
    else:
        subdivision_id = _safe(subdivision)
    organization_name = _safe(org.get("name"))
    rows_html = ""
    context = {
        "BLOCK_NAME": block_name,
        "SECTION_HEADING": "Status by Block and Section",
        "CATEGORY_ID": category_label,
        "SUBDIVISION_ID": subdivision_id,
        "ORGANIZATION_NAME": organization_name,
        "ROWS": rows_html,
        "chart_b64": "",
        "BUILDING_INFO_OCCUPANCY": _safe(org.get("occupancy")),
        "BUILDING_INFO_TOTAL_DEPARTMENTS": _safe(org.get("total_departments")),
        "BUILDING_INFO_DEPT_NAMES": _safe(org.get("department_names")),
        "BUILDING_INFO_TOTAL_PROCESS": _safe(org.get("total_process")),
        "BUILDING_INFO_TOTAL_PROCESS_OUTSOURCED": _safe(org.get("total_process_outsourced")),
        "BUILDING_INFO_TOTAL_CONTRACTOR": _safe(org.get("total_contractor")),
        "CONST_OWN_BUILDING": _safe(org.get("own_building")),
        "CONST_LEASE": _safe(org.get("lease")),
        "CONST_RENTAL": _safe(org.get("rental")),
        "CONST_BUILT_UP_AREA": _safe(org.get("built_up_area")),
        "CONST_STRUCTURES_NUMBER": _safe(org.get("structures_number")),
        "CONST_HEIGHT_METERS": _safe(org.get("height_m")),
        "CONST_FLOORS_INCL_BASEMENT": _safe(org.get("floors")),
        "CONST_STAIRCASE_COUNT": _safe(org.get("staircase_count")),
        "CONST_STAIRCASE_WIDTH": _safe(org.get("staircase_width")),
        "BASE_FLOORS": _safe(org.get("basement_floors")),
        "BASE_AREA": _safe(org.get("basement_area")),
        "BASE_HEIGHT": _safe(org.get("basement_height")),
        "BASE_UTIL_CAR": _safe(org.get("basement_util_car")),
        "BASE_UTIL_STOR": _safe(org.get("basement_util_storage")),
        "BASE_UTIL_OFF": _safe(org.get("basement_util_office")),
        "BASE_MAT_PAP": _safe(org.get("basement_mat_papers")),
        "BASE_MAT_CLO": _safe(org.get("basement_mat_clothes")),
        "BASE_MAT_RAG": _safe(org.get("basement_mat_rags")),
        "BASE_MAT_REC": _safe(org.get("basement_mat_records")),
        "BASE_MAT_BOOK": _safe(org.get("basement_mat_books")),
    }
    if mode == "sa1":
        context["__mode"] = "sa1"
    elif mode == "sa2":
        context["__mode"] = "sa2"
    elif mode == "sa3":
        context["__mode"] = "sa3"
    else:
        context["__mode"] = "full"
    return render_pdf(context)
