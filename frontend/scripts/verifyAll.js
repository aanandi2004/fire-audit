import XLSX from 'xlsx';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// --- Configuration ---

const BASE_DIR = path.join(__dirname, '../../');
const SCRIPTS_DIR = __dirname;

const GROUPS = [
  {
    id: 'A',
    excelFile: 'Group A - Residential  (1).xlsx',
    mapping: {
      'General': 'groupA-A-GEN.json',
      'A-1 Lodging & Rooming houses': 'groupA-A-1.json',
      'A-2 One or two family private d': 'groupA-A-2.json',
      'A-3 Dormitories (1)': 'groupA-A-3.json',
      'A-4 Apartment houses': 'groupA-A-4.json',
      'A- 5  Hotels': 'groupA-A-5.json',
      'A-6 Starred Hotels': 'groupA-A-6.json'
    },
    headerStrategy: 'dynamic'
  },
  {
    id: 'B',
    excelFile: 'Group B  EDUCA.xlsx',
    mapping: {
      'General': 'groupB-B-GEN.json',
      'B-1Schol up to senorsecondr lve': 'groupB-B-1.json',
      ' B-2 All others, training insti': 'groupB-B-2.json'
    },
    headerStrategy: 'dynamic'
  },
  {
    id: 'C',
    excelFile: 'Group C INSTITU.xlsx',
    mapping: {
      'General': 'groupC-C-GEN.json',
      'C-2 Custodial institutions': 'groupC-C-2.json',
      'C-3 Penal & Mental institutions': 'groupC-C-3.json'
    },
    headerStrategy: 'dynamic'
  },
  {
    id: 'D',
    excelFile: 'Group D Checklist.xlsx',
    mapping: {
      'General D,D1, D-2,D-3,D4 & D5': 'groupD-D-GEN.json',
      'D-6': 'groupD-D-6.json'
    },
    headerStrategy: 'dynamic'
  },
  {
    id: 'E',
    excelFile: 'Group E busines (1).xlsx',
    mapping: {
      'General': 'groupE-E-GEN.json',
      'E-1 Office banks, professional ': 'groupE-E-1.json',
      'E-2 Laboratories, outpatient ': 'groupE-E-2.json',
      'E-4 Telephone exchanges': 'groupE-E-4.json',
      'E-5 Broad casting stations': 'groupE-E-5.json',
      // E-3 is in a different file usually, skipping for now or adding secondary check?
      // User mentioned "two provided Group E Excel files". 
      // I'll skip E-3 here or try to find it in the other file if I can guess the name.
      // 'E-3 Electronic data': 'groupE-E-3.json' 
    },
    headerStrategy: 'fixed',
    headerRowIndex: 4
  },
  {
    id: 'E-3',
    excelFile: 'E3 group checklist modifed Rev no 2 Denali Fire Audit Checklist - Group E Business Building - July 2025 - Consolidated Report.xlsx',
    mapping: {
      'E-3 Electronic data': 'groupE-E-3.json'
    },
    headerStrategy: 'fixed',
    headerRowIndex: 7
  },
  {
    id: 'F',
    excelFile: 'Group -F mercant.xlsx',
    mapping: {
      'General': 'groupF-F-GEN.json',
      'F-1 Shops, Stores, dept stores': 'groupF-F-1.json',
      'F-2 stops, stores, dept stores': 'groupF-F-2.json',
      'F-3 Underground shopping centre': 'groupF-F-3.json'
    },
    headerStrategy: 'fixed',
    headerRowIndex: 4
  },
  {
    id: 'G',
    excelFile: 'Group G Industrial.xlsx',
    mapping: {
      'General': 'groupG-G-GEN.json',
      'G-1 Buildings used for low haz ': 'groupG-G-1.json', // Note the trailing space from my debug
      'G-2 Building used for moderate': 'groupG-G-2.json',
      'G-3 Building used for high haza': 'groupG-G-3.json'
    },
    headerStrategy: 'fixed',
    headerRowIndex: 4
  },
  {
    id: 'H',
    excelFile: 'Group H Storage (1) (1).xlsx',
    mapping: {
      'General': 'groupH-H-GEN.json',
      'No sub division': 'groupH-H-1.json'
    },
    headerStrategy: 'fixed',
    headerRowIndex: 4
  },
  {
    id: 'J',
    excelFile: 'group -J Hazardous.xlsx',
    mapping: {
      'General': 'groupJ-J-GEN.json',
      'No sub division': 'groupJ-J-1.json'
    },
    headerStrategy: 'fixed',
    headerRowIndex: 4
  }
];

// --- Helper Functions ---

function normalizeText(text) {
  if (!text) return '';
  return String(text).trim().replace(/\s+/g, ' ').toLowerCase();
}

function extractQuestionsFromSheet(sheet, strategy, fixedIndex) {
  const data = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' });
  let headerRowIndex = -1;

  if (strategy === 'fixed') {
    headerRowIndex = fixedIndex;
  } else {
    // Dynamic search for header row
    for (let i = 0; i < 20; i++) {
      const rowStr = JSON.stringify(data[i] || []).toLowerCase();
      if (rowStr.includes('sl.no') || rowStr.includes('requirement')) {
        headerRowIndex = i;
        break;
      }
    }
  }

  if (headerRowIndex === -1) {
    return { error: 'Header row not found' };
  }

  const rows = data.slice(headerRowIndex + 1);
  const questions = [];

  rows.forEach((row, rowIndex) => {
    // Heuristic mapping of columns
    // Usually: 0=SlNo, 1=Clause, 2=Requirement
    // But sometimes shifted.
    // Let's look for the column with the longest text as Requirement?
    // Or stick to 0, 1, 2.
    
    // For Group A/B/C/D it was 0,1,2.
    // For E/F/G/H/J it was also 0,1,2 (SlNo, Clause, Requirement).
    
    let requirement = String(row[2]).trim();
    let clause = String(row[1]).trim();
    
    // Cleanup requirement text
    if (!requirement) return;
    
    // Align with extraction filters
    const lowerReq = requirement.toLowerCase();
    if (
      lowerReq.includes('s.no') ||
      lowerReq.includes('description') ||
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

    questions.push({
      rowIndex: headerRowIndex + 1 + rowIndex,
      requirement: requirement,
      clause: clause
    });
  });

  return { questions };
}

// --- Main Verification Logic ---

function verify() {
  console.log('Starting verification of all groups...\n');
  const summary = [];

  for (const group of GROUPS) {
    console.log(`--- Checking Group ${group.id} ---`);
    const excelPath = path.join(BASE_DIR, group.excelFile);
    
    if (!fs.existsSync(excelPath)) {
      console.error(`  [ERROR] Excel file not found: ${group.excelFile}`);
      summary.push(`Group ${group.id}: Excel missing`);
      continue;
    }

    try {
      const workbook = XLSX.readFile(excelPath);
      const sheetNames = workbook.SheetNames;
      
      for (const [sheetName, jsonFile] of Object.entries(group.mapping)) {
        // Fuzzy match sheet name if exact match fails
        let targetSheet = sheetName;
        if (!workbook.Sheets[sheetName]) {
            const found = sheetNames.find(s => s.trim() === sheetName.trim());
            if (found) targetSheet = found;
            else {
                console.warn(`  [WARN] Sheet "${sheetName}" not found in Excel. Available: ${sheetNames.join(', ')}`);
                summary.push(`Group ${group.id} (${jsonFile}): Sheet not found`);
                continue;
            }
        }

        const jsonPath = path.join(SCRIPTS_DIR, jsonFile);
        if (!fs.existsSync(jsonPath)) {
           console.warn(`  [WARN] JSON file not found: ${jsonFile}`);
           summary.push(`Group ${group.id} (${jsonFile}): JSON missing`);
           continue;
        }

        const jsonQuestions = JSON.parse(fs.readFileSync(jsonPath, 'utf-8'));
        const { questions: excelQuestions, error } = extractQuestionsFromSheet(
          workbook.Sheets[targetSheet], 
          group.headerStrategy, 
          group.headerRowIndex
        );

        if (error) {
          console.error(`  [ERROR] ${error} in sheet ${targetSheet}`);
          summary.push(`Group ${group.id} (${sheetName}): Header error`);
          continue;
        }

        // Comparison
        console.log(`  Comparing ${jsonFile} vs Sheet "${targetSheet}"`);
        
        let matchCount = 0;
        let missingInJson = 0;
        let extraInJson = 0;

        // Create map of normalized requirements from Excel
        const excelMap = new Map();
        excelQuestions.forEach(q => {
          excelMap.set(normalizeText(q.requirement), q);
        });

        // Check JSON against Excel
        jsonQuestions.forEach(jq => {
            // Filter out JSON entries that are likely headers/metadata if any slipped through
            if (!jq.requirement) return;

            const normReq = normalizeText(jq.requirement);
            if (excelMap.has(normReq)) {
                matchCount++;
                excelMap.delete(normReq); // Consumed
            } else {
                // Try fuzzy check or mark as extra
                extraInJson++;
                console.log(`    + Extra in JSON: "${jq.requirement.substring(0, 50)}..."`);
            }
        });

        missingInJson = excelMap.size;
        if (missingInJson > 0) {
            console.log(`    - Missing in JSON (${missingInJson} items):`);
            Array.from(excelMap.values()).slice(0, 3).forEach(q => console.log(`      "${q.requirement.substring(0, 50)}..."`));
        }

        const totalExcel = excelQuestions.length;
        const totalJson = jsonQuestions.length;

        console.log(`    Stats: Excel=${totalExcel}, JSON=${totalJson}, Matches=${matchCount}, Missing=${missingInJson}, Extra=${extraInJson}`);

        if (totalExcel !== totalJson) {
             summary.push(`Group ${group.id} (${jsonFile}): Count Mismatch (Excel: ${totalExcel}, JSON: ${totalJson})`);
        } else if (missingInJson > 0 || extraInJson > 0) {
             summary.push(`Group ${group.id} (${jsonFile}): Content Mismatch (Missing: ${missingInJson}, Extra: ${extraInJson})`);
        } else {
             summary.push(`Group ${group.id} (${jsonFile}): OK`);
        }
      }

    } catch (err) {
      console.error(`  [ERROR] Processing ${group.excelFile}: ${err.message}`);
      summary.push(`Group ${group.id}: Error processing file`);
    }
  }

  console.log('\n--- Final Summary ---');
  summary.forEach(s => console.log(s));
}

verify();
