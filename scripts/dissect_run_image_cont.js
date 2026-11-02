const fs = require('fs');
const content = fs.readFileSync('extracted_installed_new/out/main/index.js', 'utf8');

const target = 'rpc-generation-proj';
let idx = content.indexOf(target);
console.log('continuation at', idx);
if (idx !== -1) {
  console.log(content.substring(idx - 100, idx + 3500));
}
