const fs = require('fs');
const path = require('path');

const parentFile = path.join(__dirname, '../extracted_installed_new/out/main/index.js');
const content = fs.readFileSync(parentFile, 'utf8');

// Let's find definition of Hu: "class Hu"
let idx = content.indexOf('class Hu');
if (idx !== -1) {
  console.log('Found class Hu:');
  console.log(content.slice(idx, idx + 1500));
} else {
  console.log('class Hu not found, searching =class Hu or Hu=');
  let idx2 = 0;
  while ((idx2 = content.indexOf('Hu', idx2)) !== -1) {
    if (content.slice(idx2 - 10, idx2 + 10).includes('class') || content.slice(idx2 - 5, idx2 + 5).includes('new')) {
      console.log('Near Hu:', content.slice(Math.max(0, idx2 - 50), Math.min(content.length, idx2 + 300)));
    }
    idx2 += 2;
    if (idx2 > 150000) break;
  }
}
