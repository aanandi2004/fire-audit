import XLSX from 'xlsx';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const excelPath = path.resolve(__dirname, '../../Group D Checklist.xlsx');

try {
  const workbook = XLSX.readFile(excelPath);
  console.log('Sheets:', workbook.SheetNames);
  
  // Preview first few rows of each sheet to identify columns
  workbook.SheetNames.forEach(sheetName => {
    console.log(`\n--- Sheet: ${sheetName} ---`);
    const worksheet = workbook.Sheets[sheetName];
    const data = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: '' });
    console.log(data.slice(0, 5)); // Print first 5 rows
  });

} catch (error) {
  console.error('Error reading Excel file:', error);
}
