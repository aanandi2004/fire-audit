import XLSX from 'xlsx';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

/* global process */

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const excelPath = path.join(__dirname, '../../Group A - Residential  (1).xlsx');
const outputDir = __dirname;

const SHEET_MAPPING = {
  'General': 'groupA-A-GEN.json',
  'A-1 Lodging & Rooming houses': 'groupA-A-1.json',
  'A-2 One or two family private d': 'groupA-A-2.json',
  'A-3 Dormitories (1)': 'groupA-A-3.json',
  'A-4 Apartment houses': 'groupA-A-4.json',
  'A- 5  Hotels': 'groupA-A-5.json',
  'A-6 Starred Hotels': 'groupA-A-6.json'
};

function extractQuestions(worksheet, subdivisionId) {
  const data = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: '' });
  
  // Find the header row (starts with Sl.No.)
  let headerRowIndex = -1;
  for (let i = 0; i < 20; i++) { // Search first 20 rows
    if (data[i] && data[i][0] && String(data[i][0]).toLowerCase().includes('sl.no')) {
      headerRowIndex = i;
      break;
    }
  }

  if (headerRowIndex === -1) {
    console.error(`Could not find header row for ${subdivisionId}`);
    return [];
  }

  const rows = data.slice(headerRowIndex + 1);
  const questions = [];
  let currentBlock = 'General'; // Default block

  rows.forEach((row) => {
    // Columns: 0=Sl.No., 1=Clause, 2=Requirement
    let col0 = row[0] ? String(row[0]).trim() : ''; // Sl.No.
    let col1 = row[1] ? String(row[1]).trim() : ''; // Clause
    let col2 = row[2] ? String(row[2]).trim() : ''; // Requirement

    // Skip empty rows
    if (!col0 && !col1 && !col2) return;

    // Heuristic for Section Header:
    // If Sl.No. is empty AND Clause has text AND Requirement is empty
    if (!col0 && col1 && !col2) {
      currentBlock = col1;
      return; // Skip this row, it's just setting the block
    }

    // Special case for Group A/J "Electrical pump" type rows:
    // They have NO Sl.No, NO Clause, but HAVE Requirement.
    // They are often sub-questions or input fields.
    // We treat them as questions.
    
    // Also, some Block Headers might be in Requirement column if Clause is empty?
    // In Group J: "Electrical pump" was in Requirement column.
    // But typically Block Headers are distinct.
    
    // Check for footer/metadata to skip
    if (col2) {
      const lowerReq = col2.toLowerCase();
      if (
        lowerReq.includes('requirement as per nbc') ||
        lowerReq.includes('status ("in place"') ||
        lowerReq.includes('auditor comment') ||
        lowerReq.includes('integrated management system') ||
        lowerReq.includes('fire & life safety audit') ||
        lowerReq.includes('prepared by') ||
        lowerReq.includes('auditor') ||
        (row[3] && String(row[3]).toLowerCase().includes('pg no'))
      ) {
        return;
      }

      const id = `${subdivisionId}-${questions.length + 1}`;
      questions.push({
        id,
        block: currentBlock,
        clause: col1,
        requirement: col2
      });
    }
  });

  return questions;
}

try {
  if (!fs.existsSync(excelPath)) {
    console.error(`Excel file not found at ${excelPath}`);
    process.exit(1);
  }

  const workbook = XLSX.readFile(excelPath);
  
  for (const [sheetName, fileName] of Object.entries(SHEET_MAPPING)) {
    if (workbook.Sheets[sheetName]) {
      console.log(`Processing ${sheetName}...`);
      // Remove .json and groupA- prefix for ID generation if needed, but we use A-1 etc directly
      let subId = fileName.replace('groupA-', '').replace('.json', '');
      
      const questions = extractQuestions(workbook.Sheets[sheetName], subId);
      
      const outputPath = path.join(outputDir, fileName);
      fs.writeFileSync(outputPath, JSON.stringify(questions, null, 2));
      console.log(`Saved ${questions.length} questions to ${fileName}`);
    } else {
      console.warn(`Sheet "${sheetName}" not found!`);
    }
  }

} catch (error) {
  console.error('Error processing Excel file:', error);
}
