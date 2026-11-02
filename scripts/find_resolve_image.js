const fs = require('fs');

const code = fs.readFileSync('app/out/main/index.js', 'utf8');

let idx = 0;
while ((idx = code.indexOf('resolveImage(', idx)) !== -1) {
  console.log('=== resolveImage at', idx, '===');
  console.log(code.slice(Math.max(0, idx - 100), Math.min(code.length, idx + 600)));
  idx += 13;
}
