def build_preview_chart_context(audit_data):
    blocks_out = []

    for block in audit_data["blocks"]:
        sections_map = {}
        status_count = {
            "in_place": 0,
            "partial": 0,
            "not_in_place": 0,
            "not_relevant": 0,
        }

        for q in block["questions"]:
            section = q.get("block") or "General"
            if section not in sections_map:
                sections_map[section] = {"earned": 0, "max": 0}

            score = {
                "in_place": 5,
                "partial": 3,
                "not_in_place": 0,
                "not_relevant": 5,
            }.get(q["status"], 0)

            sections_map[section]["earned"] += score
            sections_map[section]["max"] += 5
            status_count[q["status"]] += 1

        sections = []
        total_earned = 0
        total_max = 0

        for name, s in sections_map.items():
            pct = round((s["earned"] / s["max"]) * 100) if s["max"] else 0
            sections.append({ "name": name, "percent": pct })
            total_earned += s["earned"]
            total_max += s["max"]

        blocks_out.append({
            "name": block["name"],
            "overall_percent": round((total_earned / total_max) * 100) if total_max else 0,
            "sections": sorted(sections, key=lambda x: x["name"]),
            "status": status_count,
        })

    return blocks_out
