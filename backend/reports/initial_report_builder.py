from typing import Dict, List, Tuple
from pathlib import Path
from firebase_admin import firestore
from jinja2 import Environment, FileSystemLoader, select_autoescape
import re

BASE_DIR = Path(__file__).resolve().parent.parent
TPL_DIR = BASE_DIR / "templates" / "initial_report"

env = Environment(
    loader=FileSystemLoader(str(TPL_DIR)),
    autoescape=select_autoescape(["html"])
)

STATUS_SCORE_MAP = {
    "IN_PLACE": 5.0,
    "NOT_RELEVANT": 5.0,
    "PARTIALLY_IN_PLACE": 3.0,
    "PARTIAL": 3.0,
    "NOT_IN_PLACE": 0.0,
}

SECTION_LABELS = {
    "A": "Fire Prevention",
    "B": "Means of Escape",
    "C": "Fire Fighting Organization",
    "D": "Fire Drills and Training",
    "E": "System Maintenance",
    "F": "Safety Management",
    "G": "Emergency Preparedness",
    "H": "Electrical Safety",
    "J": "HVAC and AC",
}

def _normalize_subdivision(label: str) -> str:
    s = (label or "").strip().upper()
    if not s:
        return ""
    if s == "GEN" or s.endswith("GEN"):
        return "GEN"
    s = s.replace("-", "")
    return s

def _status_to_score(status: str) -> float:
    s = (status or "").strip().upper()
    return float(STATUS_SCORE_MAP.get(s, 0.0))

def _get_org_and_block(db, audit_id: str, block_id: str) -> Tuple[Dict, str]:
    audit_snap = db.collection("audits").document(audit_id).get()
    if not audit_snap.exists:
        raise ValueError("Audit not found")
    audit = audit_snap.to_dict() or {}
    org_id = audit.get("org_id") or ""
    if not org_id:
        raise ValueError("Audit missing org_id")
    org_snap = db.collection("organizations").document(org_id).get()
    org = org_snap.to_dict() if org_snap.exists else {}
    block_name = ""
    # Prefer organization blockNames if present
    if isinstance(org.get("blockNames"), list):
        try:
            if block_id.startswith("block_"):
                idx = int(block_id.split("_", 1)[1]) - 1
                block_name = org["blockNames"][idx] if 0 <= idx < len(org["blockNames"]) else ""
        except Exception:
            block_name = ""
    # Fallback: assignment block_name
    if not block_name:
        q = db.collection("assignments").where("org_id", "==", org_id).where("is_active", "==", True)
        for d in q.stream():
            x = d.to_dict() or {}
            if (x.get("block_id") == block_id) or (x.get("block_id") == "block_all"):
                block_name = x.get("block_name") or block_name
                if block_name:
                    break
    # Final fallback: humanized block_id
    if not block_name:
        block_name = block_id.replace("_", " ").title()
    return org, block_name

def _allowed_subcategories(db, org_id: str, block_id: str) -> List[str]:
    q = db.collection("assignments").where("org_id", "==", org_id).where("is_active", "==", True)
    subs: List[str] = []
    for d in q.stream():
        x = d.to_dict() or {}
        bid = str(x.get("block_id") or "")
        if bid and bid not in (block_id, "block_all"):
            continue
        lab = str(x.get("subdivision") or "")
        nid = _normalize_subdivision(lab)
        if nid:
            subs.append(nid)
    # de-duplicate, preserve order
    seen = set()
    result: List[str] = []
    for s in subs:
        if s not in seen:
            result.append(s)
            seen.add(s)
    if not result:
        raise ValueError("No assigned subcategories found")
    return result

def _extract_placeholders_from_report1() -> List[str]:
    # Parse {{PLACEHOLDER}} tokens from frozen template to ensure flat dict coverage
    html_path = TPL_DIR / "report1.html"
    try:
        raw = html_path.read_text(encoding="utf-8")
    except Exception:
        return []
    patt = re.compile(r"\{\{\s*([A-Z0-9_]+)\s*\}\}")
    return list(dict.fromkeys(patt.findall(raw)))

def _build_report1_flat(org: Dict, block_name: str) -> Dict[str, str]:
    # Map organization fields to template keys; fill missing with empty strings
    identity = ((org.get("model") or {}).get("org_profile") or {}).get("identity") or {}
    est = ((org.get("model") or {}).get("org_profile") or {}).get("establishment") or {}
    contacts = ((org.get("model") or {}).get("org_profile") or {}).get("contacts") or {}
    # Base values
    values: Dict[str, str] = {
        "BLOCK_NAME": str(block_name or ""),
        "P1_NAME_BUILDING": str(block_name or ""),
        "P1_ADDR_BUILDING": str(identity.get("address") or ""),
        "P1_TELEPHONE": str(identity.get("phone") or ""),
        "P1_EMAIL": str(identity.get("email") or ""),
        "P1_WEBSITE": str(identity.get("website") or ""),
        "P1_EST_TYPE": str(org.get("type") or ""),
        "P1_OWNERSHIP": str(est.get("ownership_type") or ""),
        "P1_TOTAL_MANPOWER": str(est.get("total_manpower") or ""),
        "P1_TOTAL_BUILDINGS": str(est.get("total_blocks") or org.get("blockCount") or ""),
        "P1_TOTAL_DEPARTMENTS": str(est.get("total_departments") or ""),
        "P1_TOTAL_AREA": str(est.get("total_area") or ""),
        "P1_BUILT_UP_AREA": str(est.get("built_up_area") or ""),
        "P1_BUILD_COUNT": str(org.get("blockCount") or ""),
        "P1_BUILD_1_NAME": str((org.get("blockNames") or ["", ""])[0] or ""),
        "P1_BUILD_1_HEIGHT": str(""),
        "P1_BUILD_2_NAME": str((org.get("blockNames") or ["", ""])[1] or ""),
        "P1_BUILD_2_HEIGHT": str(""),
        "P1_CONTACT_PLANT_HEAD": str(contacts.get("plant_head") or ""),
        "P1_CONTACT_AUDIT_PERSON": str(contacts.get("fire_audit_contact") or ""),
        "BUILDING_INFO_OCCUPANCY": str(org.get("occupancy") or ""),
        "BUILDING_INFO_TOTAL_DEPARTMENTS": str(est.get("total_departments") or ""),
        "BUILDING_INFO_DEPT_NAMES": str((org.get("department_names") or "")),
        "BUILDING_INFO_TOTAL_PROCESS": str(org.get("total_process") or ""),
        "BUILDING_INFO_TOTAL_PROCESS_OUTSOURCED": str(org.get("total_process_outsourced") or ""),
        "BUILDING_INFO_TOTAL_CONTRACTOR": str(org.get("total_contractor") or ""),
        "CONST_OWN_BUILDING": str(org.get("own_building") or ""),
        "CONST_LEASE": str(org.get("lease") or ""),
        "CONST_RENTAL": str(org.get("rental") or ""),
        "CONST_BUILT_UP_AREA": str(est.get("built_up_area") or org.get("built_up_area") or ""),
        "CONST_STRUCTURES_NUMBER": str(org.get("structures_number") or ""),
        "CONST_HEIGHT_METERS": str(org.get("height_m") or ""),
        "CONST_FLOORS_INCL_BASEMENT": str(org.get("floors") or ""),
        "CONST_CEILING_HEIGHT_METERS": str(org.get("ceiling_height_m") or ""),
        "CONST_RAMP_COUNT": str(org.get("ramp_count") or ""),
        "CONST_RAMP_WIDTH": str(org.get("ramp_width_m") or ""),
        "CONST_STAIRCASE_COUNT": str(org.get("staircase_count") or ""),
        "CONST_STAIRCASE_WIDTH": str(org.get("staircase_width") or ""),
        "CONST_LIFTS_COUNT": str(org.get("lifts_count") or ""),
        "BASE_FLOORS": str(org.get("basement_floors") or ""),
        "BASE_AREA": str(org.get("basement_area") or ""),
        "BASE_HEIGHT": str(org.get("basement_height") or ""),
        "BASE_UTIL_CAR": str(org.get("basement_util_car") or ""),
        "BASE_UTIL_STOR": str(org.get("basement_util_storage") or ""),
        "BASE_UTIL_OFF": str(org.get("basement_util_office") or ""),
        "BASE_MAT_PAP": str(org.get("basement_mat_papers") or ""),
        "BASE_MAT_CLO": str(org.get("basement_mat_clothes") or ""),
        "BASE_MAT_RAG": str(org.get("basement_mat_rags") or ""),
        "BASE_MAT_REC": str(org.get("basement_mat_records") or ""),
        "BASE_MAT_BOOK": str(org.get("basement_mat_books") or ""),
        "BASE_MAT_ELEC": str(org.get("basement_mat_electronics") or ""),
        "BASE_MAT_PET": str(org.get("basement_mat_petrol") or ""),
        "BASE_MAT_KER": str(org.get("basement_mat_kerosene") or ""),
        "BASE_MAT_GAND": str(org.get("basement_mat_ganders") or ""),
        "BASE_APP_LIFT": str(org.get("basement_app_lift") or ""),
        "BASE_APP_STAIR": str(org.get("basement_app_stair") or ""),
        "BASE_APP_DRIVE": str(org.get("basement_app_drive") or ""),
        "KITCH_AVAIL": str(org.get("kitchen_available") or ""),
        "KITCH_LOC": str(org.get("kitchen_location") or ""),
        "KITCH_FUEL": str(org.get("kitchen_fuel") or ""),
        "GAS_TYPE": str(org.get("gas_type") or ""),
        "GAS_STORAGE": str(org.get("gas_storage") or ""),
        "AC_AHU_NUMBER": str(org.get("ac_ahu_number") or ""),
        "AC_AHU_NA": str(org.get("ac_ahu_na") or ""),
        "AC_CENTRAL_NUMBER": str(org.get("ac_central_number") or ""),
        "AC_CENTRAL_NA": str(org.get("ac_central_na") or ""),
        "AC_WINDOW_NUMBER": str(org.get("ac_window_number") or ""),
        "AC_WINDOW_NA": str(org.get("ac_window_na") or ""),
        "AC_SPLIT_NUMBER": str(org.get("ac_split_number") or ""),
        "WATER_TERRACE_DOM_QTY": str(org.get("water_terrace_dom_qty") or ""),
        "WATER_TERRACE_QTY": str(org.get("water_terrace_qty") or ""),
        "PUMP_MAIN_CAP": str(org.get("pump_main_cap") or ""),
        "PUMP_MAIN_HEAD": str(org.get("pump_main_head") or ""),
        "PUMP_MAIN_RPM": str(org.get("pump_main_rpm") or ""),
        "PUMP_MAIN_MAKE": str(org.get("pump_main_make") or ""),
        "PUMP_MAIN_STATUS": str(org.get("pump_main_status") or ""),
        "PUMP_DIESEL_CAP": str(org.get("pump_diesel_cap") or ""),
        "PUMP_DIESEL_HEAD": str(org.get("pump_diesel_head") or ""),
        "PUMP_DIESEL_RPM": str(org.get("pump_diesel_rpm") or ""),
        "PUMP_DIESEL_MAKE": str(org.get("pump_diesel_make") or ""),
    }
    # Ensure coverage of all placeholders with empty strings
    keys = _extract_placeholders_from_report1()
    for k in keys:
        if k not in values:
            values[k] = ""
    return values

def _fetch_allowed_questions(db, allowed_subs: List[str]) -> List[Dict]:
    res: List[Dict] = []
    q = db.collection("self_assessment_questions").order_by("order")
    for doc in q.stream():
        d = doc.to_dict() or {}
        sub = str(d.get("subcategory") or "").strip().upper()
        if sub in allowed_subs:
            res.append({"id": doc.id, **d})
    return res

def _fetch_row_components(db, audit_id: str, block_id: str, q: Dict) -> Dict:
    qid = str(q.get("question_id") or q.get("id") or "")
    if not qid:
        return {}
    # audit_responses
    rref = db.collection("audit_responses").document(audit_id).collection("blocks").document(block_id).collection("questions").document(qid)
    rsnap = rref.get()
    rdata = rsnap.to_dict() if rsnap.exists else {}
    auditor_status = rdata.get("status")
    if not auditor_status:
        raise ValueError(f"Missing auditor status for question {qid}")
    org_status = rdata.get("status") if rdata.get("updated_by") == "CUSTOMER" else rdata.get("status")
    # observations
    obs_id = f"{audit_id}::{block_id}::{qid}"
    osnap = db.collection("audit_observations").document(obs_id).get()
    odata = osnap.to_dict() if osnap.exists else {}
    auditor_observation = odata.get("auditor_observation") or ""
    # scores
    target_score = _status_to_score(auditor_status)
    org_score = _status_to_score(org_status or "")
    auditor_score = _status_to_score(auditor_status)
    # section label from category
    cat = str(q.get("category") or "").strip().upper()
    section_label = SECTION_LABELS.get(cat, cat)
    sub = str(q.get("subcategory") or "").strip().upper()
    return {
        "section": section_label,
        "question": str(q.get("question_text") or ""),
        "target": target_score,
        "organization": org_score,
        "auditor": auditor_score,
        "auditor_observation": auditor_observation,
        "category": cat,
        "subcategory": sub,
    }

def build_initial_report(audit_id: str, block_id: str) -> dict:
    db = firestore.client()
    org, block_name = _get_org_and_block(db, audit_id, block_id)
    org_id = (org.get("model") or {}).get("org_id") or org.get("id") or org.get("org_id") or ""
    if not org_id:
        # organizations stored by doc id
        audit_snap = db.collection("audits").document(audit_id).get()
        org_id = (audit_snap.to_dict() or {}).get("org_id") or ""
    if not org_id:
        raise ValueError("Assignment data inconsistent: org_id not linked")
    allowed_subs = _allowed_subcategories(db, org_id, block_id)
    questions = _fetch_allowed_questions(db, allowed_subs)
    if not questions:
        raise ValueError("No questions for assigned subcategories")
    # Build rows and group deterministically
    rows: List[Dict] = []
    for q in questions:
        rows.append(_fetch_row_components(db, audit_id, block_id, q))
    # Group by (section, category, subcategory)
    groups: Dict[Tuple[str, str, str], List[Dict]] = {}
    for r in rows:
        key = (r["section"], r["category"], r["subcategory"])
        groups.setdefault(key, []).append(r)
    # Render pages: one page per group with all rows
    pages: List[str] = []
    tpl = env.get_template("report2.html")
    for (section_name, category_name, subcat_name), rows_list in groups.items():
        context = {
            "report": {
                "block": { "name": block_name },
                "section": { "name": section_name },
                "category": { "name": category_name },
                "subcategory": { "name": subcat_name },
            },
            "rows": rows_list
        }
        html = tpl.render(**context)
        pages.append(html)
    # --- Report 3 (Gaps) ---
    gap_rows: List[Dict] = [r for r in rows if r.get("auditor") in (3.0, 0.0)]
    gap_pages: List[str] = []
    if gap_rows:
        gap_groups: Dict[Tuple[str, str, str], List[Dict]] = {}
        for r in gap_rows:
            key = (r["section"], r["category"], r["subcategory"])
            gap_groups.setdefault(key, []).append(r)
        tpl3 = env.get_template("report3.html")
        for (section_name, category_name, subcat_name), rows_list in gap_groups.items():
            context = {
                "report": {
                    "block": { "name": block_name },
                    "section": { "name": section_name },
                    "category": { "name": category_name },
                    "subcategory": { "name": subcat_name },
                },
                "rows": rows_list
            }
            html = tpl3.render(**context)
            gap_pages.append(html)
    # --- Report 4 (Charts & Summary) ---
    if not rows:
        raise ValueError("No rows available to summarize")
    cat_order: List[str] = []
    cat_stats: Dict[str, Dict[str, int]] = {}
    for r in rows:
        cname = str(r.get("section") or "")
        if cname not in cat_stats:
            cat_stats[cname] = {"closed": 0, "gaps": 0}
            cat_order.append(cname)
        a = float(r.get("auditor") or 0.0)
        if a == 5.0:
            cat_stats[cname]["closed"] += 1
        elif a in (3.0, 0.0):
            cat_stats[cname]["gaps"] += 1
    categories_payload = [{"name": name, "closed": cat_stats[name]["closed"], "gaps": cat_stats[name]["gaps"]} for name in cat_order]
    total_closed = sum(x["closed"] for x in categories_payload)
    total_gaps = sum(x["gaps"] for x in categories_payload)
    tpl4 = env.get_template("report4.html")
    report4_ctx = {
        "summary": { "total_closed": int(total_closed), "total_gaps": int(total_gaps) },
        "categories": categories_payload
    }
    report4_html = tpl4.render(**report4_ctx)
    flat = _build_report1_flat(org, block_name)
    return {
        "report1": flat,
        "report2_pages": pages,
        "report3_pages": gap_pages,
        "report4_page": report4_html
    }
