const fs = require('fs');
const content = fs.readFileSync('extracted_installed_new/out/main/index.js', 'utf8');

let idx = 0;
while ((idx = content.indexOf('executeFlowVideoMediaRpc', idx)) !== -1) {
  console.log('=== Call at', idx, '===');
  console.log(content.substring(Math.max(0, idx - 1000), idx + 1000));
  idx += 24;
}
