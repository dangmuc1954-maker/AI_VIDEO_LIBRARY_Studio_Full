const fs = require('fs');

const code = fs.readFileSync('temp_original_asar/out/main/index.js', 'utf8');

let idx = 0;
while ((idx = code.indexOf('executeFlowVideoRpc', idx)) !== -1) {
  console.log('=== executeFlowVideoRpc at', idx, '===');
  console.log(code.slice(Math.max(0, idx - 100), Math.min(code.length, idx + 400)));
  idx += 19;
}
