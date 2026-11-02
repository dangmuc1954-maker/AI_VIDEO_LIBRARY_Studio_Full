const fs = require('fs');
const content = fs.readFileSync('parent_app_main_index.js', 'utf8');

function findFn(name) {
  const idx = content.indexOf(`function ${name}(`);
  if (idx !== -1) {
    console.log(`=== ${name} at ${idx} ===`);
    console.log(content.slice(idx, idx + 1000));
  }
}

findFn('si');
findFn('hr');
findFn('Cu');
findFn('$o');
