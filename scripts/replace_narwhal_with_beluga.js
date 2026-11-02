const fs = require('fs');
const path = require('path');

const file = path.join(__dirname, '../app/out/main/index.js');
let content = fs.readFileSync(file, 'utf8');

const countBefore = (content.match(/NARWHAL/g) || []).length;
console.log('NARWHAL count before:', countBefore);

content = content.replace(/NARWHAL/g, 'BELUGA');

const countAfter = (content.match(/NARWHAL/g) || []).length;
const belugaCount = (content.match(/BELUGA/g) || []).length;
console.log('NARWHAL count after:', countAfter);
console.log('BELUGA count after:', belugaCount);

fs.writeFileSync(file, content, 'utf8');
console.log('Successfully replaced all occurrences in', file);
