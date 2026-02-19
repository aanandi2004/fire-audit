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
    "Residential – Group A": "A-RES",
    "Lodging – Group A": "A-LOD",
    "Hospital – Group C": "C-HOS",
    "Assembly – Group D": "D-ASM",
    "Business – Group E": "E-BUS",
    "Mercantile – Group F": "F-MER",
    "Industrial – Group G": "G-IND",
    "General – Group H": "H-GEN",
    "Special – Group J": "J-SPL",
}

def init():
    cred = credentials.Certificate(SERVICE_ACCOUNT_PATH)
    initialize_app(cred)
    return firestore.client()

def run():
    db = init()
    col = db.collection("assignments")
    disabled = []
    for doc in col.stream():
        data = doc.to_dict() or {}
        group = data.get("group")
        subid = data.get("subdivision_id")
        occ_label = data.get("occupancy_group_label") or data.get("occupancy_group")
        sub_label = data.get("subdivision_label") or data.get("subdivision")
        valid = bool(group and subid)
        if not valid:
            if (occ_label not in GROUP_MAP) or (sub_label not in SUBDIVISION_MAP):
                doc.reference.update({"is_active": False})
                disabled.append(doc.id)
    print({"disabled": disabled})

if __name__ == "__main__":
    run()
