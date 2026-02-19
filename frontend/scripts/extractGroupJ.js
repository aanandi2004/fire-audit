import XLSX from 'xlsx';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const INPUT_FILE = path.join(__dirname, '../../group -J Hazardous.xlsx');
const SHEET_MAPPING = {
  'General': 'groupJ-J-GEN.json',
  'No sub division': 'groupJ-J-1.json'
};

function extractQuestions(sheet) {
  const questions = [];
  const data = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' });
  
  // Header is at index 4 (Row 5)
  const headerRowIndex = 4;
  const rows = data.slice(headerRowIndex + 1);

  let currentBlock = '';

  rows.forEach((row) => {
    // Columns based on inspection:
    // 0: Sl.No.
    // 1: NBC Section / Clause No.
    // 2: Requirement as per NBC
    // 3: Status
    // 4: Auditor Comment
    
    const slNo = row[0];
    const clause = row[1] ? String(row[1]).trim() : '';
    const requirement = row[2] ? String(row[2]).trim() : '';

    // Skip empty rows
    if (!requirement && !clause && !slNo) return;

    // Detect block headers
    // If we have a requirement but no slNo and no clause, it's likely a block header
    // But in "General" sheet row 5: ['', 'Building Materials', '', '', ''] -> This looks like a block header in col 1?
    // Let's re-examine the inspection output for General sheet:
    // Row 5: [ '', 'Building Materials', '', '', '' ]
    // Wait, previous logic was: if (requirement && !clause && !slNo) -> Block
    // Here 'Building Materials' is in col 1 (Clause No column index).
    // Let's look at other sheets.
    // In "General", Row 6: [ 1, '', 'Height (in meters) ', '', '' ]
    
    // Let's stick to the logic that worked for others, but be flexible.
    // If row[1] has text and row[2] is empty, it might be a block header if it's not a clause.
    // However, usually block headers are in the 'Requirement' column or explicitly separated.
    
    // Let's look at General Row 5 again: [ '', 'Building Materials', '', '', '' ]
    // It has text in col 1.
    // Row 6: [ 1, '', 'Height...', ... ] -> SlNo=1, Clause='', Req='Height...'
    
    // If slNo is empty and requirement is empty but clause is not empty?
    // That seems odd for a clause.
    // Let's assume if slNo is empty and (clause has text OR requirement has text), we check if it's a header.
    
    // Standard logic from previous scripts:
    // If (requirement && !slNo && !clause) -> Block
    
    // For Row 5: SlNo='', Clause='Building Materials', Req=''
    // This doesn't fit standard logic.
    // Let's modify logic to catch this case:
    if (!slNo && clause && !requirement) {
        currentBlock = clause;
        return;
    }
    
    // Note: Removed the check that treated (!slNo && requirement && !clause) as a block header.
    // Rows like "Electrical pump", "Diesel pump" in J-GEN have this structure and should be questions/items.

    // Normal question row
    if (requirement) {
      const lowerReq = requirement.toLowerCase();
      if (lowerReq === 'prepared by' || lowerReq === 'auditor') return;

      // Generate ID
      // If we are processing J-GEN, maybe J-GEN-1, etc.
      // But we don't have the subdivision prefix here easily, so let's just use SlNo if available, or generate one.
      // For consistency with other groups, we often just leave ID as is or let the frontend handle it, 
      // but the frontend expects 'id' in the JSON.
      // Let's use a simple counter if SlNo is missing or just use SlNo.
      
      questions.push({
        id: slNo, // We'll clean this up if needed or just pass it through
        block: currentBlock,
        clause: clause,
        requirement: requirement
      });
    }
  });

  return questions;
}

function main() {
  console.log(`Reading file: ${INPUT_FILE}`);
  const workbook = XLSX.readFile(INPUT_FILE);

  Object.entries(SHEET_MAPPING).forEach(([sheetName, jsonFileName]) => {
    const sheet = workbook.Sheets[sheetName];
    if (!sheet) {
      console.error(`Sheet "${sheetName}" not found!`);
      return;
    }

    const questions = extractQuestions(sheet);
    const outputPath = path.join(__dirname, jsonFileName);
    
    fs.writeFileSync(outputPath, JSON.stringify(questions, null, 2));
    console.log(`Created ${jsonFileName} with ${questions.length} questions.`);
  });
}

main();
