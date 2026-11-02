const fs = require('fs');

const code = fs.readFileSync('app/out/main/index.js', 'utf8');

const start = code.indexOf('async executeFlowVideoRpc(');
// Find next method, e.g. async executeFlowVideoStatusRpc(
const end = code.indexOf('async executeFlowVideoStatusRpc(', start);

console.log('executeFlowVideoRpc: start =', start, 'end =', end, 'len =', end - start);
console.log('Current executeFlowVideoRpc snippet:\n', code.slice(start, start + 400));
console.log('...\n', code.slice(end - 200, end));
