const fs = require('fs');

const code = fs.readFileSync('temp_original_asar/out/main/index.js', 'utf8');

// search for function ne( or function Ye(
let idx = code.indexOf('function ne(');
if (idx !== -1) {
  console.log('=== function ne at', idx, '===');
  console.log(code.slice(idx, idx + 800));
}

idx = code.indexOf('function Ye(');
if (idx !== -1) {
  console.log('=== function Ye at', idx, '===');
  console.log(code.slice(idx, idx + 800));
}
