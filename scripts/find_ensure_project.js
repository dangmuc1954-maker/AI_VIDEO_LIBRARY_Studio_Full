const fs = require('fs');

const code = fs.readFileSync('temp_original_asar/out/main/index.js', 'utf8');

let idx = 0;
while ((idx = code.indexOf('ensureProject(', idx)) !== -1) {
  console.log('=== ensureProject at', idx, '===');
  console.log(code.slice(Math.max(0, idx - 100), Math.min(code.length, idx + 800)));
  idx += 14;
}
