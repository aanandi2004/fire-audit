from firebase_admin import firestore
from typing import Dict, Any, List
from pathlib import Path

TEMPLATES_DIR = Path(__file__).resolve().parent.parent.parent / "templates"

SCORE_MAP = {
    "In Place": 5,
    "Partially In Place": 3,
    "Not In Place": 0,
    "Not Relevant": 5,
}

STATUS_ORDER = ["In Place", "Partially In Place", "Not In Place", "Not Relevant"]

def _latest_audit_for_org(db, org_id: str) -> Dict[str, Any]:
    q = db.collection("audits").where("org_id", "==", org_id).order_by("started_at", direction=firestore.Query.DESCENDING).limit(1)
    items = list(q.stream())
    return items[0].to_dict() if items else {}

def _extract_essay1_pages() -> str:
    p = TEMPLATES_DIR / "buildinginfo_sa1.html"
    try:
        raw = p.read_text(encoding="utf-8")
    except Exception:
        return ""
    start_idx = raw.find('<div class="page"')
    if start_idx == -1:
        return ""
    end_idx = raw.rfind("</body>")
    if end_idx == -1:
        end_idx = len(raw)
    html = raw[start_idx:end_idx]
    return html

def _normalize_status(entry: Dict[str, Any]) -> str:
    v = entry.get("status")
    if v in SCORE_MAP:
        return v
    a = entry.get("answer")
    if a in (True, "Yes"):
        return "In Place"
    if a in ("Partial", "Partially In Place"):
        return "Partially In Place"
    if a in (False, "No"):
        return "Not In Place"
    if a in ("Not Relevant", "NA"):
        return "Not Relevant"
    return "Not In Place"

def _compute_context_from_responses(db, audit_id: str) -> Dict[str, Any]:
    if not isinstance(audit_id, str) or not audit_id.strip():
        raise ValueError("Invalid audit_id: cannot be empty")
    blocks = list(db.collection("audit_responses").document(audit_id).collection("blocks").stream())
    cat_counts: Dict[str, Dict[str, int]] = {}
    total_questions = 0
    status_counts = {"IN_PLACE": 0, "PARTIAL": 0, "NOT_IN_PLACE": 0, "NOT_RELEVANT": 0}
    org_id = ""
    for b in blocks:
        qs = list(b.reference.collection("questions").stream())
        for q in qs:
            d = q.to_dict() or {}
            cat = str(d.get("category") or "").strip() or "UNKNOWN"
            status_raw = str(d.get("status") or d.get("customer_status") or "").strip().upper()
            if status_raw not in status_counts:
                status_raw = "NOT_IN_PLACE"
            score = d.get("final_score")
            if not isinstance(score, (int, float)):
                score = d.get("user_score")
            if not isinstance(score, (int, float)):
                score = 5 if status_raw == "IN_PLACE" else 3 if status_raw == "PARTIAL" else 0 if status_raw == "NOT_IN_PLACE" else 5
            cat_counts.setdefault(cat, {"count": 0, "earned": 0})
            cat_counts[cat]["count"] += 1
            cat_counts[cat]["earned"] += int(score)
            status_counts[status_raw] += 1
            if not org_id and isinstance(d.get("organization_id"), str):
                org_id = d.get("organization_id")
        total_questions += len(qs)
    sections: List[Dict[str, Any]] = []
    for cat, s in cat_counts.items():
        target = s["count"] * 5
        pct = int((s["earned"] * 100 / target)) if target > 0 else 0
        sections.append({"name": cat, "target": target, "earned": s["earned"], "percentage": pct})
    total_earned = sum(s["earned"] for s in cat_counts.values())
    total_max = sum(s["count"] * 5 for s in cat_counts.values())
    overall = {
        "percentage": int((total_earned * 100 / total_max)) if total_max > 0 else 0,
        "earned": total_earned,
        "max": total_max,
        "total_questions": total_questions,
    }
    status_distribution = {
        "in_place": status_counts["IN_PLACE"],
        "partial": status_counts["PARTIAL"],
        "not_in_place": status_counts["NOT_IN_PLACE"],
        "not_relevant": status_counts["NOT_RELEVANT"],
        "in_place_percent": int(status_counts["IN_PLACE"] * 100 / total_questions) if total_questions else 0,
        "partial_percent": int(status_counts["PARTIAL"] * 100 / total_questions) if total_questions else 0,
        "not_in_place_percent": int(status_counts["NOT_IN_PLACE"] * 100 / total_questions) if total_questions else 0,
        "not_relevant_percent": int(status_counts["NOT_RELEVANT"] * 100 / total_questions) if total_questions else 0,
    }
    category_compliance = [{"label": s["name"], "percentage": s["percentage"]} for s in sections]
    charts_overall = {"percentage": overall["percentage"], "categories": len(category_compliance), "questions": total_questions}
    organization = {"name": ""}
    if org_id:
        osnap = db.collection("organizations").document(org_id).get()
        odata = osnap.to_dict() if osnap.exists else {}
        organization["name"] = odata.get("name") or odata.get("org_name") or ""
    print({"categories": [{"category": k, "count": v["count"], "earned": v["earned"], "target": v["count"] * 5, "percent": next(s["percentage"] for s in sections if s["name"] == k)} for k, v in cat_counts.items()], "status": status_distribution})
    return {"organization": organization, "overall": overall, "sections": sections, "status_distribution": status_distribution, "category_compliance": category_compliance, "charts_overall": charts_overall, "essay1_html": _extract_essay1_pages()}

def build_report(org_id: str) -> Dict[str, Any]:
    db = firestore.client()
    q = db.collection("audit_responses").where("org_id", "==", org_id).limit(1)
    items = list(q.stream())
    aid = ""
    if items:
        aid = items[0].id
    if not aid:
        raise ValueError("No audit found for organization")
    return _compute_context_from_responses(db, aid)

def build_context_for_audit(audit_id: str) -> Dict[str, Any]:
    db = firestore.client()
    return _compute_context_from_responses(db, audit_id)

def compute_essay3_summary(audit_id: str) -> Dict[str, Any]:
    db = firestore.client()
    # Derive deterministic category order from checklist definition (first appearance)
    category_order: Dict[str, int] = {}
    try:
        qdef = db.collection("self_assessment_questions").order_by("created_at").stream()
        idx = 0
        for snap in qdef:
            d = snap.to_dict() or {}
            cat = str(d.get("category") or "").strip()
            if cat and cat not in category_order:
                category_order[cat] = idx
                idx += 1
    except Exception:
        category_order = {}
    # Build a single canonical evaluated questions list
    evals = get_evaluated_questions(audit_id)
    if not evals:
        raise ValueError("No evaluated questions")
    allowed = {"IN_PLACE", "PARTIALLY_IN_PLACE", "NOT_IN_PLACE", "NOT_RELEVANT"}
    status_counts = {"IN_PLACE": 0, "PARTIALLY_IN_PLACE": 0, "NOT_IN_PLACE": 0, "NOT_RELEVANT": 0}
    cat_stats: Dict[str, Dict[str, int]] = {}
    total_questions = len(evals)
    for e in evals:
        cat = str(e.get("category") or "").strip() or "UNKNOWN"
        s = str(e.get("status") or "").strip().upper()
        if s not in allowed:
            s = "NOT_IN_PLACE"
        status_counts[s] += 1
        cat_stats.setdefault(cat, {"total": 0, "IN_PLACE": 0, "PARTIALLY_IN_PLACE": 0, "NOT_IN_PLACE": 0, "NOT_RELEVANT": 0})
        cat_stats[cat]["total"] += 1
        cat_stats[cat][s] += 1
    dist = []
    for label, key, color in [
        ("In Place", "IN_PLACE", "#16a34a"),
        ("Partially In Place", "PARTIALLY_IN_PLACE", "#f59e0b"),
        ("Not In Place", "NOT_IN_PLACE", "#ef4444"),
        ("Not Relevant", "NOT_RELEVANT", "#3b82f6"),
    ]:
        count = status_counts[key]
        percent = int(round((count * 100) / total_questions)) if total_questions else 0
        dist.append({"label": label, "count": count, "percent": percent, "color": color})
    categories: List[Dict[str, Any]] = []
    total_effective = 0
    total_earned = 0.0
    for name, s in cat_stats.items():
        if category_order and name not in category_order:
            raise ValueError(f"Unknown category '{name}' not found in checklist definition")
        effective = s["total"] - s["NOT_RELEVANT"]
        earned = s["IN_PLACE"] + 0.5 * s["PARTIALLY_IN_PLACE"]
        pct = int(round((earned * 100) / effective)) if effective > 0 else 0
        categories.append({"name": name, "percentage": pct})
        total_effective += max(effective, 0)
        total_earned += earned
    if category_order:
        categories.sort(key=lambda c: category_order.get(c["name"], 10**9))
    overall_pct = int(round((total_earned * 100) / total_effective)) if total_effective > 0 else 0
    summary = {
        "overall": {"percentage": overall_pct, "categories": len(categories), "questions": total_questions},
        "categories": categories,
        "status_distribution": dist,
    }
    if sum(x["count"] for x in dist) != total_questions:
        raise ValueError("Invalid distribution")
    if any(c["percentage"] < 0 or c["percentage"] > 100 for c in categories):
        raise ValueError("Invalid category percentage")
    if summary["overall"]["categories"] <= 0:
        raise ValueError("No categories")
    if total_effective <= 0:
        raise ValueError("No effective questions")
    return summary

def build_context_for_summary(audit_id: str) -> Dict[str, Any]:
    db = firestore.client()
    summary = compute_essay3_summary(audit_id)
    # Derive deterministic category order from checklist definition (first appearance)
    category_order: Dict[str, int] = {}
    try:
        qdef = db.collection("self_assessment_questions").order_by("created_at").stream()
        idx = 0
        for snap in qdef:
            d = snap.to_dict() or {}
            cat = str(d.get("category") or "").strip()
            if cat and cat not in category_order:
                category_order[cat] = idx
                idx += 1
    except Exception:
        category_order = {}
    org_id = ""
    asg = db.collection("assignments").document(audit_id).get()
    if asg.exists:
        org_id = (asg.to_dict() or {}).get("org_id") or ""
    organization = {"name": ""}
    if org_id:
        osnap = db.collection("organizations").document(org_id).get()
        odata = osnap.to_dict() if osnap.exists else {}
        organization["name"] = odata.get("name") or odata.get("org_name") or ""
    cat_map: Dict[str, Dict[str, int]] = {}
    blocks = list(db.collection("audit_responses").document(audit_id).collection("blocks").stream())
    for b in blocks:
        qs = list(b.reference.collection("questions").stream())
        for q in qs:
            d = q.to_dict() or {}
            cat = str(d.get("category") or "").strip() or "UNKNOWN"
            s = str(d.get("status") or "").strip().upper()
            if s == "PARTIAL":
                s = "PARTIALLY_IN_PLACE"
            cat_map.setdefault(cat, {"total": 0, "NR": 0, "IP": 0, "PI": 0})
            cat_map[cat]["total"] += 1
            if s == "NOT_RELEVANT":
                cat_map[cat]["NR"] += 1
            elif s == "IN_PLACE":
                cat_map[cat]["IP"] += 1
            elif s == "PARTIALLY_IN_PLACE":
                cat_map[cat]["PI"] += 1
    sections: List[Dict[str, Any]] = []
    for name, s in cat_map.items():
        effective = s["total"] - s["NR"]
        earned = s["IP"] + 0.5 * s["PI"]
        pct = int(round((earned * 100) / effective)) if effective > 0 else 0
        sections.append({"name": name, "target": effective, "earned": round(earned, 1), "percentage": pct})
    if category_order:
        for sec in sections:
            if sec["name"] not in category_order:
                raise ValueError(f"Unknown category '{sec['name']}' not found in checklist definition")
        sections.sort(key=lambda s: category_order.get(s["name"], 10**9))
    ctx = {
        "organization": organization,
        "overall": summary["overall"],
        "sections": sections,
        "status_distribution": summary["status_distribution"],
        "category_compliance": [{"name": c["name"], "percentage": c["percentage"]} for c in summary["categories"]],
    }
    return ctx

def get_evaluated_questions(audit_id: str) -> List[Dict[str, Any]]:
    db = firestore.client()
    blocks = list(db.collection("audit_responses").document(audit_id).collection("blocks").stream())
    res: List[Dict[str, Any]] = []
    for b in blocks:
        qs = list(b.reference.collection("questions").stream())
        for q in qs:
            d = q.to_dict() or {}
            status = str(d.get("status") or d.get("customer_status") or "").strip().upper()
            if status == "PARTIAL":
                status = "PARTIALLY_IN_PLACE"
            if status not in {"IN_PLACE", "PARTIALLY_IN_PLACE", "NOT_IN_PLACE", "NOT_RELEVANT"}:
                status = "NOT_IN_PLACE"
            res.append({
                "section": str(d.get("subcategory") or d.get("category") or "UNKNOWN"),
                "category": str(d.get("category") or "UNKNOWN"),
                "subcategory": str(d.get("subcategory") or ""),
                "question": str(d.get("question_id") or ""),
                "status": status,
            })
    return res

def build_context_for_essay2(audit_id: str) -> Dict[str, Any]:
    db = firestore.client()
    evals = get_evaluated_questions(audit_id)
    if not evals:
        raise ValueError("No evaluated questions")
    # lookup target_score per question from definition
    targets: Dict[str, int] = {}
    try:
        qdef = db.collection("self_assessment_questions").stream()
        for snap in qdef:
            d = snap.to_dict() or {}
            qid = str(d.get("question_id") or "")
            t = int(d.get("target_score") or 5)
            if qid:
                targets[qid] = t
    except Exception:
        targets = {}
    # organization name via assignment -> organizations
    org_id = ""
    asg = db.collection("assignments").document(audit_id).get()
    if asg.exists:
        org_id = (asg.to_dict() or {}).get("org_id") or ""
    organization = {"name": ""}
    if org_id:
        osnap = db.collection("organizations").document(org_id).get()
        odata = osnap.to_dict() if osnap.exists else {}
        organization["name"] = odata.get("name") or odata.get("org_name") or ""
    # choose a representative block name if needed
    block_name = ""
    bcol = db.collection("audit_responses").document(audit_id).collection("blocks").stream()
    for b in bcol:
        block_name = b.id
        break
    def status_to_score(st: str) -> Any:
        if st == "IN_PLACE":
            return 5
        if st == "PARTIALLY_IN_PLACE":
            return 3
        if st == "NOT_IN_PLACE":
            return 0
        return ""
    rows = []
    for e in evals:
        qid = e.get("question") or ""
        t = targets.get(str(qid), 5)
        rows.append({
            "section": e.get("section"),
            "target": t,
            "organization": status_to_score(e.get("status") or ""),
            "status": ("In Place" if e["status"] == "IN_PLACE" else
                       "Partially In Place" if e["status"] == "PARTIALLY_IN_PLACE" else
                       "Not In Place" if e["status"] == "NOT_IN_PLACE" else
                       "Not Relevant"),
        })
    return {
        "report": {
            "block": {"name": block_name},
            "organization": {"name": organization["name"]},
            "assessment_rows": rows,
        }
    }
