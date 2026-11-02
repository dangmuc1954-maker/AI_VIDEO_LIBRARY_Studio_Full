const fs = require('fs');
const content = fs.readFileSync('app/out/main/index.js', 'utf8');

let idx = 0;
while ((idx = content.indexOf('imageRpcClient', idx)) !== -1) {
  console.log('imageRpcClient at', idx);
  console.log(content.substring(Math.max(0, idx - 100), idx + 200));
  idx += 14;
}
