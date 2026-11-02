const fs = require('fs');
const content = fs.readFileSync('parent_app_main_index.js', 'utf8');

function findDownloadRemoteAsset() {
  const idx = content.indexOf('downloadRemoteAsset(');
  if (idx !== -1) {
    console.log(`Found downloadRemoteAsset at ${idx}:`);
    console.log(content.slice(idx, idx + 2500));
  } else {
    console.log('Not found');
  }
}

findDownloadRemoteAsset();
