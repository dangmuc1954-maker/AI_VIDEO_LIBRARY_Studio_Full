const fs = require('fs');
const content = fs.readFileSync('extracted_installed_new/out/main/index.js', 'utf8');

const target = 'downloadRemoteAsset';
let idx = 0;
while ((idx = content.indexOf(target, idx)) !== -1) {
  console.log('downloadRemoteAsset at', idx);
  console.log(content.substring(Math.max(0, idx - 500), idx + 1500));
  idx += target.length;
}
