const fs = require('fs');
const path = require('path');

const dir = path.join(process.env.APPDATA, 'AI_VIDEO_LIBRARY_DATA');
console.log('Files in', dir, ':');
fs.readdirSync(dir).forEach(f => {
  const stat = fs.statSync(path.join(dir, f));
  console.log(f, stat.size, 'bytes');
});
