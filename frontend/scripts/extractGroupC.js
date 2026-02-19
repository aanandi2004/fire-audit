import XLSX from 'xlsx';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const excelPath = path.resolve(__dirname, '../../Group C INSTITU.xlsx');
const outputDir = __dirname;

const SHEET_MAPPING = {
  'General': 'groupC-C-GEN.json',
  'C-2 Custodial institutions': 'groupC-C-2.json',
  'C-3 Penal & Mental institutions': 'groupC-C-3.json'
  // Explicitly ignoring 'C-1 Hospitals & sanatorias'
};

function extractQuestions(worksheet, subdivisionId) {
  const data = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: '' });
  
  // Find the header row (starts with Sl.No.)
  let headerRowIndex = -1;
  for (let i = 0; i < 10; i++) { // Search first 10 rows
    if (data[i] && data[i][0] && String(data[i][0]).includes('Sl.No.')) {
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
    let col0 = String(row[0]).trim(); // Sl.No.
    let col1 = String(row[1]).trim(); // Clause
    let col2 = String(row[2]).trim(); // Requirement

    // Skip empty rows
    if (!col0 && !col1 && !col2) return;

    // Heuristic for Section Header:
    // If Sl.No. is empty AND Clause has text AND Requirement is empty
    if (!col0 && col1 && !col2) {
      currentBlock = col1;
      return; // Skip this row, it's just setting the block
    }

    // If Requirement is present (or it's a valid question row)
    if (col2) {
      // Exclude footer rows
      const lowerReq = col2.toLowerCase();
      if (lowerReq === 'prepared by' || lowerReq === 'auditor') {
        return;
      }

      const id = `${subdivisionId}-${questions.length + 1}`;
      questions.push({
        id,
        block: currentBlock,
        clause: col1, // This is the actual clause number if present
        requirement: col2
      });
    }
  });

  return questions;
}

try {
  const workbook = XLSX.readFile(excelPath);
  
  for (const [sheetName, fileName] of Object.entries(SHEET_MAPPING)) {
    if (workbook.Sheets[sheetName]) {
      console.log(`Processing ${sheetName}...`);
      const questions = extractQuestions(workbook.Sheets[sheetName], fileName.replace('groupC-', '').replace('.json', ''));
      
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
