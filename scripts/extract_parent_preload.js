const fs = require('fs');
const asar = require('C:/Users/admin/AppData/Local/npm-cache/_npx/8b3f11f22d4db0c9/node_modules/asar');

const asarPath = 'C:/Users/admin/AppData/Local/Programs/aiforge-studio/resources/app.asar';

try {
  const preload = asar.extractFile(asarPath, 'out\\preload\\index.cjs');
  fs.writeFileSync('d:/dự án antigravity/AIForge_Veo3_Studio/parent_app_preload.cjs', preload);
  console.log('Extracted preload, size:', preload.length);
} catch (e) {
  console.log('Preload extract err:', e.message);
}
