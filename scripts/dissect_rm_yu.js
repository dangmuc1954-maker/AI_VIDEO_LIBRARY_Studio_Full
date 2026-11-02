const fs = require('fs');
const content = fs.readFileSync('extracted_installed_new/out/main/index.js', 'utf8');

function findDef(target) {
  let idx = 0;
  while ((idx = content.indexOf('function ' + target + '(', idx)) !== -1) {
    console.log('function ' + target + ' at ' + idx);
    console.log(content.substring(idx, idx + 1500));
    idx += target.length;
  }
}

console.log('=== Rm ===');
findDef('Rm');
console.log('=== yu ===');
findDef('yu');
