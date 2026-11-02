const fs = require('fs');
const content = fs.readFileSync('parent_app_main_index.js', 'utf8');

function findRunJob() {
  const re = /\.runJob\(/g;
  let m;
  let count = 0;
  while ((m = re.exec(content)) !== null && count < 10) {
    console.log(`\n--- Match .runJob( at ${m.index} ---`);
    console.log(content.slice(Math.max(0, m.index - 300), Math.min(content.length, m.index + 1200)));
    count++;
  }
}

findRunJob();
