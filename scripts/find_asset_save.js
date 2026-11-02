const fs = require('fs');
const content = fs.readFileSync('parent_app_main_index.js', 'utf8');

function findAssetSave() {
  const re = /assets\.saveAsset|saveRemoteAsset|downloadAsset|storeAsset/g;
  let m;
  while ((m = re.exec(content)) !== null) {
    console.log(`Found asset save at ${m.index}:`);
    console.log(content.slice(Math.max(0, m.index - 200), Math.min(content.length, m.index + 800)));
  }
}

findAssetSave();
