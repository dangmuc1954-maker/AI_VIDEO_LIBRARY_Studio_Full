const fs = require('fs');
const content = fs.readFileSync('extracted_installed_new/out/main/index.js', 'utf8');

// Search for places where banana and veo3 are checked together
const regex = /providerId\s*===?\s*["']banana["']\s*\|\|\s*[^)]*providerId\s*===?\s*["']veo3["']/g;
let m;
while ((m = regex.exec(content)) !== null) {
  console.log('Match at', m.index);
  console.log(content.substring(Math.max(0, m.index - 100), m.index + 300));
}
