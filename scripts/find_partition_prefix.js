const fs = require('fs');
const path = require('path');

const appFile = path.join(__dirname, '../app/out/main/index.js');
const content = fs.readFileSync(appFile, 'utf8');

let idx = 0;
while ((idx = content.indexOf('persist:aiforge:', idx)) !== -1) {
  console.log(`\n=== Found persist:aiforge: at ${idx} ===`);
  console.log(content.slice(Math.max(0, idx - 50), Math.min(content.length, idx + 400)));
  idx += 16;
  if (idx > 1000000) break;
}
