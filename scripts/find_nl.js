const fs = require('fs');

const content = fs.readFileSync('app/out/main/index.js', 'utf8');

let idx = 0;
while ((idx = content.indexOf('function nl(', idx)) !== -1) {
  console.log('--- FOUND function nl( AT', idx);
  console.log(content.slice(idx, idx + 800));
  idx += 12;
}

// Also search where nl is referenced
let calls = 0;
idx = 0;
while ((idx = content.indexOf('nl({', idx)) !== -1) {
  console.log('--- CALL nl({ AT', idx);
  console.log(content.slice(Math.max(0, idx - 200), Math.min(content.length, idx + 400)));
  idx += 4;
}
