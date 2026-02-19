
import XLSX from 'xlsx';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const FILE_1 = '/Users/aanandiaarya/Documents/fire audit frontend/Group E busines (1).xlsx';
const FILE_2 = '/Users/aanandiaarya/Documents/fire audit frontend/E3 group checklist modifed Rev no 2 Denali Fire Audit Checklist - Group E Business Building - July 2025 - Consolidated Report.xlsx';

const SHEET_MAPPING_1 = {
  'General': 'groupE-E-GEN.json',
  'E-1 Office banks, professional ': 'groupE-E-1.json',
  'E-2 Laboratories, outpatient ': 'groupE-E-2.json',
  'E-4 Telephone exchanges': 'groupE-E-4.json',
  'E-5 Broad casting stations': 'groupE-E-5.json'
};

const SHEET_MAPPING_2 = {
  'E-3 Electronic data': 'groupE-E-3.json'
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
      // Actually, based on inspection: 
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

    // Assign IDs
    const prefix = outputFilename.replace('groupE-', '').replace('.json', ''); // e.g., E-GEN, E-1
    questions.forEach((q, index) => {
      q.id = `${prefix}-${index + 1}`;
    });

    const outputPath = path.join(__dirname, outputFilename);
    fs.writeFileSync(outputPath, JSON.stringify(questions, null, 2));
    console.log(`Saved ${questions.length} questions to ${outputFilename}`);
  }
}

// Process File 1 (Row 4 is header -> index 4)
console.log('--- Processing File 1 ---');
processFile(FILE_1, SHEET_MAPPING_1, 4);

// Process File 2 (Row 7 is header -> index 7)
console.log('\n--- Processing File 2 ---');
processFile(FILE_2, SHEET_MAPPING_2, 7);

console.log('\nExtraction complete.');
