from firebase_admin import storage
from datetime import timedelta

def upload_pdf_and_url(path: str, data: bytes) -> str:
    bucket = storage.bucket()
    blob = bucket.blob(path)

    blob.upload_from_string(
        data,
        content_type="application/pdf"
    )

    # Signed URL ONLY — no public fallback
    url = blob.generate_signed_url(
        expiration=timedelta(days=7),
        method="GET"
    )

    return url
