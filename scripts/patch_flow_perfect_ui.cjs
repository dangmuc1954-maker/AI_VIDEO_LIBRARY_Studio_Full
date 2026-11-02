const fs = require('fs');
const path = require('path');

console.log('=== [PATCH FLOW PERFECT UI ENGINE - STEP 2] ===');

const mainFile = path.resolve(__dirname, '../app/out/main/index.js');
let code = fs.readFileSync(mainFile, 'utf8');

const targetVideo = 'const a=await this.ensureGoogleFlowViewReady(e,A),s=nl({params:t,rpcConfig:o});';
const replacementVideo = `const a=await this.ensureGoogleFlowViewReady(e,A);const wc=a.view.webContents;const curUrl=wc.getURL();const targetProjectUrl=t.projectId&&/^[a-f0-9-]{10,}$/i.test(t.projectId)?\`https://flow.google.com/project/\${t.projectId}\`:null;if(targetProjectUrl&&!curUrl.includes(t.projectId)){try{await wc.loadURL(targetProjectUrl);await new Promise(r=>setTimeout(r,2500))}catch(_){}}else if(!curUrl.includes('/project/')){await wc.executeJavaScript("(()=>{const p=document.querySelector('a[href*=\\\"/project/\\\"], [data-project-id]');if(p){p.click();return;}const b=Array.from(document.querySelectorAll('button,[role=\\\"button\\\"],div')).find(el=>/dự án mới|new project|tạo mới/i.test(el.innerText||el.getAttribute('aria-label')||''));if(b)b.click();})()",!0).catch(()=>{});await new Promise(r=>setTimeout(r,3000))}for(let w=0;w<25;w++){const ready=await wc.executeJavaScript("Boolean(document.querySelector('.ProseMirror, textarea, [contenteditable=\\\"true\\\"], [placeholder*=\\\"Bạn muốn tạo\\\"], [data-placeholder*=\\\"Bạn muốn tạo\\\"]'))",!0).catch(()=>!1);if(ready)break;await new Promise(r=>setTimeout(r,400))}const s=nl({params:t,rpcConfig:o});`;

if (code.includes(targetVideo)) {
  code = code.replace(targetVideo, replacementVideo);
  console.log('✅ 1. Đã nâng cấp executeFlowVideoRpc: Tự động tải trang project và đợi DOM sẵn sàng');
} else {
  console.log('⚠️ Không tìm thấy targetVideo exact match, kiểm tra vị trí');
}

const targetImage = 'const a=await this.ensureGoogleFlowViewReady(e,A),s=zu({params:t,rpcConfig:o});';
const replacementImage = `const a=await this.ensureGoogleFlowViewReady(e,A);const wc=a.view.webContents;const curUrl=wc.getURL();const targetProjectUrl=t.projectId&&/^[a-f0-9-]{10,}$/i.test(t.projectId)?\`https://flow.google.com/project/\${t.projectId}\`:null;if(targetProjectUrl&&!curUrl.includes(t.projectId)){try{await wc.loadURL(targetProjectUrl);await new Promise(r=>setTimeout(r,2500))}catch(_){}}else if(!curUrl.includes('/project/')){await wc.executeJavaScript("(()=>{const p=document.querySelector('a[href*=\\\"/project/\\\"], [data-project-id]');if(p){p.click();return;}const b=Array.from(document.querySelectorAll('button,[role=\\\"button\\\"],div')).find(el=>/dự án mới|new project|tạo mới/i.test(el.innerText||el.getAttribute('aria-label')||''));if(b)b.click();})()",!0).catch(()=>{});await new Promise(r=>setTimeout(r,3000))}for(let w=0;w<25;w++){const ready=await wc.executeJavaScript("Boolean(document.querySelector('.ProseMirror, textarea, [contenteditable=\\\"true\\\"], [placeholder*=\\\"Bạn muốn tạo\\\"], [data-placeholder*=\\\"Bạn muốn tạo\\\"]'))",!0).catch(()=>!1);if(ready)break;await new Promise(r=>setTimeout(r,400))}const s=zu({params:t,rpcConfig:o});`;

if (code.includes(targetImage)) {
  code = code.replace(targetImage, replacementImage);
  console.log('✅ 2. Đã nâng cấp executeFlowImageRpc: Tự động tải trang project và đợi DOM sẵn sàng');
} else {
  console.log('⚠️ Không tìm thấy targetImage exact match, kiểm tra vị trí');
}

fs.writeFileSync(mainFile, code, 'utf8');
console.log('💾 Đã lưu thành công app/out/main/index.js');
