import os
from firebase_admin import credentials, initialize_app, firestore

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
ROOT_DIR = os.path.dirname(BASE_DIR)
SERVICE_ACCOUNT_PATH = os.path.join(ROOT_DIR, "serviceAccountKey.json")

GROUP_MAP = {
    "Group A – Residential": "A",
    "Group B – Educational": "B",
    "Group C – Institutional": "C",
    "Group D – Assembly": "D",
    "Group E – Business": "E",
    "Group F – Mercantile": "F",
    "Group G – Industrial": "G",
    "Group H – Storage": "H",
    "Group I – Miscellaneous": "I",
    "Group J – Hazardous": "J",
}

SUBDIVISION_MAP = {
    # Group A
    "A-1 Lodging and rooming houses": "A-1",
    "A-2 One or two family private dwellings": "A-2",
    "A-3 Dormitories": "A-3",
    "A-4 Apartment houses": "A-4",
    "A-5 Hotels": "A-5",
    "A-6 Starred hotels": "A-6",
    "General – Group A": "A-GEN",
    # Group B
    "B-1 Schools up to senior secondary level": "B-1",
    "B-2 All others / training institutions": "B-2",
    "General – Group B": "B-GEN",
    # Group C
    "C-2 Custodial institutions": "C-2",
    "C-3 Penal and mental institutions": "C-3",
    "General – Group C": "C-GEN",
    # Group D
    "D-1 Theatres or halls over 1000 persons": "D-1",
    "D-2 Theatres or halls up to 1000 persons": "D-2",
    "D-3 Halls without permanent stage ≥300 persons": "D-3",
    "D-4 Enclosed assembly spaces": "D-4",
    "D-5 Other assembly structures at ground level": "D-5",
    "D-6 Mixed assembly and mercantile": "D-6",
    "D-7 Underground and elevated mass rapid systems": "D-7",
    "General – Group D": "D-GEN",
    # Group E
    "E-1 Offices, banks, professional establishments": "E-1",
    "E-2 Laboratories, clinics, libraries, test houses": "E-2",
    "E-3 Data centres, IT parks, call centres": "E-3",
    "E-4 Telephone exchanges": "E-4",
    "E-5 Broadcasting, TV stations, ATC towers": "E-5",
    "General – Group E": "E-GEN",
    # Group F
    "F-1 Shops and markets up to 500 m²": "F-1",
    "F-2 Shops and markets over 500 m²": "F-2",
    "F-3 Underground shopping centres": "F-3",
    "General – Group F": "F-GEN",
    # Group G
    "G-1 Low hazard industries": "G-1",
    "G-2 Moderate hazard industries": "G-2",
    "G-3 High hazard industries": "G-3",
    "General – Group G": "G-GEN",
    # Group H
    "H-1 Storage occupancies": "H-1",
    "General – Group H": "H-GEN",
    # Group J
    "J-1 Hazardous occupancies": "J-1",
    "General – Group J": "J-GEN",
}

def init():
    if not os.path.exists(SERVICE_ACCOUNT_PATH):
        raise RuntimeError("serviceAccountKey.json not found")
    cred = credentials.Certificate(SERVICE_ACCOUNT_PATH)
    initialize_app(cred)
    return firestore.client()

def run():
    db = init()
    col = db.collection("assignments")
    updated = 0
    failed = []
    for doc in col.stream():
        data = doc.to_dict() or {}
        needs_group = not data.get("group")
        needs_sub = not data.get("subdivision_id")
        if not (needs_group or needs_sub):
            continue
        occ_label = data.get("occupancy_group_label") or data.get("occupancy_group")
        sub_label = data.get("subdivision_label") or data.get("subdivision")
        if occ_label not in GROUP_MAP or sub_label not in SUBDIVISION_MAP:
            failed.append(doc.id)
            continue
        payload = {
            "group": GROUP_MAP[occ_label],
            "subdivision_id": SUBDIVISION_MAP[sub_label],
            "occupancy_group_label": occ_label,
            "subdivision_label": sub_label,
            "updated_at": firestore.SERVER_TIMESTAMP,
            "updated_by": "admin-script",
        }
        doc.reference.set(payload, merge=True)
        updated += 1
    print({"updated": updated, "failed": failed})

if __name__ == "__main__":
    run()
