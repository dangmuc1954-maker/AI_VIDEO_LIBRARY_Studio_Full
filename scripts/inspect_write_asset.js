const fs = require('fs');
const c = fs.readFileSync('app/out/main/index.js', 'utf8');

const target = 'async writeAsset(';
const idx = c.indexOf(target);
console.log('writeAsset at', idx);
if (idx !== -1) {
  console.log(c.substring(idx, idx + 2500));
}
