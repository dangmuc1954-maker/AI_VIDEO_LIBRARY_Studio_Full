const fs = require('fs');
const path = require('path');

const appFile = path.join(__dirname, '../app/out/main/index.js');
const content = fs.readFileSync(appFile, 'utf8');

let idx = 0;
while ((idx = content.indexOf('executeFlowImageRpc', idx)) !== -1) {
  console.log(`\n=== Found executeFlowImageRpc at ${idx} ===`);
  console.log(content.slice(Math.max(0, idx - 50), Math.min(content.length, idx + 500)));
  idx += 19;
  if (idx > 1000000) break;
}
