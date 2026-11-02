const fs = require('fs');

const mainCode = fs.readFileSync('app/out/main/index.js', 'utf8');

const start = 346500;
console.log(mainCode.slice(start, start + 3500));
