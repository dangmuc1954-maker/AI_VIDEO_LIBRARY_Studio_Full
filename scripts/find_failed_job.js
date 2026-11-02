const fs = require('fs');
const path = require('path');

const dir = path.join(process.env.APPDATA, 'AI_VIDEO_LIBRARY_DATA');
for (const f of fs.readdirSync(dir)) {
  const full = path.join(dir, f);
  if (fs.statSync(full).isFile() && f.endsWith('.json')) {
    const c = fs.readFileSync(full, 'utf8');
    if (c.includes('job-1793424606173-c1in59')) {
      console.log('Found in', f);
      // find index
      const idx = c.indexOf('job-1793424606173-c1in59');
      console.log(c.slice(Math.max(0, idx - 100), Math.min(c.length, idx + 1000)));
    }
  }
}
