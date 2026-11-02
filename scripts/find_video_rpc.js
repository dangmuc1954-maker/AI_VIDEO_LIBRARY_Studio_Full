const fs = require('fs');
const content = fs.readFileSync('parent_app_main_index.js', 'utf8');

function searchAround(term) {
  let idx = 0;
  let count = 0;
  while ((idx = content.indexOf(term, idx)) !== -1 && count < 10) {
    const start = Math.max(0, idx - 300);
    const end = Math.min(content.length, idx + term.length + 500);
    console.log(`\n================ MATCH ${count + 1} for ${term} at ${idx} ================`);
    console.log(content.slice(start, end));
    idx += term.length;
    count++;
  }
}

searchAround('videoT2v');
searchAround('videoR2v');
