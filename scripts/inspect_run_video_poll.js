const fs = require('fs');
const content = fs.readFileSync('extracted_installed_new/out/main/index.js', 'utf8');

const target = 'this.videoRpcClient.submitVideo(o,{projectId:A,prompt:c,modelKey:d.';
const idx = content.indexOf(target);
console.log('continuation at', idx);
if (idx !== -1) {
  console.log(content.substring(idx, idx + 4000));
}
