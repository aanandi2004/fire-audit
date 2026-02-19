import json
import sys
import urllib.request

API_KEY = "AIzaSyD-Y1iEywNJ9z1fZCftXUjpxrA1XXj8fsk"
ENDPOINT = f"https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key={API_KEY}"

def login(email: str, password: str) -> str:
    payload = {
        "email": email,
        "password": password,
        "returnSecureToken": True
    }
    data = json.dumps(payload).encode("utf-8")
    req = urllib.request.Request(ENDPOINT, data=data, headers={"Content-Type": "application/json"}, method="POST")
    try:
        with urllib.request.urlopen(req, timeout=15) as resp:
            text = resp.read().decode("utf-8")
            obj = json.loads(text)
            token = obj.get("idToken") or ""
            if not token:
                print("[login_rest] Missing idToken in response", file=sys.stderr)
                print(text)
                sys.exit(2)
            return token
    except Exception as e:
        print(f"[login_rest] Login failed: {e}", file=sys.stderr)
        sys.exit(3)

if __name__ == "__main__":
    email = "qa.admin@example.com"
    password = "QaAdmin#2026"
    token = login(email, password)
    # Print raw token for piping into curl
    print(token)
