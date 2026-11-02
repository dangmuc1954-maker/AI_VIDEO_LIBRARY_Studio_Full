const fs = require('fs');

const code = fs.readFileSync('app/out/main/index.js', 'utf8');

// search for updateProgress(18 or updateProgress(20
let idx = 0;
while ((idx = code.indexOf('updateProgress(18', idx)) !== -1) {
  console.log('=== updateProgress(18 at', idx, '===');
  console.log(code.slice(Math.max(0, idx - 100), Math.min(code.length, idx + 200)));
  idx += 17;
}

idx = 0;
while ((idx = code.indexOf('updateProgress(20', idx)) !== -1) {
  console.log('=== updateProgress(20 at', idx, '===');
  console.log(code.slice(Math.max(0, idx - 100), Math.min(code.length, idx + 200)));
  idx += 17;
}
