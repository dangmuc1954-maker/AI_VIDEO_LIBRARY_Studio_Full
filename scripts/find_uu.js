const fs = require('fs');

const code = fs.readFileSync('temp_original_asar/out/main/index.js', 'utf8');

const idx = code.indexOf('Uu=');
if (idx !== -1) {
  console.log('=== Uu at', idx, '===');
  console.log(code.slice(idx - 50, idx + 200));
}
