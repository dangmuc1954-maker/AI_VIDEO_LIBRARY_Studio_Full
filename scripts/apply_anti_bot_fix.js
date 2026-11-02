const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const targetFile = path.resolve(__dirname, '../app/out/main/index.js');
let code = fs.readFileSync(targetFile, 'utf8');

console.log('Original main length:', code.length);

// 1. FIX: Đừng bao giờ hủy (cancel) ảnh/media của Google Flow khi headless
// Trước đây: if(e.isHeadlessMode&&(o.resourceType==="image"||o.resourceType==="media"))return n({cancel:!0})
// Fix thành: if(e.providerId!=="banana"&&e.providerId!=="veo3"&&e.isHeadlessMode&&(o.resourceType==="image"||o.resourceType==="media"))return n({cancel:!0})
const oldCancelRule = 'if(e.isHeadlessMode&&(o.resourceType==="image"||o.resourceType==="media"))return n({cancel:!0})';
const newCancelRule = 'if(e.providerId!=="banana"&&e.providerId!=="veo3"&&e.isHeadlessMode&&(o.resourceType==="image"||o.resourceType==="media"))return n({cancel:!0})';

if (code.includes(oldCancelRule)) {
  code = code.replace(oldCancelRule, newCancelRule);
  console.log('✅ Fix 1: Cho phép Google Flow tải ảnh/media đầy đủ, không bị reCAPTCHA chấm điểm bot!');
} else {
  console.log('ℹ️ Fix 1: Cancel rule đã được cập nhật hoặc không tìm thấy dạng cũ.');
}

// 2. FIX: ensureGoogleFlowViewReady không được ngắt trang sớm (allowEarlyGoogleFlowResolve: !1)
// để trang flow.google.com nạp đầy đủ 100% WIZ_global_data và grecaptcha.enterprise
const oldEnsureNav = 'await this.loadUrl(A,s,{signal:t,allowEarlyGoogleFlowResolve:!0})';
const newEnsureNav = 'await this.loadUrl(A,s,{signal:t,allowEarlyGoogleFlowResolve:!1})';

if (code.includes(oldEnsureNav)) {
  code = code.replace(oldEnsureNav, newEnsureNav);
  console.log('✅ Fix 2: Đảm bảo trang Google Flow nạp hoàn tất 100% tài nguyên, không bị ngắt ngang!');
} else {
  console.log('ℹ️ Fix 2: EnsureNav allowEarlyGoogleFlowResolve đã là false.');
}

// 3. FIX: Ghi log chi tiết ra file D:\\dự án antigravity\\AIForge_Veo3_Studio\\flow_rpc_debug.log
// trong executeFlowVideoRpc và executeFlowVideoStatusRpc để soi từng milisecond và payload
const oldExecRpc = `if(y("browser-view","flow video rpc: kết quả in-page execution",{accountId:e.accountId,projectId:t.projectId,success:d.success,status:d.status,durationMs:Date.now()-n,error:d.error}),!d.success||!d.responseText)throw yt(d,d.error||\`Google Flow Video RPC thất bại với status \${d.status}\`);return Xu(d.responseText)}`;

const newExecRpc = `try {
  const debugLine = JSON.stringify({
    time: new Date().toISOString(),
    event: 'flow-video-rpc-submit',
    accountId: e.accountId,
    projectId: t.projectId,
    modelKey: t.modelKey,
    mode: t.mode,
    ratioEnum: t.ratioEnum,
    prompt: (t.prompt || '').slice(0, 100),
    success: d?.success,
    status: d?.status,
    error: d?.error,
    inPageLogs: d?.log,
    responseSnippet: (d?.responseText || '').slice(0, 1200)
  }, null, 2) + '\\n\\n';
  require('fs').appendFileSync('D:\\\\dự án antigravity\\\\AIForge_Veo3_Studio\\\\flow_rpc_debug.log', debugLine);
} catch(_) {}
if(y("browser-view","flow video rpc: kết quả in-page execution",{accountId:e.accountId,projectId:t.projectId,success:d.success,status:d.status,durationMs:Date.now()-n,error:d.error}),!d.success||!d.responseText)throw yt(d,d.error||\`Google Flow Video RPC thất bại với status \${d.status}\`);return Xu(d.responseText)}`;

if (code.includes(oldExecRpc)) {
  code = code.replace(oldExecRpc, newExecRpc);
  console.log('✅ Fix 3: Đã gắn Debug Logger vào executeFlowVideoRpc!');
}

// Gắn Debug Logger vào status executor
const oldStatusExec = `if(!u.success||!u.responseText){if(u.status===401||u.status===403)throw yt(u,"Google Flow kiểm tra trạng thái video thất bại");return{statusCode:2,status:"GENERATING"}}return el(u.responseText)`;

const newStatusExec = `try {
  if (u?.responseText && (u.responseText.includes('PUBLIC_ERROR') || u.responseText.includes('UNUSUAL_ACTIVITY') || u.status >= 400)) {
    const debugLine = JSON.stringify({
      time: new Date().toISOString(),
      event: 'flow-video-status-poll-warning',
      accountId: e.accountId,
      status: u?.status,
      responseText: (u?.responseText || '').slice(0, 1200)
    }, null, 2) + '\\n\\n';
    require('fs').appendFileSync('D:\\\\dự án antigravity\\\\AIForge_Veo3_Studio\\\\flow_rpc_debug.log', debugLine);
  }
} catch(_) {}
if(!u.success||!u.responseText){if(u.status===401||u.status===403)throw yt(u,"Google Flow kiểm tra trạng thái video thất bại");return{statusCode:2,status:"GENERATING"}}return el(u.responseText)`;

if (code.includes(oldStatusExec)) {
  code = code.replace(oldStatusExec, newStatusExec);
  console.log('✅ Fix 4: Đã gắn Debug Logger vào status poll RPC!');
}

fs.writeFileSync(targetFile, code, 'utf8');
console.log('✅ Đã lưu file target thành công!');

// Kiểm tra syntax
execSync(`node --check "${targetFile}"`);
console.log('✅ Syntax test: 100% VALID!');
