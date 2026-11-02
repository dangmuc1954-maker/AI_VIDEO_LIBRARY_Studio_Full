const fs = require('fs');
const content = fs.readFileSync('extracted_installed_new/out/main/index.js', 'utf8');

const target = 'async runImageJobViaRpc(';
let idx = content.indexOf(target);
console.log('runImageJobViaRpc at', idx);
if (idx !== -1) {
  console.log(content.substring(idx, idx + 4000));
}
