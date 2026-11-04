const fs = require('fs');
const main = fs.readFileSync('app/out/main/index.js', 'utf8');
const pos = main.indexOf('function MB()');
console.log(main.slice(pos, pos + 800));
