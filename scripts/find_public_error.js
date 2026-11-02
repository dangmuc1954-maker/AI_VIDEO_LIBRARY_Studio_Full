const fs = require('fs');

const content = fs.readFileSync('parent_app_main_index.js', 'utf8');

function findSnippets(term, radius = 300) {
  console.log(`\n=================== SNIPPETS FOR: ${term} ===================`);
  let idx = 0;
  let count = 0;
  while ((idx = content.indexOf(term, idx)) !== -1 && count < 10) {
    const start = Math.max(0, idx - radius);
    const end = Math.min(content.length, idx + term.length + radius);
    console.log(`--- [Match ${count + 1} at char ${idx}] ---`);
    console.log(content.slice(start, end));
    idx += term.length;
    count++;
  }
}

findSnippets('PUBLIC_ERROR');
