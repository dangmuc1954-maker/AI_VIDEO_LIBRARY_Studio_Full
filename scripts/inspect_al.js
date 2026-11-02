const fs = require('fs');

const code = fs.readFileSync('app/out/main/index.js', 'utf8');

const idx = code.indexOf('function al(');
console.log(code.slice(idx, idx + 1500));
