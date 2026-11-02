const fs = require('fs');
const content = fs.readFileSync('app/out/main/index.js', 'utf8');

function findNewUa() {
  const re = /new\s+Ua\s*\(/g;
  let m;
  while ((m = re.exec(content)) !== null) {
    console.log(`Found "new Ua(" at index ${m.index}:`);
    console.log(content.slice(Math.max(0, m.index - 300), Math.min(content.length, m.index + 1200)));
  }
}

findNewUa();
