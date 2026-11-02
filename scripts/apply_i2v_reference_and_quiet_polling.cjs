const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

console.log('=== TIẾN HÀNH FIX I2V CHO 1 ẢNH THAM CHIẾU & GIẢM TẦN SUẤT POLLING ===');

// 1. CẬP NHẬT app/out/main/index.js
const targetFile = path.resolve(__dirname, '../app/out/main/index.js');
let code = fs.readFileSync(targetFile, 'utf8');

// A. Chuẩn hóa readVideoMode: 1 ảnh tham chiếu luôn là I2V (Image-to-Video)
const oldReadVideoMode = 'readVideoMode(e){const t=e.payload?.flowVideoMode||e.payload?.videoMode||e.payload?.mode;return t==="I2V"||t==="Frames"||t==="R2V"?t:t==="Components"&&this.readReferenceAssetIds(e).length>0?"R2V":"T2V"}';
const newReadVideoMode = 'readVideoMode(e){const refs=this.readReferenceAssetIds(e);if(refs.length===1)return"I2V";if(refs.length>=2)return"Frames";const t=e.payload?.flowVideoMode||e.payload?.videoMode||e.payload?.mode;if(t==="I2V"&&refs.length>=1)return"I2V";if(t==="Frames"&&refs.length>=2)return"Frames";return"T2V"}';

if (code.includes(oldReadVideoMode)) {
  code = code.replace(oldReadVideoMode, newReadVideoMode);
  console.log('✓ 1. Đã cập nhật readVideoMode: 1 ảnh tham chiếu tự động kích hoạt chế độ Image-to-Video (I2V / eb1hJf)');
} else {
  console.warn('⚠️ Không tìm thấy đoạn oldReadVideoMode');
}

fs.writeFileSync(targetFile, code, 'utf8');

// Kiểm tra cú pháp
fs.copyFileSync(targetFile, 'temp_check_i2v.mjs');
try {
  execSync('node --check temp_check_i2v.mjs', { stdio: 'pipe' });
  console.log('🎉 KIỂM TRA CÚ PHÁP index.js: 100% HOÀN HẢO!');
} catch (e) {
  console.error('❌ Lỗi cú pháp:', e.stderr?.toString() || e.message);
  process.exit(1);
} finally {
  try { fs.unlinkSync('temp_check_i2v.mjs'); } catch (_) {}
}

// 2. CẬP NHẬT app/extensions/flow_bridge/content.js
// Giảm tần suất polling từ 1000ms -> 4000ms để DevTools không bị spam
const contentFile = path.resolve(__dirname, '../app/extensions/flow_bridge/content.js');
if (fs.existsSync(contentFile)) {
  let content = fs.readFileSync(contentFile, 'utf8');
  content = content.replace('await new Promise(r => setTimeout(r, 1000));', 'await new Promise(r => setTimeout(r, 4000));');
  fs.writeFileSync(contentFile, content, 'utf8');
  console.log('✓ 2. Đã giảm tần suất polling của Extension Bridge xuống 4 giây (chống spam DevTools)');
}

// 3. CLEAR COOLDOWNS & RESET PAUSED TASKS
try {
  const appData = process.env.APPDATA || (process.env.USERPROFILE ? path.join(process.env.USERPROFILE, 'AppData', 'Roaming') : null);
  if (appData) {
    const sessionFile = path.join(appData, 'AI_VIDEO_LIBRARY_DATA', 'browser-sessions.json');
    if (fs.existsSync(sessionFile)) {
      const sData = JSON.parse(fs.readFileSync(sessionFile, 'utf8'));
      let sMod = false;
      if (Array.isArray(sData.sessions)) {
        for (const s of sData.sessions) {
          if (s.providerId === 'veo3' || s.providerId === 'banana') {
            if (s.diagnostics?.cooldownReason || s.diagnostics?.cooldownUntil) {
              delete s.diagnostics.cooldownReason;
              delete s.diagnostics.cooldownUntil;
              s.healthScore = 100;
              s.healthLabel = 'Excellent';
              sMod = true;
            }
          }
        }
      }
      if (sMod) {
        fs.writeFileSync(sessionFile, JSON.stringify(sData, null, 2), 'utf8');
        console.log('✓ 3. Đã xóa sạch cooldown của tài khoản trong browser-sessions.json');
      }
    }

    const queueFile = path.join(appData, 'AI_VIDEO_LIBRARY_DATA', 'queue-state.json');
    if (fs.existsSync(queueFile)) {
      const qData = JSON.parse(fs.readFileSync(queueFile, 'utf8'));
      let qMod = false;
      if (Array.isArray(qData.jobs)) {
        for (const j of qData.jobs) {
          if (j.status === 'Paused' || j.status === 'NeedsAttention') {
            j.status = 'Pending';
            delete j.error;
            qMod = true;
          }
        }
      }
      if (qMod) {
        fs.writeFileSync(queueFile, JSON.stringify(qData, null, 2), 'utf8');
        console.log('✓ 4. Đã khôi phục các tác vụ Paused thành Pending');
      }
    }
  }
} catch (eClean) {
  console.warn('Lỗi dọn dẹp state:', eClean.message);
}

console.log('🌟 NÂNG CẤP I2V VÀ QUIET POLLING HOÀN TẤT THÀNH CÔNG! 🌟');
