
import XLSX from 'xlsx';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const filePath = '/Users/aanandiaarya/Documents/fire audit frontend/Group H Storage (1) (1).xlsx';

console.log(`\n--- Inspecting: ${path.basename(filePath)} ---`);
if (!fs.existsSync(filePath)) {
  console.error(`File not found: ${filePath}`);
} else {
  const workbook = XLSX.readFile(filePath);
  console.log('Sheets:', workbook.SheetNames);

  workbook.SheetNames.forEach(sheetName => {
    const sheet = workbook.Sheets[sheetName];
    const data = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' });
    console.log(`\nSheet: "${sheetName}" - First 10 rows:`);
    data.slice(0, 10).forEach((row, i) => console.log(`Row ${i}:`, row));
  });
}
