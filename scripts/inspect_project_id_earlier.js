const fs = require('fs');

const code = fs.readFileSync('temp_original_asar/out/main/index.js', 'utf8');

const start = 342000;
console.log(code.slice(start, start + 1500));
