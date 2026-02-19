from firebase_admin import credentials, firestore, initialize_app

cred = credentials.Certificate("serviceAccountKey.json")
initialize_app(cred)
db = firestore.client()

# 👇 YOU decide which UID is which
ADMIN_UID = "693OX04d2Kf3cZHIHSBbGZrv5bl1"
CUSTOMER_UID = "vA7JQCBoSwaSMlmYW1oFeoSA5p62"

db.collection("users").document(ADMIN_UID).update({
    "role": "ADMIN"
})

db.collection("users").document(CUSTOMER_UID).update({
    "role": "CUSTOMER"
})

print("✅ Roles normalized.")
