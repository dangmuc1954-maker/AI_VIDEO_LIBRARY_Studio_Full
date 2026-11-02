const fs = require('fs');
const content = fs.readFileSync('parent_app_main_index.js', 'utf8');

function findCallers(name) {
  console.log(`\n================ CALLERS OF ${name} ================`);
  let idx = 0;
  let count = 0;
  while ((idx = content.indexOf(name, idx)) !== -1 && count < 10) {
    const start = Math.max(0, idx - 200);
    const end = Math.min(content.length, idx + name.length + 300);
    console.log(`--- Match at ${idx} ---`);
    console.log(content.slice(start, end));
    idx += name.length;
    count++;
  }
}

findCallers('Lm(');
findCallers('Jm(');
findCallers('submitExecutor');
