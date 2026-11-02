const fs = require('fs');
const path = require('path');

const targetFile = path.resolve(__dirname, '../app/out/main/index.js');
let code = fs.readFileSync(targetFile, 'utf8');

console.log('=== PHẪU THUẬT NỘI SOI: CHỈ THAY ĐÚNG CƠ CHẾ RPC FLOW CHO BANANA & VEO3 ===');
console.log('Original code length:', code.length);

const startMarker = 'executeFlowImageRpc(e,t,A,o){';
const endMarker = 'async executeFlowListProjectsRpc';

const startIdx = code.indexOf(startMarker);
const endIdx = code.indexOf(endMarker);

if (startIdx === -1 || endIdx === -1) {
  console.error('❌ Không tìm thấy điểm đánh dấu:', { startIdx, endIdx });
  process.exit(1);
}

const replacement = `executeFlowImageRpc(e,t,A,o){
  const transport = require('./google_flow_native_transport.cjs');
  return transport.executeFlowImageRpc(this,e,t,A,o);
}
async executeFlowUploadImageRpc(e,t,A,o){
  const transport = require('./google_flow_native_transport.cjs');
  return transport.executeFlowUploadImageRpc(this,e,t,A,o);
}
async executeFlowUpscaleImageRpc(e,t,A,o){
  const transport = require('./google_flow_native_transport.cjs');
  return transport.executeFlowUpscaleImageRpc(this,e,t,A,o);
}
async executeFlowVideoRpc(e,t,A,o){
  const transport = require('./google_flow_native_transport.cjs');
  return transport.executeFlowVideoRpc(this,e,t,A,o);
}
async executeFlowVideoStatusRpc(e,t,A,o){
  const transport = require('./google_flow_native_transport.cjs');
  return transport.executeFlowVideoStatusRpc(this,e,t,A,o);
}
async executeFlowVideoMediaRpc(e,t,A,o){
  const transport = require('./google_flow_native_transport.cjs');
  return transport.executeFlowVideoMediaRpc(this,e,t,A,o);
}
async executeFlowVideoUpscaleRpc(e,t,A,o){
  const transport = require('./google_flow_native_transport.cjs');
  const resText = await transport.executeFlowVideoUpscaleRpc(this,e,t,A,o);
  return Al(resText);
}
`;

const patchedCode = code.slice(0, startIdx) + replacement + code.slice(endIdx);
fs.writeFileSync(targetFile, patchedCode, 'utf8');
console.log('✅ Đã phẫu thuật thành công! Độ dài mới:', patchedCode.length);
