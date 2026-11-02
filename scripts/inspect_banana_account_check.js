const fs = require('fs');
const path = require('path');

const parentFile = path.join(__dirname, '../extracted_installed_new/out/main/index.js');
const content = fs.readFileSync(parentFile, 'utf8');

console.log(content.slice(425200, 427200));
