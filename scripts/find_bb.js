const fs = require('fs');
const content = fs.readFileSync('parent_app_main_index.js', 'utf8');

const idx = content.lastIndexOf('bB=', 794491);
console.log(content.slice(idx - 100, idx + 200));
