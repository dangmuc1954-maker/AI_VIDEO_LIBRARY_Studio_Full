const fs = require('fs');
const content = fs.readFileSync('parent_app_main_index.js', 'utf8');

function findDefinition(name) {
  const idx = content.indexOf(`function ${name}(`);
  if (idx !== -1) {
    console.log(`Found ${name} at ${idx}:`);
    console.log(content.slice(idx, idx + 2000));
  } else {
    console.log(`Could not find function ${name}`);
  }
}

findDefinition('Rm');
findDefinition('Sm');
findDefinition('Mm');
