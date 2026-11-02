const fs = require('fs');

const code = fs.readFileSync('app/out/main/index.js', 'utf8');

const idx = code.indexOf('function Xu(');
if (idx !== -1) {
  console.log('=== function Xu at', idx, '===');
  console.log(code.slice(idx, idx + 1000));
} else {
  console.log('function Xu not found');
}
