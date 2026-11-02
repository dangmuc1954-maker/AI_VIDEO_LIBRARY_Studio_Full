const fs = require('fs');

const logFile = 'C:\\Users\\admin\\AppData\\Local\\Programs\\AI VIDEO LIBRARY\\resources\\flow_rpc_debug.log';
const content = fs.readFileSync(logFile, 'utf8');
const entries = content.split('\n\n').filter(Boolean);

console.log('Searching image entries...');
const imgEntries = entries.filter(e => e.includes('image') || e.includes('ogiZ0b') || e.includes('banana'));
console.log('Found image entries:', imgEntries.length);
for (const e of imgEntries.slice(-5)) {
  console.log(e);
  console.log('=================================');
}
