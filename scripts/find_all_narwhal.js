const fs = require('fs');
const path = require('path');

const file = path.join(__dirname, '../app/out/main/index.js');
const content = fs.readFileSync(file, 'utf8');

let count = 0;
let idx = 0;
while ((idx = content.indexOf('NARWHAL', idx)) !== -1) {
  count++;
  console.log(`Match ${count} at index ${idx}:`);
  console.log(content.slice(Math.max(0, idx - 60), Math.min(content.length, idx + 80)));
  idx += 7;
}
console.log('Total NARWHAL occurrences:', count);
