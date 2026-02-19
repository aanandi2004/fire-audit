import XLSX from 'xlsx';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const filePath = path.join(__dirname, '../../group -J Hazardous.xlsx');
console.log('Reading file:', filePath);

try {
  const workbook = XLSX.readFile(filePath);
  console.log('Sheets:', workbook.SheetNames);
  
  workbook.SheetNames.forEach(sheetName => {
    const sheet = workbook.Sheets[sheetName];
    const data = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' });
    
    data.forEach((row, index) => {
        const str = JSON.stringify(row);
        if (str.includes('Electrical pump')) {
            console.log(`\nFound "Electrical pump" in Sheet "${sheetName}" at Row ${index}:`);
            // Print surrounding rows
            for (let i = Math.max(0, index - 2); i < Math.min(data.length, index + 5); i++) {
                console.log(`Row ${i}:`, data[i]);
            }
        }
    });
  });

} catch (error) {
  console.error('Error reading file:', error.message);
}
