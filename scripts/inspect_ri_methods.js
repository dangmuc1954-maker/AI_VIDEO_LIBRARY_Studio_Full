const fs = require('fs');
const content = fs.readFileSync('extracted_installed_new/out/main/index.js', 'utf8');

const target = 'class RI{';
const idx = content.indexOf(target);
console.log('class RI methods:');
console.log(content.substring(idx + 3500, idx + 8000));
