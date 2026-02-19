/**
 * Seed canonical audit_responses data for Phase-3 dry-run
 * Creates:
 * audit_responses/{auditId}
 *   └─ blocks/{blockId}
 *        └─ questions/{question_id}
 */

const admin = require("firebase-admin")
const path = require("path")

/* ---------------- INIT ---------------- */

function initFirestore() {
  if (!admin.apps.length) {
    const saPath = path.resolve(__dirname, "../../serviceAccountKey.json")
    const serviceAccount = require(saPath)

    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount)
    })
  }
  return admin.firestore()
}

/* ---------------- ROOT DOC ---------------- */

async function ensureAuditRoot(db, auditId) {
  const ref = db.collection("audit_responses").doc(auditId)

  await ref.set(
    {
      audit_id: auditId,
      status: "IN_PROGRESS",
      created_at: admin.firestore.Timestamp.now(),
      updated_at: admin.firestore.Timestamp.now()
    },
    { merge: true }
  )
}

/* ---------------- QUESTION UPSERT ---------------- */

async function upsertQuestion(db, auditId, blockId, q) {
  const ref = db
    .collection("audit_responses")
    .doc(auditId)
    .collection("blocks")
    .doc(blockId)
    .collection("questions")
    .doc(q.question_id)

  const payload = {
    question_id: q.question_id,
    category: q.category,
    subcategory: q.subcategory,

    status: q.status,                // IN_PLACE / PARTIAL / NOT_IN_PLACE / NOT_RELEVANT
    user_score: q.user_score,         // 5 / 3 / 0
    auditor_score: q.auditor_score,   // 5 / 3 / 0 / null
    final_score: q.final_score,       // resolved score

    updated_by: q.updated_by,         // CUSTOMER | AUDITOR
    updated_at: admin.firestore.Timestamp.now()
  }

  await ref.set(payload, { merge: true })
}

/* ---------------- MAIN ---------------- */

async function main() {
  const db = initFirestore()

  const auditId = "TEST_AUDIT"
  const blockId = "BLOCK_A"

  // 🔴 CRITICAL: create parent document
  await ensureAuditRoot(db, auditId)

  const questions = [
    {
      question_id: "A-1-1",
      category: "A",
      subcategory: "A1",
      status: "IN_PLACE",
      user_score: 5,
      auditor_score: 3,
      final_score: 3,
      updated_by: "AUDITOR"
    },
    {
      question_id: "A-1-2",
      category: "A",
      subcategory: "A1",
      status: "PARTIAL",
      user_score: 3,
      auditor_score: 3,
      final_score: 3,
      updated_by: "AUDITOR"
    },
    {
      question_id: "A-1-3",
      category: "A",
      subcategory: "A1",
      status: "NOT_IN_PLACE",
      user_score: 0,
      auditor_score: null,
      final_score: 0,
      updated_by: "AUDITOR"
    }
  ]

  for (const q of questions) {
    await upsertQuestion(db, auditId, blockId, q)
  }

  console.log("✅ audit_responses seeded successfully")
}

/* ---------------- RUN ---------------- */

main()
  .then(() => process.exit(0))
  .catch(err => {
    console.error("❌ Seeding failed:", err)
    process.exit(1)
  })
