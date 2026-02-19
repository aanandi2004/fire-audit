// Temporary helper script to inspect Group A Residential workbook structure
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import xlsx from 'xlsx'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const workbookPath = path.join(__dirname, '..', '..', 'Group A - Residential  (1).xlsx')
const workbook = xlsx.readFile(workbookPath)

const SHEET_MAP = {
  'A-1 Lodging & Rooming houses': 'A-1',
  'A-2 One or two family private d': 'A-2',
  'A-3 Dormitories (1)': 'A-3',
  'A-4 Apartment houses': 'A-4',
  'A- 5  Hotels': 'A-5',
}

function extractQuestions(sheetName, subdivisionId) {
  const sheet = workbook.Sheets[sheetName]
  if (!sheet) {
    console.error('Missing sheet', sheetName)
    return []
  }
  const rows = xlsx.utils.sheet_to_json(sheet, { header: 1, defval: '' })
  let currentBlock = ''
  let index = 0
  const items = []

  for (const row of rows) {
    const slNo = row[0]
    const possibleBlock = row[1]
    const clause = row[1]
    const requirement = row[2]

    const isBlockHeader =
      (!slNo || `${slNo}`.trim() === '') &&
      typeof possibleBlock === 'string' &&
      possibleBlock.trim() !== '' &&
      (!requirement || `${requirement}`.trim() === '')

    if (isBlockHeader) {
      currentBlock = possibleBlock.trim()
      continue
    }

    const hasSlNo = slNo !== undefined && `${slNo}`.toString().trim() !== ''
    const requirementText =
      requirement !== undefined && requirement !== null
        ? `${requirement}`.toString().trim()
        : ''

    if (!hasSlNo || !requirementText) {
      continue
    }

    index += 1
    const clauseText =
      clause !== undefined && clause !== null ? `${clause}`.toString().trim() : ''

    const question = {
      id: `${subdivisionId}-${index}`,
      block: currentBlock,
      clause: clauseText,
      requirement: requirementText,
    }

    if (currentBlock && currentBlock.toLowerCase().includes('additional observations')) {
      question.longComment = true
    }

    items.push(question)
  }

  return items
}

for (const [sheetName, subdivisionId] of Object.entries(SHEET_MAP)) {
  const items = extractQuestions(sheetName, subdivisionId)
  const outPath = path.join(__dirname, `groupA-${subdivisionId}.json`)
  fs.writeFileSync(outPath, JSON.stringify(items, null, 2))
  console.log(`${subdivisionId}: wrote ${items.length} questions to ${outPath}`)
}
