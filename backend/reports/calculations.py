import math

STATUS_SCORE = {
  "in_place": 5,
  "partial": 3,
  "not_in_place": 0,
  "not_relevant": 5,
}

STATUS_LABEL = {
  "in_place": "In Place",
  "partial": "Partially In Place",
  "not_in_place": "Not In Place",
  "not_relevant": "Not Relevant",
}

def score_status(status: str) -> int:
  return STATUS_SCORE.get(status, 0)

def label_status(status: str) -> str:
  return STATUS_LABEL.get(status, "")

def section_max(total_questions: int) -> int:
  return total_questions * 5

def section_earned(statuses):
  return sum(score_status(s) for s in statuses)

def percent_compliance(earned: int, max_score: int) -> int:
    if max_score <= 0:
        return 0
    return math.floor((earned / max_score) * 100)

def calculate_scores(normalized: dict) -> dict:
    blocks = normalized.get("blocks", [])
    result_blocks = []
    for b in blocks:
        out_sections = []
        for s in b.get("sections", []):
            statuses = [r.get("status") for r in s.get("rows", [])]
            earned = section_earned(statuses)
            max_s = section_max(len(statuses))
            percent = percent_compliance(earned, max_s)
            out_sections.append({
                "name": s.get("name"),
                "earned": earned,
                "max": max_s,
                "percentage": percent,
            })
        result_blocks.append({
            "name": b.get("name"),
            "sections": out_sections,
        })
    return {"blocks": result_blocks}

def build_chart_data(scores: dict) -> list:
    # Flatten per-section percentages across blocks for chart
    sections = []
    for b in scores.get("blocks", []):
        for s in b.get("sections", []):
            sections.append({"name": s.get("name"), "percentage": s.get("percentage", 0)})
    return sections
