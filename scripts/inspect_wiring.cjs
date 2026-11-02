const fs = require('fs');
const code = fs.readFileSync('extracted_installed_new/out/main/index.js', 'utf8');

const targetIdx = 1064557;
console.log('=== AROUND 1064557 ===');
console.log(code.slice(Math.max(0, targetIdx - 1500), Math.min(code.length, targetIdx + 1500)));
