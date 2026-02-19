
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Mock normalize function from utils/questionUtils.js
function normalizeGroupAQuestions(items) {
  const result = []
  for (const item of items) {
    const requirement =
      item.requirement !== undefined && item.requirement !== null
        ? String(item.requirement).trim()
        : ''
    // Exclude "Requirement as per NBC" header and empty requirements
    if (
      !requirement ||
      requirement.toLowerCase() === 'requirement as per nbc'
    ) {
      continue
    }
    const block =
      item.block !== undefined && item.block !== null
        ? String(item.block).trim()
        : ''
    const clause =
      item.clause !== undefined && item.clause !== null
        ? String(item.clause).trim()
        : ''
    const base = {
      id: item.id,
      block,
      clause,
      requirement,
    }
    const lowerBlock = block.toLowerCase()
    const isLongComment =
      item.longComment ||
      lowerBlock.includes('additional observations') ||
      lowerBlock.includes('aditional observations')
    if (isLongComment) {
      result.push({ ...base, longComment: true })
    } else {
      result.push(base)
    }
  }
  return result
}

// Read JSON file
const jsonPath = path.join(__dirname, 'scripts', 'groupD-D-GEN.json');
console.log(`Reading from ${jsonPath}`);

try {
    const rawData = fs.readFileSync(jsonPath, 'utf-8');
    const items = JSON.parse(rawData);
    console.log(`Loaded ${items.length} items from JSON.`);
    
    const normalized = normalizeGroupAQuestions(items);
    console.log(`Normalized ${normalized.length} items.`);
    
    if (normalized.length > 0) {
        console.log("First item:", normalized[0]);
    } else {
        console.log("No items after normalization!");
    }

} catch (err) {
    console.error("Error:", err.message);
}
