const fs = require('fs');

const originalMain = fs.readFileSync('temp_original_asar/out/main/index.js', 'utf8');

console.log('Original main length:', originalMain.length);

// Search for nl definition
const nlIdx = originalMain.indexOf('function nl(');
if (nlIdx !== -1) {
  console.log('=== ORIGINAL function nl( FOUND at', nlIdx, '===');
  console.log(originalMain.slice(nlIdx, nlIdx + 2500));
} else {
  console.log('function nl( NOT found');
}

// Search for callers of nl
let callIdx = 0;
while ((callIdx = originalMain.indexOf('nl({', callIdx)) !== -1) {
  console.log('=== CALL TO nl({ at', callIdx, '===');
  console.log(originalMain.slice(Math.max(0, callIdx - 300), Math.min(originalMain.length, callIdx + 600)));
  callIdx += 4;
}

// Search for "kko de lai project" - how projects are handled
// search for UpteDb (projectList) and jHPbke (projectCreate)
let pIdx = 0;
while ((pIdx = originalMain.indexOf('jHPbke', pIdx)) !== -1) {
  console.log('=== jHPbke at', pIdx, '===');
  console.log(originalMain.slice(Math.max(0, pIdx - 200), Math.min(originalMain.length, pIdx + 400)));
  pIdx += 6;
}
