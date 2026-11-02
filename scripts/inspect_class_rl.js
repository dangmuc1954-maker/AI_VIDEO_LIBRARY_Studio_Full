const fs = require('fs');

const code = fs.readFileSync('temp_original_asar/out/main/index.js', 'utf8');

let idx = 0;
while ((idx = code.indexOf('class rl', idx)) !== -1) {
  console.log('=== class rl at', idx, '===');
  console.log(code.slice(idx, idx + 2000));
  idx += 8;
}
if (idx === 0) {
  idx = code.indexOf('function rl(');
  if (idx !== -1) {
    console.log('=== function rl at', idx, '===');
    console.log(code.slice(idx, idx + 2000));
  }
}
