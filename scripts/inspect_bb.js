const fs = require('fs');
const content = fs.readFileSync('extracted_installed_new/out/main/index.js', 'utf8');

const target = 'const bB =';
let idx = content.indexOf(target);
if (idx === -1) idx = content.indexOf('bB=');
console.log('bB at', idx);
if (idx !== -1) {
  console.log(content.substring(idx - 50, idx + 200));
}
