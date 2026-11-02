const fs = require('fs');
const content = fs.readFileSync('app/out/main/index.js', 'utf8');

function findInOurApp() {
  const re = /new\s+\$m\s*\(/g;
  let m;
  while ((m = re.exec(content)) !== null) {
    console.log(`Found "new $m(" at index ${m.index}:`);
    console.log(content.slice(Math.max(0, m.index - 500), Math.min(content.length, m.index + 1500)));
  }
}

findInOurApp();
