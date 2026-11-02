const fs = require('fs');
const content = fs.readFileSync('app/out/main/index.js', 'utf8');

let idx = 0;
while ((idx = content.indexOf('runImageJobViaRpc', idx)) !== -1) {
  console.log('runImageJobViaRpc at', idx);
  console.log(content.substring(Math.max(0, idx - 100), idx + 800));
  idx += 17;
}
