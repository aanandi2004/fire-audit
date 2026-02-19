# Audit Lifecycle Contract

States:
DRAFT → IN_PROGRESS → COMPLETED

Rules:
1. Only ADMIN can create audits
2. Only assigned AUDITOR can edit audits
3. Once status = COMPLETED, audit is immutable
4. Re-audit = new audit document (never overwrite)
5. Reports are generated only from COMPLETED audits
6. Version increments on each re-audit
