const asar = require('@electron/asar');
const fs = require('fs');

const asarPath = 'C:/Users/admin/AppData/Local/Programs/aiforge-studio/resources/app.asar';
try {
  // Extract specific file
  const buf = asar.extractFile(asarPath, 'out/main/index.js');
  fs.writeFileSync('scripts/original_aiforge_main.js', buf);
  console.log('Successfully extracted out/main/index.js! Size:', buf.length);
} catch (e) {
  try {
    const buf2 = asar.extractFile(asarPath, '\\out\\main\\index.js');
    fs.writeFileSync('scripts/original_aiforge_main.js', buf2);
    console.log('Successfully extracted \\out\\main\\index.js! Size:', buf2.length);
  } catch (e2) {
    console.error('Both attempts failed:', e.message, e2.message);
  }
}
