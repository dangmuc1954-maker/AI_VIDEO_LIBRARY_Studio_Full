const fs = require('fs');
const content = fs.readFileSync('parent_app_main_index.js', 'utf8');

function findDef(name) {
  const re = /async downloadRemoteAsset\(/g;
  let m = re.exec(content);
  if (!m) {
    const re2 = /downloadRemoteAsset\(/g;
    m = re2.exec(content);
  }
  if (m) {
    console.log(`Found at ${m.index}:`);
    console.log(content.slice(m.index, m.index + 2000));
  }
}

findDef();
