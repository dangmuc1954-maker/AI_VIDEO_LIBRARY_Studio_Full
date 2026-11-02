const fs = require('fs');
const path = require('path');

const partDir = path.join(process.env.APPDATA, 'AI_VIDEO_LIBRARY_DATA/Partitions');
if (fs.existsSync(partDir)) {
  console.log('Partitions dir:');
  const items = fs.readdirSync(partDir);
  for (const item of items) {
    const p = path.join(partDir, item);
    const stat = fs.statSync(p);
    console.log(item, stat.isDirectory() ? '(dir)' : '(file)');
    if (stat.isDirectory()) {
      const netDir = path.join(p, 'Network');
      if (fs.existsSync(netDir)) {
        console.log('  Network files:', fs.readdirSync(netDir));
      }
    }
  }
} else {
  console.log('No Partitions dir');
}
