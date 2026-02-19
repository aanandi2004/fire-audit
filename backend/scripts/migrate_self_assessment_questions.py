import os
import json
from typing import Dict, Tuple
from firebase_admin import credentials, firestore, initialize_app

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
FRONTEND_SCRIPTS_DIR = os.path.join(os.path.dirname(BASE_DIR), "frontend", "scripts")

def subcategory_from_id(qid: str) -> Tuple[str, str]:
    parts = qid.split("-")
    cat = (parts[0] if parts else "").strip()
    sub = (parts[1] if len(parts) > 1 else "").strip()
    if sub.upper() == "GEN":
        return cat, "GEN"
    return cat, f"{cat}{sub}"

def load_questions() -> Dict[str, list]:
    data = {}
    for name in os.listdir(FRONTEND_SCRIPTS_DIR):
        if not name.endswith(".json"):
            continue
        path = os.path.join(FRONTEND_SCRIPTS_DIR, name)
        if not name.startswith("group"):
            continue
        parts = name.split("-")
        if len(parts) < 3:
            continue
        grp = parts[0][-1:].upper()
        if grp not in list("ABCDEFGHJ"):
            continue
        with open(path, "r", encoding="utf-8") as f:
            items = json.load(f)
            data[name] = items
    return data

def main():
    cred = credentials.Certificate(os.path.join(os.path.dirname(BASE_DIR), "serviceAccountKey.json"))
    initialize_app(cred)
    db = firestore.client()

    sources = load_questions()
    total_expected = sum(len(v) for v in sources.values())
    counters: Dict[Tuple[str, str], int] = {}
    written = 0

    # cleanup invalid docs
    # optional cleanup removed for speed; focus on upsert + verification

    for file_name, items in sources.items():
        for item in items:
            qid = str(item.get("id") or "").strip()
            req = str(item.get("requirement") or "").strip()
            if not qid or not req:
                continue
            cat, subcat = subcategory_from_id(qid)
            key = (cat, subcat)
            counters[key] = counters.get(key, 0) + 1
            order = counters[key]
            ref = db.collection("self_assessment_questions").document(qid)
            snap = ref.get()
            exists = snap.exists
            data = {
                "question_id": qid,
                "category": cat,
                "subcategory": subcat,
                "question_text": req,
                "target_score": 5,
                "order": order,
                "is_active": True,
                "updated_at": firestore.SERVER_TIMESTAMP,
            }
            if not exists:
                data["created_at"] = firestore.SERVER_TIMESTAMP
            ref.set(data, merge=True)
            written += 0 if exists else 1

    cnt = sum(1 for _ in db.collection("self_assessment_questions").stream())
    valid_cnt = 0
    for d in db.collection("self_assessment_questions").stream():
        did = d.id
        if did and did[0] in list("ABCDEFGHJ") and "-" in did:
            valid_cnt += 1
    print(f"[RESULT] Expected frontend question count: {total_expected}")
    print(f"[RESULT] Firestore self_assessment_questions count: {cnt}")
    print(f"[RESULT] Valid question id count: {valid_cnt}")
    print("[SAMPLE] Three documents:")
    printed = 0
    for d in db.collection("self_assessment_questions").stream():
        if printed >= 3:
            break
        did = d.id
        if did and did[0] in list("ABCDEFGHJ") and "-" in did:
            x = d.to_dict()
            print({"id": d.id, "category": x.get("category"), "subcategory": x.get("subcategory"), "question_text": x.get("question_text")})
            printed += 1
    if cnt == 0:
        raise RuntimeError("No documents written to self_assessment_questions")

if __name__ == "__main__":
    main()
