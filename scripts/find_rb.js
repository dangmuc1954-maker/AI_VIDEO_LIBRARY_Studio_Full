const fs = require('fs');
const content = fs.readFileSync('parent_app_main_index.js', 'utf8');

function findRB() {
  const idx = content.indexOf('function RB(');
  if (idx !== -1) {
    console.log(`Found function RB at ${idx}:`);
    console.log(content.slice(idx, idx + 1000));
  } else {
    const idx2 = content.indexOf('RB=');
    console.log(`Found RB= at ${idx2}:`);
    console.log(content.slice(idx2, idx2 + 1000));
  }
}

findRB();
