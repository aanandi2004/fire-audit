from pathlib import Path
import sys

try:
    import firebase_admin
    from firebase_admin import credentials, auth, firestore
except Exception as e:
    print(f"[seed_admin] Failed to import firebase_admin: {e}")
    sys.exit(1)

BASE_DIR = Path(__file__).resolve().parents[1]
PROJECT_DIR = Path(__file__).resolve().parents[2]
SA_PATH = PROJECT_DIR / "serviceAccountKey.json"

def ensure_initialized():
    if not firebase_admin._apps:
        try:
            cred = credentials.Certificate(str(SA_PATH))
            firebase_admin.initialize_app(cred)
        except Exception as e:
            print(f"[seed_admin] Failed to initialize Firebase Admin: {e}")
            sys.exit(1)

def upsert_admin(email: str, password: str, username: str = "QA-Admin"):
    ensure_initialized()
    uid = None
    try:
        user = auth.get_user_by_email(email)
        uid = user.uid
        created = False
        print(f"[seed_admin] Existing admin user found: {email} uid={uid}")
    except Exception:
        try:
            user = auth.create_user(email=email, password=password, display_name=username)
            uid = user.uid
            created = True
            print(f"[seed_admin] Created admin user: {email} uid={uid}")
        except Exception as e:
            print(f"[seed_admin] Failed to create admin user: {e}")
            sys.exit(1)
    # Upsert Firestore profile
    try:
        db = firestore.client()
        db.collection("users").document(uid).set({
            "uid": uid,
            "email": email,
            "role": "ADMIN",
            "org_id": None,
            "is_active": True,
        }, merge=True)
        print(f"[seed_admin] Firestore profile upserted for uid={uid} role=ADMIN")
    except Exception as e:
        print(f"[seed_admin] Failed to write Firestore user profile: {e}")
        sys.exit(1)
    return uid

if __name__ == "__main__":
    # Default credentials for QA run; change if needed
    ADMIN_EMAIL = "qa.admin@example.com"
    ADMIN_PASSWORD = "QaAdmin#2026"
    uid = upsert_admin(ADMIN_EMAIL, ADMIN_PASSWORD)
    print(uid)
