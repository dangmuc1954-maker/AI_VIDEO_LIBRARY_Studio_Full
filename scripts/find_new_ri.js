const fs = require('fs');
const content = fs.readFileSync('parent_app_main_index.js', 'utf8');

function findNewRI() {
  const re = /new\s+RI\s*\(/g;
  let m;
  while ((m = re.exec(content)) !== null) {
    console.log(`Found "new RI(" at index ${m.index}:`);
    console.log(content.slice(Math.max(0, m.index - 500), Math.min(content.length, m.index + 1500)));
  }
}

findNewRI();
