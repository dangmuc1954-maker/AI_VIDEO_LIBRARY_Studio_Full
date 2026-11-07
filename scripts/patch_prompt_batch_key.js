const fs = require('fs');

console.log('--- Patching index-BS7vgKVV.js ---');
let indexCode = fs.readFileSync('app/out/renderer/assets/index-BS7vgKVV.js', 'utf-8');

const targetStr = 'userReferenceAssetIds:(orig&&Array.isArray(orig.userReferenceAssetIds))?orig.userReferenceAssetIds:refs,sceneName:sName,title:sName';
const replaceStr = 'userReferenceAssetIds:(orig&&Array.isArray(orig.userReferenceAssetIds))?orig.userReferenceAssetIds:refs,sceneName:sName,title:sName,sceneMode:(orig&&orig.sceneMode)?orig.sceneMode:(g===0?"new":"continue")';

if (!indexCode.includes(targetStr)) {
  console.error('Target string not found in index-BS7vgKVV.js');
  process.exit(1);
}
indexCode = indexCode.replace(targetStr, replaceStr);

// Patch 2: applySelectedPromptSettings to include userReferenceAssetIds
const oldApply = 'referenceAssetIds:s.referenceAssetIds||[],autoUpscale:s.autoUpscale,autoRemoveWatermark:s.autoRemoveWatermark';
const newApply = 'referenceAssetIds:s.referenceAssetIds||[],userReferenceAssetIds:s.userReferenceAssetIds||s.referenceAssetIds||[],autoUpscale:s.autoUpscale,autoRemoveWatermark:s.autoRemoveWatermark';

if (indexCode.includes(oldApply)) {
  indexCode = indexCode.replace(oldApply, newApply);
  console.log('✓ Patched applySelectedPromptSettings');
}

fs.writeFileSync('app/out/renderer/assets/index-BS7vgKVV.js', indexCode, 'utf-8');
console.log('✓ Successfully patched index-BS7vgKVV.js');
