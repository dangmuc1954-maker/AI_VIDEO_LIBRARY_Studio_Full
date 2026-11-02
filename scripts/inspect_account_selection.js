const fs = require('fs');
const path = require('path');

const parentFile = path.join(__dirname, '../extracted_installed_new/out/main/index.js');
const content = fs.readFileSync(parentFile, 'utf8');

// Search for where accounts are selected for a job in the scheduler
function findSnippet(keyword, len = 600) {
  let idx = 0;
  while ((idx = content.indexOf(keyword, idx)) !== -1) {
    console.log(`\n=== Found '${keyword}' at ${idx} ===`);
    console.log(content.slice(Math.max(0, idx - 50), Math.min(content.length, idx + len)));
    idx += keyword.length;
    if (idx > 1000000) break;
  }
}

findSnippet('accountSelection', 400);
