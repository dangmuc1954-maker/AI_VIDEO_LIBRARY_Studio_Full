const fs = require('fs');
const content = fs.readFileSync('parent_app_main_index.js', 'utf8');

// Extract Ym()
const ymIdx = content.indexOf('function Ym(){');
const ymEnd = content.indexOf('function mr(){', ymIdx);
const ymCode = content.slice(ymIdx, ymEnd);

// Extract mr()
const mrIdx = content.indexOf('function mr(){');
const mrEnd = content.indexOf('const Ts="6LdsFiUs', mrIdx);
const mrCode = content.slice(mrIdx, mrEnd);

console.log('--- YM CODE ---');
console.log(ymCode);
console.log('--- MR CODE ---');
console.log(mrCode);
