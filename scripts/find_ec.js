const fs = require('fs');

const code = fs.readFileSync('app/out/main/index.js', 'utf8');

let idx = code.indexOf('Ec=');
if (idx !== -1) {
  console.log('=== Ec at', idx, '===');
  console.log(code.slice(idx - 50, idx + 150));
} else {
  console.log('Ec= not found');
}
