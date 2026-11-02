const fs = require('fs');

const code = fs.readFileSync('temp_original_asar/out/main/index.js', 'utf8');

const start = 163364;
console.log(code.slice(start, start + 3000));
