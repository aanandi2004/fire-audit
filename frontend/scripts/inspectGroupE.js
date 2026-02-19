
import XLSX from 'xlsx';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const files = [
  '/Users/aanandiaarya/Documents/fire audit frontend/Group E busines (1).xlsx',
  '/Users/aanandiaarya/Documents/fire audit frontend/E3 group checklist modifed Rev no 2 Denali Fire Audit Checklist - Group E Business Building - July 2025 - Consolidated Report.xlsx'
];

files.forEach(filePath => {
  console.log(`\n--- Inspecting: ${path.basename(filePath)} ---`);
  if (!fs.existsSync(filePath)) {
    console.error(`File not found: ${filePath}`);
    return;
  }

  const workbook = XLSX.readFile(filePath);
  console.log('Sheets:', workbook.SheetNames);

  workbook.SheetNames.forEach(sheetName => {
    const sheet = workbook.Sheets[sheetName];
    const data = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' });
    console.log(`\nSheet: "${sheetName}" - First 20 rows:`);
    data.slice(0, 20).forEach((row, i) => console.log(`Row ${i}:`, row));
  });
});
