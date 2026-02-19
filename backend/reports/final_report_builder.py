from typing import Dict, List
from firebase_admin import firestore
from jinja2 import Environment, select_autoescape
from backend.reports.initial_report_builder import (
    _get_org_and_block,
    _allowed_subcategories,
    _fetch_allowed_questions,
    _fetch_row_components,
)

env = Environment(autoescape=select_autoescape(["html"]))

SECTION_TEMPLATE = """
<html>
<head>
  <meta charset="utf-8">
  <title>FINAL REPORT</title>
  <style>
    body { font-family: system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif; color:#111827; }
    .page { page-break-after: always; padding: 16mm; }
    .page-header { display:flex; justify-content:space-between; align-items:center; margin-bottom: 8mm; }
    .title { font-weight:700; font-size: 16pt; }
    .meta { font-size:10pt; color:#6b7280; }
    .section-name { background:#111827; color:#fff; padding:3mm 2mm; font-weight:700; border-radius:4px; margin-bottom:4mm; }
    table { border-collapse: collapse; width: 100%; }
    th, td { border:1px solid #e5e7eb; padding: 2mm; font-size:10pt; vertical-align: top; }
    th { background:#f8fafc; text-align:left; }
    .summary { margin-top:6mm; display:flex; gap:10mm; font-weight:700; }
  </style>
</head>
<body>
  <div class="page">
    <div class="page-header">
      <div class="title">FINAL REPORT</div>
      <div class="meta">Block: {{ block_name }}</div>
    </div>
    <div class="section-name">SECTION: {{ section_name }}</div>
    <table>
      <thead>
        <tr>
          <th style="width:50%;">Question</th>
          <th style="width:10%;">Target</th>
          <th style="width:15%;">Organization</th>
          <th style="width:10%;">Auditor</th>
          <th style="width:15%;">Auditor Observation</th>
        </tr>
      </thead>
      <tbody>
      {% for r in rows %}
        <tr>
          <td>{{ r.question }}</td>
          <td style="text-align:right;">{{ "%.1f"|format(r.target) }}</td>
          <td style="text-align:right;">{{ "%.1f"|format(r.organization) }}</td>
          <td style="text-align:right;">{{ "%.1f"|format(r.auditor) }}</td>
          <td>{{ r.auditor_observation }}</td>
        </tr>
      {% endfor %}
      </tbody>
    </table>
    <div class="summary">
      <div>Closed: {{ summary.closed }}</div>
      <div>Gaps: {{ summary.gaps }}</div>
      <div>Total: {{ summary.total }}</div>
    </div>
  </div>
</body>
</html>
"""

def build_final_report(audit_id: str, block_id: str) -> Dict[str, List[str]]:
    db = firestore.client()
    org, block_name = _get_org_and_block(db, audit_id, block_id)
    org_id = (org.get("model") or {}).get("org_id") or org.get("id") or org.get("org_id") or ""
    if not org_id:
        snap = db.collection("audits").document(audit_id).get()
        org_id = (snap.to_dict() or {}).get("org_id") or ""
    if not org_id:
        raise ValueError("Assignment data inconsistent: org_id not linked")
    allowed_subs = _allowed_subcategories(db, org_id, block_id)
    questions = _fetch_allowed_questions(db, allowed_subs)
    if not questions:
        raise ValueError("No questions for assigned subcategories")
    rows: List[Dict] = []
    for q in questions:
        rows.append(_fetch_row_components(db, audit_id, block_id, q))
    if not rows:
        raise ValueError("No rows available for final report")
    sections_order: List[str] = []
    sections_map: Dict[str, List[Dict]] = {}
    for r in rows:
        s = str(r.get("section") or "")
        if s not in sections_map:
            sections_map[s] = []
            sections_order.append(s)
        sections_map[s].append(r)
    pages: List[str] = []
    tpl = env.from_string(SECTION_TEMPLATE)
    for s in sections_order:
        rs = sections_map[s]
        closed = 0
        gaps = 0
        for r in rs:
            a = float(r.get("auditor") or 0.0)
            if a == 5.0:
                closed += 1
            elif a in (3.0, 0.0):
                gaps += 1
        ctx = {
            "block_name": block_name,
            "section_name": s,
            "rows": rs,
            "summary": {
                "closed": int(closed),
                "gaps": int(gaps),
                "total": int(len(rs)),
            },
        }
        html = tpl.render(**ctx)
        pages.append(html)
    return {"final_report_pages": pages}
