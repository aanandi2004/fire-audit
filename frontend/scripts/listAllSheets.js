
import XLSX from 'xlsx';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.join(__dirname, '../../');

const files = fs.readdirSync(ROOT_DIR).filter(f => f.endsWith('.xlsx'));

files.forEach(file => {
  console.log(`\nFile: ${file}`);
  try {
    const workbook = XLSX.readFile(path.join(ROOT_DIR, file));
    console.log('Sheets:', workbook.SheetNames.map(s => `'${s}'`).join(', '));
  } catch (err) {
    console.error(`Error reading ${file}:`, err.message);
  }
});
