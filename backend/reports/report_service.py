from firebase_admin import firestore
from backend.reports.normalizer import normalize_audit_grouped
from backend.reports.calculations import calculate_scores

def generate_report(audit_id: str) -> dict:
  db = firestore.client()
  audit_ref = db.collection("audits").document(audit_id)
  snap = audit_ref.get()
  if not snap.exists:
    return {"error": "not_found"}
  audit = snap.to_dict()
  if audit.get("status") != "COMPLETED":
    return {"error": "not_completed"}
  existing = list(db.collection("reports").where("audit_id", "==", audit_id).stream())
  version = len(existing) + 1
  org = {}
  if audit.get("org_id"):
    org_snap = db.collection("organizations").document(audit["org_id"]).get()
    org = org_snap.to_dict() if org_snap.exists else {}
  ctx = normalize_audit(audit, org)
  # legacy path remains for completed audit pipeline
  url = ""
  doc_id = f"{audit_id}_v{version}"
  db.collection("reports").document(doc_id).set({
    "org_id": audit.get("org_id"),
    "audit_id": audit_id,
    "generated_by": "ADMIN",
    "download_url": url,
    "version": version,
    "created_at": firestore.SERVER_TIMESTAMP
  })
  return {"url": url, "version": version}

def generate_self_assessment_pdf_context(org_id: str) -> dict:
  db = firestore.client()
  org_snap = db.collection("organizations").document(org_id).get()
  org = org_snap.to_dict() if org_snap.exists else {}
  audits_query = db.collection("audits").where("org_id", "==", org_id).order_by("started_at", direction=firestore.Query.DESCENDING).limit(1)
  audits = list(audits_query.stream())
  audit = audits[0].to_dict() if audits else {}
  normalized = normalize_audit_grouped(audit or {})
  scores = calculate_scores(normalized)
  blocks = scores.get("blocks", [])
  sections = []
  total_earned = 0
  total_max = 0
  for b in blocks:
    for s in b.get("sections", []):
      earned = int(s.get("earned", 0))
      max_s = int(s.get("max", 0))
      pct = int(s.get("percentage", 0))
      sections.append({
        "name": s.get("name"),
        "earned": earned,
        "max": max_s,
        "percentage": pct,
      })
      total_earned += earned
      total_max += max_s
  overall_pct = 0
  if total_max > 0:
    overall_pct = int((total_earned / total_max) * 100)
  summary = {
    "organization": {
      "name": org.get("name") or "",
      "id": org_id,
    },
    "sections": sections,
    "total": {
      "earned": total_earned,
      "max": total_max,
      "percentage": overall_pct,
    },
  }
  return {
    "self_assessment_summary": summary
  }
