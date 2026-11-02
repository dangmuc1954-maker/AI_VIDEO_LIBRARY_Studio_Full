const fs = require('fs');

const code = fs.readFileSync('app/out/main/index.js', 'utf8');

let idx = 0;
while ((idx = code.indexOf('isHeadlessMode', idx)) !== -1) {
  console.log('=== isHeadlessMode at', idx, '===');
  console.log(code.slice(Math.max(0, idx - 100), Math.min(code.length, idx + 250)));
  idx += 14;
}
