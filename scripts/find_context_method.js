const fs = require('fs');
const content = fs.readFileSync('parent_app_main_index.js', 'utf8');

function findMethod(name) {
  const idx = content.indexOf(name);
  if (idx !== -1) {
    console.log(`Found ${name} at index ${idx}:`);
    console.log(content.slice(idx, idx + 4000));
  } else {
    console.log(`Could not find ${name}`);
  }
}

findMethod('requestGoogleFlowMainTransportContext');
