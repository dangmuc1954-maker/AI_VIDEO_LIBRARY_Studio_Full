const fs = require('fs');

const code = fs.readFileSync('app/out/main/index.js', 'utf8');

const start = code.indexOf('function nl(');
// In the original, function nl ended right before function Rn( or function al(
// Let's see what comes after function nl in app/out/main/index.js
const endAl = code.indexOf('function al(', start);
const endRn = code.indexOf('function Rn(', start);

console.log('function nl start:', start);
console.log('end before function al:', endAl);
console.log('end before function Rn:', endRn);
