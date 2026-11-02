const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '../app/out/main/index.js');
let content = fs.readFileSync(filePath, 'utf8');

// Tìm vị trí của resolveImage và isInvalidMediaError trong ReferenceResolver
const needle = 'uploadLocks=new Map;async resolveImage(e){';
const startIdx = content.indexOf(needle);

if (startIdx === -1) {
  console.error('[-] Không tìm thấy needle trong app/out/main/index.js');
  process.exit(1);
}

console.log('[+] Tìm thấy ReferenceResolver tại index:', startIdx);

// Tìm đoạn kết thúc của isInvalidMediaError
const endNeedle = 'async uploadImage(e,t){';
const endIdx = content.indexOf(endNeedle, startIdx);

if (endIdx === -1) {
  console.error('[-] Không tìm thấy endNeedle trong app/out/main/index.js');
  process.exit(1);
}

const currentBlock = content.substring(startIdx, endIdx);
console.log('Block hiện tại:\n', currentBlock);

const newBlock = `uploadLocks=new Map;async resolveImage(e){const t=this.assets.getAsset(e.assetId);if(!t)throw new p("PROVIDER_REJECTED",\`Missing reference asset \${e.assetId}\`);if(t.type!=="image")throw new p("PROVIDER_REJECTED",\`\${t.name} is not an image reference\`);await this.assets.pinAsReference(t.id);const A=e.forceUpload?null:this.assets.getGoogleFlowBinding(t.id,{googleAccountKey:e.googleAccountKey,accountId:e.accountId,mediaKind:"image"});const isReusable=!e.forceUpload&&A&&A.mediaId&&A.originProjectId===e.projectId&&(Date.now()-new Date(A.createdAt||0).getTime()<36e5);if(isReusable){const s={...A,googleAccountKey:e.googleAccountKey,accountId:e.accountId,lastUsedAt:new Date().toISOString()};return await this.assets.upsertGoogleFlowBinding(t.id,s),y("google-flow-reference","reference media reused",{assetId:t.id,accountId:e.accountId,projectId:e.projectId,source:A.source}),{mediaId:A.mediaId,resolution:"reused"}}const o=\`\${t.id}:\${e.googleAccountKey}:\${e.projectId||""}:image\`,n=this.uploadLocks.get(o);if(n)return{mediaId:await n,resolution:"reused"};const a=this.uploadImage(t.id,e);this.uploadLocks.set(o,a);try{return{mediaId:await a,resolution:"uploaded"}}finally{this.uploadLocks.get(o)===a&&this.uploadLocks.delete(o)}}async invalidateImage(e,t){await this.assets.invalidateGoogleFlowBinding(e,t,"image")}isInvalidMediaError(e){if(!e)return!1;const c=e.code,r=String(e.details?.providerReason||"").toUpperCase(),t=String(e.details?.upstreamBody||e.details?.upstreamResponse||e.message||"").toLowerCase();if(c==="CHALLENGE_REQUIRED"||r.includes("UNUSUAL_ACTIVITY")||c==="ACCESS_DENIED"||c==="PROVIDER_REJECTED")return!0;return/media|image input|reference|unusual_activity|challenge/.test(t)&&/not found|invalid|missing|permission|denied|does not exist/.test(t)}`;

content = content.substring(0, startIdx) + newBlock + content.substring(endIdx);

// Thêm debug log vào executeFlowUploadImageRpc để bắt log khi upload ảnh tham chiếu
const uploadLogNeedle = 'if(!d.success||!d.responseText)throw yt(d,d.error||`Google Flow Upload RPC thất bại với status ${d.status}`);return ju(d.responseText,o?.rpcIds?.imageUpload||"maseQ")';
const uploadLogReplacement = `try{const dbgPath=path.join(__dirname,"../../../flow_rpc_debug.log");fs.appendFileSync(dbgPath,JSON.stringify({time:new Date().toISOString(),event:"flow-upload-image-rpc",accountId:e.accountId,projectId:t.projectId,fileName:t.fileName,success:d?.success,status:d?.status,inPageLogs:d?.log,responseSnippet:(d?.responseText||"").slice(0,300)},null,2)+"\\n\\n","utf8")}catch(_){}if(!d.success||!d.responseText)throw yt(d,d.error||\`Google Flow Upload RPC thất bại với status \${d.status}\`);return ju(d.responseText,o?.rpcIds?.imageUpload||"maseQ")`;

if (content.includes(uploadLogNeedle)) {
  content = content.replace(uploadLogNeedle, uploadLogReplacement);
  console.log('[+] Đã thêm debug log vào executeFlowUploadImageRpc thành công');
} else {
  console.log('[!] Không tìm thấy uploadLogNeedle (có thể đã được thêm hoặc sai cú pháp)');
}

fs.writeFileSync(filePath, content, 'utf8');
console.log('🌟 ĐÃ PATCH THÀNH CÔNG ReferenceResolver và isInvalidMediaError trong app/out/main/index.js! 🌟');
