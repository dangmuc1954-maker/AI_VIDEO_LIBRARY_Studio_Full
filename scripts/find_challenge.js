const fs = require('fs');

const code = fs.readFileSync('temp_original_asar/out/main/index.js', 'utf8');

let idx = 0;
while ((idx = code.indexOf('PUBLIC_ERROR_UNUSUAL_ACTIVITY', idx)) !== -1) {
  console.log('=== PUBLIC_ERROR_UNUSUAL_ACTIVITY at', idx, '===');
  console.log(code.slice(Math.max(0, idx - 150), Math.min(code.length, idx + 300)));
  idx += 30;
}

// Also search for CHALLENGE_REQUIRED
idx = 0;
while ((idx = code.indexOf('CHALLENGE_REQUIRED', idx)) !== -1) {
  console.log('=== CHALLENGE_REQUIRED at', idx, '===');
  console.log(code.slice(Math.max(0, idx - 150), Math.min(code.length, idx + 300)));
  idx += 18;
}
