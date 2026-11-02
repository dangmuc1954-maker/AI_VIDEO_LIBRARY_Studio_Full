const fs = require('fs');
const content = fs.readFileSync('parent_app_main_index.js', 'utf8');

const idx = content.indexOf('function GB(');
if (idx !== -1) {
  console.log(`Found function GB at ${idx}:`);
  console.log(content.slice(idx, idx + 500));
} else {
  const idx2 = content.indexOf('GB=');
  console.log(`Found GB= at ${idx2}:`);
  console.log(content.slice(idx2, idx2 + 500));
}
