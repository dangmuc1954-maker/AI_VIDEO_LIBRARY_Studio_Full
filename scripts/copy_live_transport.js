const fs = require('fs');
const path = require('path');

const src = path.join(__dirname, '../app/out/main/google_flow_native_transport.cjs');
const dest = 'C:\\Users\\admin\\AppData\\Local\\Programs\\AI VIDEO LIBRARY\\resources\\app\\out\\main\\google_flow_native_transport.cjs';

if (fs.existsSync(path.dirname(dest))) {
  fs.copyFileSync(src, dest);
  console.log('Successfully copied to installed app at:', dest);
} else {
  console.log('Destination directory does not exist:', path.dirname(dest));
}
