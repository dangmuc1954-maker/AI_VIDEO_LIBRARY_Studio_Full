const fs = require('fs');
const content = fs.readFileSync('app/out/main/index.js', 'utf8');

const target = 'class Hu';
let idx = content.indexOf(target);
console.log('class Hu at', idx);
if (idx !== -1) {
  console.log(content.substring(idx, idx + 2000));
}
