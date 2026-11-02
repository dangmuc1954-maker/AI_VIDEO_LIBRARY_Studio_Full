const fs = require('fs');

const code = fs.readFileSync('app/out/main/index.js', 'utf8');

const idx = code.indexOf('"video job started via RPC"');
console.log(code.slice(idx - 50, idx + 1200));
