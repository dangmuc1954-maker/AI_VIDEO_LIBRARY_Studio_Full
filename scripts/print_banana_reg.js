const fs = require('fs');
const content = fs.readFileSync('app/out/main/index.js', 'utf8');

const target = 'dt.register(new Ua("banana"';
let idx = content.indexOf(target);
console.log('register banana at', idx);
if (idx !== -1) {
  console.log(content.substring(idx - 500, idx + 1000));
}
