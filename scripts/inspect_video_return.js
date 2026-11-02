const fs = require('fs');
const content = fs.readFileSync('extracted_installed_new/out/main/index.js', 'utf8');

const target = 'Collecting generated video';
const idx = content.indexOf(target);
console.log('continuation at', idx);
if (idx !== -1) {
  console.log(content.substring(idx - 200, idx + 2500));
}
