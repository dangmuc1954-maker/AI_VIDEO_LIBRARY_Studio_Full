/*
 * Tris yêu cầu 13/11/2026: cập nhật online KHÔNG được làm mất dữ liệu khách đang làm dở.
 * Nguyên nhân có thể mất: updater gọi app.exit(0) sau 300ms rồi script PowerShell giết tiến trình ngay —
 * dữ liệu trình duyệt của app (localStorage: dự án Studio Kịch Bản, cài đặt…) ghi xuống đĩa theo đợt nên có thể chưa kịp ghi.
 * Sửa (main/updater.cjs — không thuộc lõi gọi model):
 *  1. Trước khi thoát: ép ghi toàn bộ dữ liệu (flushStorageData + cookies.flushStore) của mọi phiên, đợi 1,5s rồi mới thoát.
 *  2. Script cập nhật Windows: đợi app TỰ đóng tối đa 10s, chỉ ép tắt khi quá hạn.
 * Thư mục dữ liệu %APPDATA%\AI_VIDEO_LIBRARY_DATA vẫn không bị đụng tới (updater chỉ ghi đè file chương trình).
 */
const fs = require('fs');
const path = require('path');
const F = path.join(__dirname, '..', 'app', 'out', 'main', 'updater.cjs');
let s = fs.readFileSync(F, 'utf8');
if (s.includes('__flushAllAppData')) { console.error('Đã vá trước đó — dừng.'); process.exit(1); }

const HELPER = `
// Tris 13/11/2026: ép ghi hết dữ liệu (localStorage, IndexedDB, cookies) của mọi phiên xuống đĩa trước khi thoát để cập nhật.
async function __flushAllAppData() {
  try {
    const { session, webContents } = require('electron');
    const seen = new Set();
    const all = [session.defaultSession, ...webContents.getAllWebContents().map(w => w.session)];
    for (const ses of all) {
      if (!ses || seen.has(ses)) continue;
      seen.add(ses);
      try { ses.flushStorageData(); } catch (_) {}
      try { await ses.cookies.flushStore(); } catch (_) {}
    }
  } catch (_) {}
  await new Promise(r => setTimeout(r, 1500));
}
`;
const OLD_EXIT = `      setTimeout(() => {
        try {
          app.exit(0);
        } catch (_) {
          process.exit(0);
        }
      }, 300);`;
const NEW_EXIT = `      __flushAllAppData().finally(() => setTimeout(() => {
        try {
          app.exit(0);
        } catch (_) {
          process.exit(0);
        }
      }, 300));`;
const OLD_PS = `for ($i = 0; $i -lt 15; $i++) {
    $proc = Get-Process -Id $parentPid -ErrorAction SilentlyContinue
    if (-not $proc) { break }
    Stop-Process -Id $parentPid -Force -ErrorAction SilentlyContinue
    Start-Sleep -Milliseconds 200
}`;
const NEW_PS = `# Doi app tu dong (da ghi xong du lieu) toi da 10s, qua han moi ep tat
for ($i = 0; $i -lt 50; $i++) {
    $proc = Get-Process -Id $parentPid -ErrorAction SilentlyContinue
    if (-not $proc) { break }
    Start-Sleep -Milliseconds 200
}
$proc = Get-Process -Id $parentPid -ErrorAction SilentlyContinue
if ($proc) { Stop-Process -Id $parentPid -Force -ErrorAction SilentlyContinue; Start-Sleep -Milliseconds 300 }`;

const nExit = s.split(OLD_EXIT).length - 1, nPs = s.split(OLD_PS).length - 1;
if (nExit !== 2 || nPs !== 1) { console.error(`KHÔNG KHỚP (thoát ${nExit}/2, ps ${nPs}/1). Không ghi.`); process.exit(1); }
s = s.split(OLD_EXIT).join(NEW_EXIT).replace(OLD_PS, () => NEW_PS);
s = s.replace("const { spawn, execSync } = require('child_process');", () => "const { spawn, execSync } = require('child_process');" + HELPER);
const bak = F + '.bak_before_keep_user_data';
if (!fs.existsSync(bak)) fs.copyFileSync(F, bak);
fs.writeFileSync(F, s, 'utf8');
console.log('  ✓ ép ghi dữ liệu trước khi thoát cập nhật (2 chỗ)\n  ✓ script cập nhật đợi app tự đóng tối đa 10s');
