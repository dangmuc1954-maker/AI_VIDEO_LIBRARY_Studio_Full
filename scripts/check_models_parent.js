const fs = require('fs');
const path = require('path');

const parentFile = path.join(__dirname, '../extracted_installed_new/out/main/index.js');
const content = fs.readFileSync(parentFile, 'utf8');

console.log('Parent app NARWHAL count:', (content.match(/NARWHAL/g) || []).length);
console.log('Parent app BELUGA count:', (content.match(/BELUGA/g) || []).length);
console.log('Parent app GEM_PIX_2 count:', (content.match(/GEM_PIX_2/g) || []).length);
console.log('Parent app IMAGEN_3_5 count:', (content.match(/IMAGEN_3_5/g) || []).length);
