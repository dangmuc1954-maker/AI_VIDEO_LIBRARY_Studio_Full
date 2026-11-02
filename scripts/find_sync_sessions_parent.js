const fs = require('fs');
const content = fs.readFileSync('extracted_installed_new/out/main/index.js', 'utf8');

const target = 'syncRuntimeAuthenticatedSessions(';
let idx = content.indexOf(target);
console.log('syncRuntimeAuthenticatedSessions at', idx);
if (idx !== -1) {
  console.log(content.substring(idx - 200, idx + 800));
}
