const fs = require('fs');
const path = require('path');

const appFile = path.join(__dirname, '../app/out/main/index.js');
const content = fs.readFileSync(appFile, 'utf8');

// Find executeFlowListProjectsRpc
let idx = content.indexOf('executeFlowListProjectsRpc');
if (idx !== -1) {
  console.log(content.slice(Math.max(0, idx - 50), Math.min(content.length, idx + 1000)));
}
