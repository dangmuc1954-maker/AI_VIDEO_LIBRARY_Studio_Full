const fs = require('fs');

const f = 'app/out/main/index.js';
const c = fs.readFileSync(f, 'utf8');
console.log('app/out/main/index.js length:', c.length);

['google_flow_native_transport', 'fetchVideoMedia', 'executeFlowVideoMediaRpc', 'cacheQueueAsset', 'downloadRemoteAsset'].forEach(target => {
  let idx = 0;
  let count = 0;
  while ((idx = c.indexOf(target, idx)) !== -1) {
    console.log(target, 'at', idx, ':', c.substring(Math.max(0, idx - 100), idx + 200));
    idx += target.length;
    count++;
    if (count > 5) break;
  }
  console.log('Total matches for', target, ':', count);
});
