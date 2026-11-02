const fs = require('fs');

const code = fs.readFileSync('app/out/main/index.js', 'utf8');

let idx = 0;
while ((idx = code.indexOf('partition:', idx)) !== -1) {
  console.log('=== partition: at', idx, '===');
  console.log(code.slice(Math.max(0, idx - 50), Math.min(code.length, idx + 150)));
  idx += 10;
}
