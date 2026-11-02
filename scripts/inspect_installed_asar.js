const { execSync } = require('child_process');
const fs = require('fs');

const asarPath = 'C:/Users/admin/AppData/Local/Programs/aiforge-studio/resources/app.asar';
const out = execSync(`npx --yes @electron/asar list "${asarPath}"`, { maxBuffer: 15 * 1024 * 1024 }).toString();
const nonModules = out.split('\n').filter(p => !p.startsWith('\\node_modules') && p.trim());
console.log('Non-node_modules files (' + nonModules.length + '):\n');
console.log(nonModules.join('\n'));
