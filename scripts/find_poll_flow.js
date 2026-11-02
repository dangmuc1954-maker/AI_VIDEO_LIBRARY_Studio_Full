const fs = require('fs');
const content = fs.readFileSync('parent_app_main_index.js', 'utf8');

function findAfterSuccess() {
  const re = /submitVideo/g;
  let m;
  let count = 0;
  while ((m = re.exec(content)) !== null && count < 10) {
    console.log(`\n--- Match at ${m.index} ---`);
    console.log(content.slice(Math.max(0, m.index - 200), Math.min(content.length, m.index + 800)));
    count++;
  }
}

findAfterSuccess();
