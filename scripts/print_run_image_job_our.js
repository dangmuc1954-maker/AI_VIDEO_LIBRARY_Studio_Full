const fs = require('fs');
const content = fs.readFileSync('app/out/main/index.js', 'utf8');

const idx = content.indexOf('async runImageJobViaRpc(');
console.log('runImageJobViaRpc at', idx);
if (idx !== -1) {
  console.log(content.substring(idx, idx + 4000));
}
