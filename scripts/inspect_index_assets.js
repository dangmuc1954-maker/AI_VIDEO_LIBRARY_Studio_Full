const fs = require('fs');
const c = fs.readFileSync('app/out/main/index.js', 'utf8');

const idx = c.indexOf('Collecting generated video');
console.log('Collecting generated video at', idx);
if (idx !== -1) {
  console.log(c.substring(idx - 100, idx + 1000));
}
