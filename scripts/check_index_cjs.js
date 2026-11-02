const fs = require('fs');

const f = 'app/out/main/index.cjs';
if (fs.existsSync(f)) {
  const c = fs.readFileSync(f, 'utf8');
  console.log(f, 'length:', c.length);
  let idx = 0;
  let count = 0;
  while ((idx = c.indexOf('flow-content.google', idx)) !== -1) {
    console.log('  match at', idx, ':', c.substring(Math.max(0, idx - 50), idx + 100));
    idx += 19;
    count++;
    if (count > 10) break;
  }
  console.log('Total matches in index.cjs:', count);
}
