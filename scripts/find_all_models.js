const fs = require('fs');

const code = fs.readFileSync('scripts/original_nl_exact.js', 'utf8');

// Also inspect where the catalog is defined in the original main
const mainCode = fs.readFileSync('app/out/main/index.js', 'utf8');

// Find all JA({id: ...}) or video catalog definitions
let idx = 0;
while ((idx = mainCode.indexOf('JA({id:', idx)) !== -1) {
  console.log('=== MODEL AT', idx, '===');
  console.log(mainCode.slice(idx, idx + 600));
  idx += 7;
}
