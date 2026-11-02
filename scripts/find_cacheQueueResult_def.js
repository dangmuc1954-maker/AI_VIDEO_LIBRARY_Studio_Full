const fs = require('fs');
const content = fs.readFileSync('parent_app_main_index.js', 'utf8');

function findDef(name) {
  const idx = content.indexOf(`async cacheQueueResult(`);
  if (idx !== -1) {
    console.log(`Found async cacheQueueResult at ${idx}:`);
    console.log(content.slice(idx, idx + 2500));
  } else {
    const idx2 = content.indexOf(`cacheQueueResult(`);
    console.log(`Found cacheQueueResult at ${idx2}:`);
    console.log(content.slice(idx2, idx2 + 2500));
  }
}

findDef();
