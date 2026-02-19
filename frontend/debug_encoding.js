
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const groupsPath = path.join(__dirname, 'src/config/groups.js');
const mockDataPath = path.join(__dirname, 'src/data/mockAuthData.js');

const groupsContent = fs.readFileSync(groupsPath, 'utf-8');
const mockDataContent = fs.readFileSync(mockDataPath, 'utf-8');

// Extract "Group D – Assembly" from both
const groupMatch = groupsContent.match(/Group D . Assembly/);
const mockMatch = mockDataContent.match(/Group D . Assembly/);

console.log("Groups match:", groupMatch ? groupMatch[0] : "Not found");
if (groupMatch) {
    console.log("Groups char code:", groupMatch[0].charCodeAt(8)); // "Group D " is 8 chars. Index 8 is the dash.
}

console.log("Mock match:", mockMatch ? mockMatch[0] : "Not found");
if (mockMatch) {
    console.log("Mock char code:", mockMatch[0].charCodeAt(8));
}

if (groupMatch && mockMatch) {
    console.log("Are they equal?", groupMatch[0] === mockMatch[0]);
}
