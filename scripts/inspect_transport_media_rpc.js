const fs = require('fs');
const c = fs.readFileSync('app/out/main/google_flow_native_transport.cjs', 'utf8');

const target = 'executeFlowVideoMediaRpc';
let idx = c.indexOf(target);
console.log('executeFlowVideoMediaRpc at', idx);
if (idx !== -1) {
  console.log(c.substring(idx - 100, idx + 2500));
}
