def build_self_assessment(org_id: str) -> dict:
    return {
        "organization": {
            "name": "Demo Organization",
            "address": "Bangalore"
        },
        "block_name": "Block A",
        "building": {
            "occupancy": "Industrial",
            "floors": 5,
            "basements": 1,
            "area": 12000
        },
        "assessment": {
            "rows": [
                {
                    "section": "Fire Extinguishers",
                    "requirement": "Provided at all locations",
                    "score": 5,
                    "status": "In Place"
                },
                {
                    "section": "Fire Alarm",
                    "requirement": "Audible alarms",
                    "score": 3,
                    "status": "Partial"
                }
            ]
        },
        "summary": {
            "total_percentage": 82,
            "sections": [
                {"name": "Fire Extinguishers", "percentage": 90},
                {"name": "Fire Alarm", "percentage": 75}
            ]
        }
    }
