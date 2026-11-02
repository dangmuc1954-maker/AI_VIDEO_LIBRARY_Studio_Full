const fs = require('fs');

const code = fs.readFileSync('app/out/main/index.js', 'utf8');

// Find function vr(
const idx = code.indexOf('function vr(');
console.log(code.slice(idx, idx + 1000));
