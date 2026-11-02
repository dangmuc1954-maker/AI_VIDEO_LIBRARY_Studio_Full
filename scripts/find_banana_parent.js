const fs = require('fs');
const path = require('path');

const parentFile = path.join(__dirname, '../extracted_installed_new/out/main/index.js');
const content = fs.readFileSync(parentFile, 'utf8');

let idx = 0;
while ((idx = content.indexOf('"banana"', idx)) !== -1) {
  console.log(`\n=== Found "banana" at ${idx} ===`);
  console.log(content.slice(Math.max(0, idx - 100), Math.min(content.length, idx + 400)));
  idx += 8;
  if (idx > 1000000) break;
}
