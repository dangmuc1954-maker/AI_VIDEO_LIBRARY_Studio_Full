const fs = require('fs');
const content = fs.readFileSync('parent_app_main_index.js', 'utf8');

function searchAround(term, radiusBefore = 500, radiusAfter = 1500) {
  let idx = 0;
  let count = 0;
  while ((idx = content.indexOf(term, idx)) !== -1 && count < 5) {
    const start = Math.max(0, idx - radiusBefore);
    const end = Math.min(content.length, idx + term.length + radiusAfter);
    console.log(`\n================ MATCH ${count + 1} at char ${idx} ================`);
    console.log(content.slice(start, end));
    idx += term.length;
    count++;
  }
}

searchAround('zl(');
