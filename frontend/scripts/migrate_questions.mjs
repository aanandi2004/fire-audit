import { db } from '../src/firebase.js'
import { RECORD_GROUPS } from '../src/config/groups.js'
import { getQuestions } from '../src/config/questionBanks.js'
import { doc, setDoc, serverTimestamp, collection, getCountFromServer } from 'firebase/firestore'

async function expectedFrontendCount() {
  let total = 0
  for (const group of RECORD_GROUPS) {
    for (const sub of group.subdivisions) {
      const items = getQuestions(group.id, sub.id)
      total += items.length
    }
  }
  return total
}

async function run() {
  try {
    const expected = await expectedFrontendCount()
    console.log('[INFO] Expected frontend question count:', expected)
    const { upsertQuestionsMaster } = await import('../src/services/firestoreService.js')
    await upsertQuestionsMaster()
    const cntSnap = await getCountFromServer(collection(db, 'questions'))
    const count = cntSnap.data().count || 0
    console.log('[RESULT] Firestore questions count:', count)
    if (count === 0) {
      console.error('[ERROR] No question documents found in Firestore after upsertQuestionsMaster execution.')
      console.error('[HINT] Check Firestore security rules for /questions writes and ensure an ADMIN session triggers the upsert.')
      process.exit(1)
    }
    console.log('[CHECK] Frontend vs Firestore count:',
      count === expected ? 'MATCH' : `MISMATCH (expected ${expected}, got ${count})`)
    // Sample 5 documents (IDs only via a second query would require web getDocs; skip heavy listing here)
    console.log('[DONE] Migration upsert executed successfully.')
    process.exit(0)
  } catch (e) {
    console.error('[FAIL] Migration script error:', e?.message || String(e))
    process.exit(1)
  }
}

await run()
