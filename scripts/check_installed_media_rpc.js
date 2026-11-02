const fs = require('fs');
const path = require('path');
const p = path.join(process.env.LOCALAPPDATA, 'Programs', 'AI VIDEO LIBRARY', 'resources', 'app', 'out', 'main', 'google_flow_native_transport.cjs');
const c = fs.readFileSync(p, 'utf8');

const target = 'executeFlowVideoMediaRpc';
let idx = c.indexOf(target);
console.log('Installed executeFlowVideoMediaRpc at', idx);
if (idx !== -1) {
  console.log(c.substring(idx, idx + 1000));
}
