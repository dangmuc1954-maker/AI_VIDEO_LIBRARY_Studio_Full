const fs = require('fs');
const path = require('path');

const partDir = path.join(process.env.APPDATA, 'AI_VIDEO_LIBRARY_DATA/Partitions');
const items = fs.readdirSync(partDir);
items.filter(x => x.includes('banana')).forEach(x => {
  const p = path.join(partDir, x, 'Network/Cookies');
  const sz = fs.existsSync(p) ? fs.statSync(p).size : 0;
  console.log(x, 'Cookie db size:', sz);
});
