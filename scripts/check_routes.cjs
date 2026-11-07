const fs = require('fs');
const content = fs.readFileSync('app/out/main/index.js', 'utf8');

const idx = content.indexOf('"assets:extractLastFrame"');
console.log(content.substring(idx + 300, idx + 1200));
