const fs = require('fs');

const code = fs.readFileSync('temp_original_asar/out/main/index.js', 'utf8');

const start = code.indexOf('function Ku(');
console.log(code.slice(start, start + 2500));
