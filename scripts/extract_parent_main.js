const fs = require('fs');
const asar = require('C:/Users/admin/AppData/Local/npm-cache/_npx/8b3f11f22d4db0c9/node_modules/asar');

const asarPath = 'C:/Users/admin/AppData/Local/Programs/aiforge-studio/resources/app.asar';
const destFile = 'd:/dự án antigravity/AIForge_Veo3_Studio/parent_app_main_index.js';

try {
  // Try extracting out/main/index.js
  const content = asar.extractFile(asarPath, 'out/main/index.js');
  fs.writeFileSync(destFile, content);
  console.log('SUCCESS! Extracted out/main/index.js, size:', content.length);
} catch (e1) {
  try {
    const content2 = asar.extractFile(asarPath, 'out\\main\\index.js');
    fs.writeFileSync(destFile, content2);
    console.log('SUCCESS with backslash! size:', content2.length);
  } catch (e2) {
    console.error('FAIL:', e1.message, e2.message);
  }
}
