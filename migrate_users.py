from firebase_admin import credentials, firestore, initialize_app
from datetime import datetime

cred = credentials.Certificate("serviceAccountKey.json")
initialize_app(cred)
db = firestore.client()

legacy_users = db.collection("users").stream()

for doc in legacy_users:
    data = doc.to_dict()

    role = data.get("role")
    if role not in ["ADMIN", "AUDITOR", "CUSTOMER"]:
        print(f"❌ Invalid role for user {doc.id}, skipping")
        continue

    new_user = {
        "email": data["email"],
        "role": role,
        "org_id": None,
        "created_at": datetime.utcnow(),
        "is_disabled": False
    }

    # overwrite legacy user document safely
    db.collection("users").document(doc.id).set(new_user)

print("✅ User migration completed (passwords removed).")

