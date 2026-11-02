const fs = require('fs');

const code = fs.readFileSync('temp_original_asar/out/main/index.js', 'utf8');

const start = code.indexOf('function nl(');
// Find the end of function nl
// It ends before function Rn or similar
const end = code.indexOf('function Rn(', start);
const nlCode = code.slice(start, end);

fs.writeFileSync('scripts/original_nl_exact.js', nlCode);
console.log('Original nl length:', nlCode.length);
console.log('Saved to scripts/original_nl_exact.js');
