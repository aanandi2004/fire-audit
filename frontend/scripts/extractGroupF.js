
import XLSX from 'xlsx';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const FILE_PATH = '/Users/aanandiaarya/Documents/fire audit frontend/Group -F mercant.xlsx';

const SHEET_MAPPING = {
  'General': 'groupF-F-GEN.json',
  'F-1 Shops, Stores, dept stores': 'groupF-F-1.json',
  'F-2 stops, stores, dept stores': 'groupF-F-2.json',
  'F-3 Underground shopping centre': 'groupF-F-3.json'
};

function extractQuestions(sheet, headerRowIndex) {
  const jsonData = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' });
  
  // Slice from the row AFTER the header
  const rows = jsonData.slice(headerRowIndex + 1);
  
  const questions = [];
  let currentBlock = "General"; // Default block

  rows.forEach((row) => {
    // Columns based on inspection:
    // 0: Sl.No.
    // 1: NBC Section / Clause No.
    // 2: Requirement as per NBC
    // 3: Status
    // 4: Auditor Comment
    
    // const slNo = row[0]; // Unused
    const clause = row[1] ? String(row[1]).trim() : '';
    const requirement = row[2] ? String(row[2]).trim() : '';

    // Skip empty requirements
    if (!requirement) {
      // It might be a block header if it's in the 2nd column (index 1) or strictly just text in index 1?
      // Based on inspection: 
      // Row 5: [ '', 'Building details', '', '', '' ]
      // So if col 1 has text but col 2 is empty, it's a block header.
      if (row[1] && !row[2] && !row[0]) {
        currentBlock = String(row[1]).trim();
      }
      return;
    }

    // Skip rows that are likely headers or metadata
    if (
      requirement.toLowerCase().includes('requirement as per nbc') ||
      requirement.toLowerCase().includes('status ("in place"') ||
      requirement.toLowerCase().includes('auditor comment') ||
      requirement.toLowerCase().includes('integrated management system') ||
      requirement.toLowerCase().includes('fire & life safety audit') ||
      requirement.toLowerCase().includes('prepared by') ||
      requirement.toLowerCase().includes('auditor')
    ) {
      return;
    }
    
    // Also skip if it looks like a footer or page number
    if (String(row[3]).toLowerCase().includes('pg no')) return;

    questions.push({
      id: '', // Will be assigned later
      block: currentBlock,
      clause: clause,
      requirement: requirement
    });
  });

  return questions;
}

function processFile(filePath, mapping, headerRowIndex) {
  if (!fs.existsSync(filePath)) {
    console.error(`File not found: ${filePath}`);
    return;
  }

  const workbook = XLSX.readFile(filePath);

  for (const [sheetName, outputFilename] of Object.entries(mapping)) {
    if (!workbook.Sheets[sheetName]) {
      console.warn(`Sheet "${sheetName}" not found in ${path.basename(filePath)}`);
      continue;
    }

    console.log(`Processing sheet: ${sheetName}`);
    const questions = extractQuestions(workbook.Sheets[sheetName], headerRowIndex);

    // Determine prefix based on filename
    let prefix = 'F-GEN';
    if (outputFilename.includes('F-1')) prefix = 'F-1';
    else if (outputFilename.includes('F-2')) prefix = 'F-2';
    else if (outputFilename.includes('F-3')) prefix = 'F-3';
    
    // Assign IDs
    const questionsWithIds = questions.map((q, index) => ({
      ...q,
      id: `${prefix}-${index + 1}`
    }));

    const outputPath = path.join(__dirname, outputFilename);
    fs.writeFileSync(outputPath, JSON.stringify(questionsWithIds, null, 2));
    console.log(`Created ${outputFilename} with ${questionsWithIds.length} questions.`);
  }
}

// Header row seems to be index 4 (0-based) based on inspection
processFile(FILE_PATH, SHEET_MAPPING, 4);
