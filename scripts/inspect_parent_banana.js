const fs = require('fs');
const path = require('path');

const parentFile = path.join(__dirname, '../extracted_installed_new/out/main/index.js');
const content = fs.readFileSync(parentFile, 'utf8');

console.log('Parent file length:', content.length);

// Let's find occurrences of runImageJobViaRpc, imageRpcClient, generateImage
function findSnippet(keyword, len = 500) {
  let idx = 0;
  while ((idx = content.indexOf(keyword, idx)) !== -1) {
    console.log(`\n=== Found '${keyword}' at ${idx} ===`);
    console.log(content.slice(Math.max(0, idx - 100), Math.min(content.length, idx + len)));
    idx += keyword.length;
    if (idx > 1000000) break; // limit
  }
}

console.log('--- Searching for runImageJobViaRpc ---');
findSnippet('runImageJobViaRpc', 400);

console.log('--- Searching for generateImage ---');
findSnippet('generateImage(', 400);
