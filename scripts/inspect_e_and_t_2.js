const fs = require('fs');
const content = fs.readFileSync('extracted_installed_new/out/main/index.js', 'utf8');

const target = 'async(f,I)=>{await re.warmRecaptchaSurface(f,I)});bh=i;';
const idx = content.indexOf(target);
console.log(content.substring(idx - 3500, idx - 1500));
