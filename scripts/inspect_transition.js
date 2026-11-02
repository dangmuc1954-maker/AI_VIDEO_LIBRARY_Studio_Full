const fs = require('fs');

const code = fs.readFileSync('app/out/main/index.js', 'utf8');

console.log(code.slice(140250, 140350));
