const fs = require('fs');
const file = 'app/out/renderer/assets/index-BS7vgKVV.js';
let content = fs.readFileSync(file, 'utf8');

// 1. addPromptList
const target1 = 'referenceAssetIds:refs,sceneName:sName,title:sName}});const p=ta([...c.promptRows,...h]);';
const replace1 = 'referenceAssetIds:refs,userReferenceAssetIds:(orig&&Array.isArray(orig.userReferenceAssetIds))?orig.userReferenceAssetIds:refs,sceneName:sName,title:sName}});const p=ta([...c.promptRows,...h]);';

if (!content.includes(target1)) {
  console.error('Target 1 in index not found!');
  process.exit(1);
}
content = content.replace(target1, replace1);

// 2. Gn serialization
const target2 = 'referenceAssetIds:a.referenceAssetIds||[],autoUpscale:a.autoUpscale===!0,autoRemoveWatermark:a.autoRemoveWatermark===!0}))))';
const replace2 = 'referenceAssetIds:a.referenceAssetIds||[],userReferenceAssetIds:a.userReferenceAssetIds||a.referenceAssetIds||[],title:a.title||a.sceneName||"",sceneMode:a.sceneMode||"",autoUpscale:a.autoUpscale===!0,autoRemoveWatermark:a.autoRemoveWatermark===!0}))))';

if (!content.includes(target2)) {
  console.error('Target 2 in index not found!');
  process.exit(1);
}
content = content.replace(target2, replace2);

// 3. pE deserialization
const target3 = 'autoUpscale:c.autoUpscale===!0,autoRemoveWatermark:c.autoRemoveWatermark===!0}]});return ta(r)}catch{return[]}}';
const replace3 = 'userReferenceAssetIds:Array.isArray(c.userReferenceAssetIds)?c.userReferenceAssetIds:(Array.isArray(c.referenceAssetIds)?c.referenceAssetIds:[]),title:typeof c.title=="string"?c.title:(c.sceneName||""),sceneName:c.sceneName||c.title||("Cảnh "+(s+1)),sceneMode:c.sceneMode||"",autoUpscale:c.autoUpscale===!0,autoRemoveWatermark:c.autoRemoveWatermark===!0}]});return ta(r)}catch{return[]}}';

if (!content.includes(target3)) {
  console.error('Target 3 in index not found!');
  process.exit(1);
}
content = content.replace(target3, replace3);

fs.writeFileSync(file, content, 'utf8');
console.log('Successfully updated index-BS7vgKVV.js');

