const fs = require('fs');
const content = fs.readFileSync('extracted_installed_new/out/main/index.js', 'utf8');

const target = 'function yu(';
let idx = content.indexOf(target);
console.log('yu at', idx);
if (idx !== -1) {
  console.log(content.substring(idx + 1200, idx + 3500));
}
