const fs = require('fs');
const code = fs.readFileSync('extracted_installed_new/out/renderer/assets/VideoStudio-Dphito0R.js', 'utf8');

console.log('VideoStudio length:', code.length);

const keywords = ['veo-3.1', 'veo-3', '720p', '1080p', 'Components', 'autoMerge', 'watermark'];
for (const kw of keywords) {
  let count = 0, idx = 0;
  while ((idx = code.indexOf(kw, idx)) !== -1) {
    count++;
    idx += kw.length;
  }
  console.log(`Keyword "${kw}": ${count} matches`);
}
