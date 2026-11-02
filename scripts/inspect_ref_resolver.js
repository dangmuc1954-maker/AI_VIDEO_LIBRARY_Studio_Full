const fs = require('fs');

const code = fs.readFileSync('app/out/main/index.js', 'utf8');

const start = 348297; // where async resolveImage was found
console.log(code.slice(start + 800, start + 2500));
