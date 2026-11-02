const fs = require('fs');
const code = fs.readFileSync('extracted_v101_out/out/main/index.js', 'utf8');

// Find all occurrences of userData
let idx = 0;
while ((idx = code.indexOf('userData', idx)) !== -1) {
  console.log('userData at:', idx, code.slice(Math.max(0, idx - 60), Math.min(code.length, idx + 100)));
  idx += 8;
}

// Find app.setName or setAppUserModelId
['setName', 'setAppUserModelId', 'setPath'].forEach(kw => {
  let kIdx = 0;
  while ((kIdx = code.indexOf(kw, kIdx)) !== -1) {
    console.log(kw, 'at:', kIdx, code.slice(Math.max(0, kIdx - 60), Math.min(code.length, kIdx + 100)));
    kIdx += kw.length;
  }
});
