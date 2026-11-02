const fs = require('fs');

const code = fs.readFileSync('temp_original_asar/out/main/index.js', 'utf8');

// search for modelKey or defaultModel or veo_
let idx = 0;
while ((idx = code.indexOf('veo_', idx)) !== -1) {
  console.log('=== veo_ at', idx, '===');
  console.log(code.slice(Math.max(0, idx - 100), Math.min(code.length, idx + 200)));
  idx += 4;
}
