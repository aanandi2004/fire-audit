def _score(status):
    s = (status or "").strip().lower()
    if s in {"in place", "in_place"}:
        return 5.0, True
    if s in {"partially in place", "partial", "partially_in_place"}:
        return 3.0, True
    if s in {"not in place", "not_in_place"}:
        return 0.0, True
    if s in {"not applicable", "not_applicable"}:
        return 5.0, False
    return 0.0, True


def process_audit(data):
    sections = data.get("sections", []) or []
    results = []
    total_applicable = 0
    total_score = 0.0
    for sec in sections:
        name = sec.get("name") or sec.get("id") or ""
        questions = sec.get("questions", []) or []
        applicable = 0
        score_sum = 0.0
        for q in questions:
            status = q.get("status")
            val, counts = _score(status)
            score_sum += val
            if counts:
                applicable += 1
        if applicable == 0:
            percentage = 0
            skip = True
        else:
            percentage = round((score_sum / (applicable * 5.0)) * 100, 1)
            skip = False
        results.append(
            {
                "name": name,
                "percentage": percentage,
                "total_questions": len(questions),
                "applicable_questions": applicable,
                "skip": skip,
                "questions": questions,
            }
        )
        total_applicable += applicable
        total_score += score_sum
    if total_applicable == 0:
        grand = 0
    else:
        grand = round((total_score / (total_applicable * 5.0)) * 100, 1)
    chart_sections = [{"name": r["name"], "percentage": r["percentage"]} for r in results if not r["skip"]]
    return {"section_results": results, "grand_total_percentage": grand, "chart_sections": chart_sections}
