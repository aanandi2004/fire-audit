from typing import Dict, Any, List, Optional
from backend.reports.calculations import (
    score_status,
    label_status,
    percent_compliance,
)

def _norm_status(raw: str) -> str:
    if not raw:
        return ""
    x = str(raw).strip().lower()
    if x in {"in_place", "in place"}:
        return "in_place"
    if x in {"partial", "partially in place", "partially_in_place"}:
        return "partial"
    if x in {"not_in_place", "not in place"}:
        return "not_in_place"
    if x in {"not_relevant", "not relevant"}:
        return "not_relevant"
    return ""

def normalize_audit(
    audit: Dict[str, Any],
    org: Optional[Dict[str, Any]] = None
) -> Dict[str, Any]:
    """
    Converts raw audit document into a render-ready structure
    for PDF generation. No HTML, no PDF logic here.
    """

    sections = audit.get("sections") or {}
    rows: List[Dict[str, Any]] = []

    # ---- Build rows (section → questions) ----
    for section_name, questions in sections.items():
        if not isinstance(questions, dict):
            continue

        for qid, q in questions.items():
            status_raw = q.get("status") or q.get("answer")
            status = _norm_status(status_raw)

            rows.append({
                "section": section_name,
                "requirement": (
                    q.get("requirement")
                    or q.get("text")
                    or qid
                ),
                "target": 5,
                "score": score_status(status),
                "status": label_status(status),
            })

    # ---- Summary calculations ----
    earned = sum(r["score"] for r in rows)
    max_score = len(rows) * 5
    percent = percent_compliance(earned, max_score)

    page = {
        "block_name": audit.get("block_name") or "Block 1",
        "category": (
            (org or {})
            .get("identity_data", {})
            .get("name", "")
        ),
        "subdivision": audit.get("subdivision") or "",
        "rows": rows,
        "summary": {
            "earned": earned,
            "max": max_score,
            "percent": percent,
        },
    }

    overall = {
        "earned": earned,
        "max": max_score,
        "percent": percent,
    }

    return {
        "org": org or {},
        "audit": {
            "org_id": audit.get("org_id"),
            "auditor_id": audit.get("auditor_id"),
            "status": audit.get("status"),
            "version": audit.get("version"),
        },
        "pages": [page],
        "overall": overall,
    }

def normalize_audit_grouped(audit: Dict[str, Any]) -> Dict[str, Any]:
    sections = audit.get("sections") or {}
    grouped_blocks: List[Dict[str, Any]] = []
    block_name = audit.get("block_name") or "Block 1"
    block = {"name": block_name, "sections": []}
    for section_name, questions in sections.items():
        if not isinstance(questions, dict):
            continue
        rows: List[Dict[str, Any]] = []
        for qid, q in questions.items():
            status_raw = q.get("status") or q.get("answer")
            status = _norm_status(status_raw)
            rows.append({
                "id": qid,
                "requirement": q.get("requirement") or q.get("text") or qid,
                "status": status,
                "label": label_status(status),
                "score": score_status(status),
                "target": 5,
            })
        block["sections"].append({"name": section_name, "rows": rows})
    grouped_blocks.append(block)
    return {"blocks": grouped_blocks}
