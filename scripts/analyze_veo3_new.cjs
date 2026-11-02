const fs = require('fs');

const code = fs.readFileSync('extracted_installed_new/out/main/index.js', 'utf8');
console.log('Main file length:', code.length);

const terms = ['veo', 'labs.google', 'batchexecute', 'aisandbox', 'MZZa6b', 'generateVideo', 'google-flow', 'FlowVideo', 'abra_t2v', 'PUBLIC_ERROR'];

for (const t of terms) {
  let count = 0;
  let idx = 0;
  while ((idx = code.indexOf(t, idx)) !== -1) {
    count++;
    idx += t.length;
  }
  console.log(`Term "${t}": ${count} matches`);
}
