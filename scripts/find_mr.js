const fs = require('fs');
const content = fs.readFileSync('parent_app_main_index.js', 'utf8');

function findDefinition(name) {
  const re = new RegExp(`function\\s+${name}\\s*\\(`, 'g');
  let m = re.exec(content);
  if (!m) {
    const re2 = new RegExp(`const\\s+${name}\\s*=`, 'g');
    m = re2.exec(content);
  }
  if (!m) {
    const re3 = new RegExp(`${name}\\s*=\\s*\\(`, 'g');
    m = re3.exec(content);
  }
  if (m) {
    console.log(`Found ${name} at index ${m.index}:`);
    console.log(content.slice(m.index, m.index + 2500));
  } else {
    console.log(`Could not find ${name}`);
  }
}

findDefinition('mr');
