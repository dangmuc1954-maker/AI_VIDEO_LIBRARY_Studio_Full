const fs = require('fs');
const s = fs.readFileSync('app/out/renderer/assets/ImageStudio-4nmpUX3j.js', 'utf8');
let pos = s.indexOf('...ae?{accountId:ae.accountId');
console.log(s.slice(pos - 1000, pos - 400));
