const fs = require('fs');
const path = require('path');

const parentFile = path.join(__dirname, '../extracted_installed_new/out/main/index.js');
const content = fs.readFileSync(parentFile, 'utf8');

let idx = 0;
while ((idx = content.indexOf('executeRpc(', idx)) !== -1) {
  console.log(`\n=== Found executeRpc( at ${idx} ===`);
  console.log(content.slice(Math.max(0, idx - 50), Math.min(content.length, idx + 800)));
  idx += 11;
  if (idx > 1000000) break;
}
