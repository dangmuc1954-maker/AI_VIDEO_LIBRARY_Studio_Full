const fs = require('fs');

const code = fs.readFileSync('app/out/main/index.js', 'utf8');

const idx = code.indexOf('async resolveImage(');
if (idx !== -1) {
  console.log('=== async resolveImage at', idx, '===');
  console.log(code.slice(idx, idx + 1500));
} else {
  // search for class ReferenceResolver or similar
  const idx2 = code.indexOf('referenceResolver');
  console.log('=== referenceResolver at', idx2, '===');
  console.log(code.slice(idx2, idx2 + 1000));
}
