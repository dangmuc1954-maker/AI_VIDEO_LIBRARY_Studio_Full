const fs = require('fs');
const path = require('path');

const installedDir = 'C:\\Users\\admin\\AppData\\Local\\Programs\\AI VIDEO LIBRARY\\resources\\app\\out\\main';

const files = [
  'google_flow_native_transport.cjs',
  'index.js'
];

for (const f of files) {
  const src = path.join(__dirname, '../app/out/main', f);
  const dest = path.join(installedDir, f);
  if (fs.existsSync(src)) {
    fs.copyFileSync(src, dest);
    console.log(`Copied ${f} to installed app!`);
  }
}
