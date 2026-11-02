const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const targetFile = path.resolve(__dirname, '../app/out/main/index.js');
let code = fs.readFileSync(targetFile, 'utf8');

const anchor = 'const A=new Ji({webPreferences:{partition:e.partition,contextIsolation:!0,nodeIntegration:!1,sandbox:!0,devTools:!0,backgroundThrottling:!1}});';
const addition = `const A=new Ji({webPreferences:{partition:e.partition,contextIsolation:!0,nodeIntegration:!1,sandbox:!0,devTools:!0,backgroundThrottling:!1}});try{A.webContents.on("before-input-event",(evt,input)=>{if(input.type==="keyDown"&&(input.key==="F12"||(input.control&&input.shift&&input.key.toLowerCase()==="i"))){try{if(A.webContents.isDevToolsOpened())A.webContents.closeDevTools();else A.webContents.openDevTools({mode:"detach"});}catch(_){}evt.preventDefault();}});}catch(_){}`;

if (code.includes(anchor)) {
  code = code.replace(anchor, addition);
  fs.writeFileSync(targetFile, code, 'utf8');
  console.log('✓ Đã gắn phím F12 mở DevTools cho toàn bộ Browser View!');
} else {
  console.log('Anchor already updated or not found');
}

fs.copyFileSync(targetFile, 'temp_check_f12.mjs');
try {
  execSync('node --check temp_check_f12.mjs', { stdio: 'pipe' });
  console.log('🎉 KIỂM TRA CÚ PHÁP index.js: 100% HOÀN HẢO!');
} catch (e) {
  console.error('❌ Lỗi cú pháp:', e.stderr?.toString() || e.message);
  process.exit(1);
} finally {
  try { fs.unlinkSync('temp_check_f12.mjs'); } catch (_) {}
}
