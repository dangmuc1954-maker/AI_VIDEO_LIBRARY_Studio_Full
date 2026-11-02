const fs = require('fs');
const content = fs.readFileSync('extracted_installed_new/out/main/index.js', 'utf8');

const target = 'async(f,I)=>{await re.warmRecaptchaSurface(f,I)});bh=i;';
const idx = content.indexOf(target);
console.log('Found target at', idx);
console.log(content.substring(idx - 1500, idx + 500));
