const fs = require('fs');
const files = [
  'ImageStudio-4nmpUX3j.js',
  'VideoStudio-frcr8V6s.js',
  'VideoFactoryStudio.js',
  'FittingRoomKocStudio.js'
];

files.forEach(file => {
  const p = 'app/out/renderer/assets/' + file;
  if (!fs.existsSync(p)) return;
  const s = fs.readFileSync(p, 'utf8');
  console.log('===', file, '===');
  let pos = 0;
  while ((pos = s.indexOf('accountSelection', pos)) !== -1) {
    console.log(s.slice(Math.max(0, pos - 50), Math.min(s.length, pos + 100)));
    pos += 16;
  }
});
