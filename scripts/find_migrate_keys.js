const fs = require('fs');
const content = fs.readFileSync('extracted_installed_new/out/main/index.js', 'utf8');

let idx = 0;
while ((idx = content.indexOf('migrateGoogleFlowAccountKeys', idx)) !== -1) {
  console.log('migrateGoogleFlowAccountKeys at', idx);
  console.log(content.substring(Math.max(0, idx - 200), idx + 400));
  idx += 28;
}
