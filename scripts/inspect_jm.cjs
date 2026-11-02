const fs = require('fs');
const mainCode = fs.readFileSync('extracted_installed_new/out/main/index.js', 'utf8');

// Function Jm
const jmIdx = mainCode.indexOf('function Jm(');
console.log('=== FUNCTION Jm ===');
console.log(mainCode.slice(jmIdx, jmIdx + 3000));

// Callers of Jm
let callIdx = 0;
while ((callIdx = mainCode.indexOf('Jm({', callIdx)) !== -1) {
  console.log('=== CALL TO Jm({ at', callIdx, '===');
  console.log(mainCode.slice(Math.max(0, callIdx - 500), Math.min(mainCode.length, callIdx + 1500)));
  callIdx += 4;
}
