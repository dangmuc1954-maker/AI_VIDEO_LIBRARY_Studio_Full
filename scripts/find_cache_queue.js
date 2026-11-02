const fs = require('fs');
const content = fs.readFileSync('parent_app_main_index.js', 'utf8');

function findCacheQueueResult() {
  const idx = content.indexOf('cacheQueueResult');
  if (idx !== -1) {
    console.log(`Found cacheQueueResult at ${idx}:`);
    console.log(content.slice(idx, idx + 2500));
  } else {
    console.log('Not found');
  }
}

findCacheQueueResult();
