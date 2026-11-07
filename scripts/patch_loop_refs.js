const fs = require('fs');

console.log('--- Updating myUserRefs in VideoStudio-frcr8V6s.js ---');
let code = fs.readFileSync('app/out/renderer/assets/VideoStudio-frcr8V6s.js', 'utf-8');

const targetLoop = 'const myUserRefs = getUserOriginalRefs(latestCurP);\n          const isPromptKey = myUserRefs.length > 0 || latestCurP.sceneMode === "new";\n          const isSceneModeNew = latestCurP.sceneMode === "new";';
const replaceLoop = 'const myUserRefs = (Array.isArray(latestCurP.referenceAssetIds) && latestCurP.referenceAssetIds.length > 0) ? latestCurP.referenceAssetIds.filter(id => !String(id).toLowerCase().includes("lastframe")) : getUserOriginalRefs(latestCurP);\n          const isPromptKey = myUserRefs.length > 0;\n          const isSceneModeNew = latestCurP.sceneMode === "new";';

if (!code.includes(targetLoop)) {
  console.log('targetLoop not exact match, let us find it:');
  const idx = code.indexOf('const myUserRefs =');
  console.log(JSON.stringify(code.substring(idx, idx + 200)));
} else {
  code = code.replace(targetLoop, replaceLoop);
  fs.writeFileSync('app/out/renderer/assets/VideoStudio-frcr8V6s.js', code, 'utf-8');
  console.log('✓ Successfully updated myUserRefs in loop');
}

