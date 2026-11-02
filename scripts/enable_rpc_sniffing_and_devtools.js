const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const targetFile = path.resolve(__dirname, '../app/out/main/index.js');
let code = fs.readFileSync(targetFile, 'utf8');

console.log('=== KÍCH HOẠT AUTO RPC CAPTURE & MỞ KHÓA DEVTOOLS F12 TRÊN BROWSER HUB ===');

// 1. BẬT isFlowRpcCaptureEnabled LUÔN LUÔN LÀ TRUE
const captureCheckTarget = 'isFlowRpcCaptureEnabled(){return F.isPackaged?!1:process.env.AIFORGE_FLOW_CAPTURE==="true"}';
const captureCheckReplacement = 'isFlowRpcCaptureEnabled(){return !0}';

if (code.includes(captureCheckTarget)) {
  code = code.replace(captureCheckTarget, captureCheckReplacement);
  console.log('✅ 1. Đã bật isFlowRpcCaptureEnabled: true (kể cả trên bản đóng gói)');
} else {
  console.log('⚠️ Không tìm thấy captureCheckTarget chính xác, tìm vị trí thay thế...');
  code = code.replace(/isFlowRpcCaptureEnabled\(\)\{[^}]+\}/, 'isFlowRpcCaptureEnabled(){return !0}');
  console.log('✅ 1. Đã thay thế isFlowRpcCaptureEnabled thành return !0');
}

// 2. GHI TOÀN BỘ GÓI TIN BẮT ĐƯỢC VÀO FILE flow_live_captured_rpc.json TRÊN Ổ D
const handleCaptureTarget = 'handleCapturedFlowRpc(e,t){if(!(F.isPackaged||!this.isFlowRpcCaptureEnabled()))try{const A=ca(e,t);A&&ga(A,F.getPath("userData"))}catch(A){B("google-flow-captured-rpc","lỗi xử lý captured rpc",{error:v(A)})}}';
const handleCaptureReplacement = `handleCapturedFlowRpc(e,t){
  try{
    const logPath = 'D:\\\\dự án antigravity\\\\AIForge_Veo3_Studio\\\\flow_live_captured_rpc.json';
    const entry = typeof t === 'string' ? t : JSON.stringify(t);
    require('fs').appendFileSync(logPath, JSON.stringify({ accountId: e, captured: t, time: new Date().toISOString() }) + '\\n');
    console.log('[AUTO-SNIFFER] ĐÃ BẮT ĐƯỢC GÓI TIN RPC GOOGLE FLOW TỪ TÀI KHOẢN:', e);
  }catch(_){}
  try{const A=ca(e,t);A&&ga(A,F.getPath("userData"))}catch(A){B("google-flow-captured-rpc","lỗi xử lý captured rpc",{error:v(A)})}
}`;

if (code.includes(handleCaptureTarget)) {
  code = code.replace(handleCaptureTarget, handleCaptureReplacement);
  console.log('✅ 2. Đã nối hook ghi file flow_live_captured_rpc.json');
} else {
  console.log('⚠️ Không tìm thấy handleCaptureTarget chính xác, tìm pattern...');
  const idx = code.indexOf('handleCapturedFlowRpc(e,t){');
  if (idx !== -1) {
    const endIdx = code.indexOf('}}async drainCapturedGoogleFlowRpcs', idx);
    if (endIdx !== -1) {
      code = code.slice(0, idx) + handleCaptureReplacement + code.slice(endIdx + 2);
      console.log('✅ 2. Đã thay thế handleCapturedFlowRpc bằng pattern');
    }
  }
}

// 3. MỞ KHÓA DEVTOOLS (F12) VÀ CHO PHÉP MỞ TRỰC TIẾP TRÊN BROWSER HUB
const mBTarget = 'function mB(){F.isPackaged&&F.on("web-contents-created",(r,e)=>{e.on("before-input-event",(t,A)=>{pB(A)&&t.preventDefault()}),e.on("devtools-opened",()=>{e.closeDevTools()})})}';
const mBReplacement = `function mB(){
  F.on("web-contents-created",(r,e)=>{
    e.on("before-input-event",(t,A)=>{
      if (A.type === "keyDown" && (A.key === "F12" || (A.control && A.shift && A.key.toLowerCase() === "i"))) {
        try {
          if (e.isDevToolsOpened()) {
            e.closeDevTools();
          } else {
            e.openDevTools({ mode: "detach" });
          }
        } catch(_) {}
        t.preventDefault();
      }
    });
  });
}`;

if (code.includes(mBTarget)) {
  code = code.replace(mBTarget, mBReplacement);
  console.log('✅ 3. Đã mở khóa phím F12 và Ctrl+Shift+I cho toàn bộ ứng dụng & Browser Hub');
}

// 4. BẬT devTools: true TRONG getOrCreateView CỦA BROWSER HUB
const devToolsPrefTarget = 'devTools:!F.isPackaged';
code = code.replaceAll(devToolsPrefTarget, 'devTools:!0');
console.log('✅ 4. Đã bật devTools: true trong toàn bộ WebContentsView');

// GHI RA TARGET FILE VÀ KIỂM TRA CÚ PHÁP
fs.writeFileSync(targetFile, code, 'utf8');

fs.copyFileSync(targetFile, 'temp_check_sniffer.mjs');
try {
  execSync('node --check temp_check_sniffer.mjs', { stdio: 'pipe' });
  console.log('🎉🎉🎉 KIỂM TRA CÚ PHÁP: 100% HOÀN HẢO!');
} catch (syntaxErr) {
  console.error('❌ Lỗi cú pháp:', syntaxErr.stderr.toString());
  process.exit(1);
} finally {
  try { fs.unlinkSync('temp_check_sniffer.mjs'); } catch(_) {}
}

console.log('✅ HOÀN TẤT KÍCH HOẠT AUTO RPC SNIFFER & DEVTOOLS F12!');
