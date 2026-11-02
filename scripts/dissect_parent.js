const fs = require('fs');
const content = fs.readFileSync('extracted_installed_new/out/main/index.js', 'utf8');

// Find where $o is defined
const idxCu = content.indexOf('function Cu(');
console.log('function Cu at', idxCu);

// Find where '$o' is declared
let pos = 0;
while (true) {
  let found = -1;
  for (const decl of ['function $o', '$o =', 'const $o', 'let $o', 'var $o']) {
    const i = content.indexOf(decl, pos);
    if (i !== -1 && (found === -1 || i < found)) {
      found = i;
    }
  }
  if (found === -1) break;
  console.log('Match at', found, ':', content.substring(found - 20, found + 200));
  pos = found + 10;
  if (pos > idxCu + 5000) break;
}
