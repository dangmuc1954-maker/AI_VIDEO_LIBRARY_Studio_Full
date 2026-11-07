const fs = require('fs');

console.log('--- Patching StudioFailedBulkActions-Zv2NpUPy.js ---');
let code = fs.readFileSync('app/out/renderer/assets/StudioFailedBulkActions-Zv2NpUPy.js', 'utf-8');

const target = 'title: sTitle\n        };';
const replacement = 'title: sTitle,\n          sceneMode: idx === 0 ? "new" : "continue"\n        };';

if (!code.includes(target)) {
  console.error('Target not found in StudioFailedBulkActions-Zv2NpUPy.js');
  process.exit(1);
}

code = code.replace(target, replacement);
fs.writeFileSync('app/out/renderer/assets/StudioFailedBulkActions-Zv2NpUPy.js', code, 'utf-8');
console.log('✓ Successfully patched StudioFailedBulkActions-Zv2NpUPy.js');

