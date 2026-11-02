const fs = require('fs');

const mainCode = fs.readFileSync('extracted_installed_new/out/main/index.js', 'utf8');

// Find occurrences of "MZZa6b" or "google-flow" in main
let idx = 0;
while ((idx = mainCode.indexOf('MZZa6b', idx)) !== -1) {
  console.log('=== MZZa6b at index', idx, '===');
  console.log(mainCode.slice(Math.max(0, idx - 400), Math.min(mainCode.length, idx + 600)));
  idx += 6;
}
