// Prints question ID ranges for Categories A–F by subdivision
// Usage: node scripts/analyze_ranges.js
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const base = path.join(__dirname)

const sets = {
  A: {
    'A-1': 'groupA-A-1.json',
    'A-2': 'groupA-A-2.json',
    'A-3': 'groupA-A-3.json',
    'A-4': 'groupA-A-4.json',
    'A-5': 'groupA-A-5.json',
    'A-6': 'groupA-A-6.json',
    'A-GEN': 'groupA-A-GEN.json'
  },
  B: {
    'B-1': 'groupB-B-1.json',
    'B-2': 'groupB-B-2.json',
    'B-GEN': 'groupB-B-GEN.json'
  },
  C: {
    'C-2': 'groupC-C-2.json',
    'C-3': 'groupC-C-3.json',
    'C-GEN': 'groupC-C-GEN.json'
  },
  D: {
    'D-6': 'groupD-D-6.json',
    'D-GEN': 'groupD-D-GEN.json'
  },
  E: {
    'E-1': 'groupE-E-1.json',
    'E-2': 'groupE-E-2.json',
    'E-3': 'groupE-E-3.json',
    'E-4': 'groupE-E-4.json',
    'E-5': 'groupE-E-5.json',
    'E-GEN': 'groupE-E-GEN.json'
  },
  F: {
    'F-1': 'groupF-F-1.json',
    'F-2': 'groupF-F-2.json',
    'F-3': 'groupF-F-3.json',
    'F-GEN': 'groupF-F-GEN.json'
  }
}

function summarize(file) {
  try {
    const items = JSON.parse(fs.readFileSync(path.join(base, file), 'utf8'))
    const ids = (items || []).map(x => String(x.id || '')).filter(Boolean)
    const nums = ids
      .map(id => {
        const m = id.match(/(\d+)$/)
        return m ? parseInt(m[1], 10) : NaN
      })
      .filter(n => !Number.isNaN(n))
    const min = nums.length ? Math.min(...nums) : null
    const max = nums.length ? Math.max(...nums) : null
    return { count: ids.length, min, max, sample: ids.slice(0, 3) }
  } catch (e) {
    return { error: e.message }
  }
}

const out = {}
for (const [cat, subs] of Object.entries(sets)) {
  out[cat] = {}
  for (const [sub, file] of Object.entries(subs)) {
    out[cat][sub] = summarize(file)
  }
}
console.log(JSON.stringify(out, null, 2))
