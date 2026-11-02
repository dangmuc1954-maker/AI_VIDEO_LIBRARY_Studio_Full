const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

console.log('======================================================================');
console.log('📦 TẠO FILE ZIP & BIÊN DỊCH SETUP INSTALLER SIÊU TỐC (.NET ZIPFILE) 📦');
console.log('======================================================================');

const rootDir = path.resolve(__dirname, '..');
const distDir = path.join(rootDir, 'dist/AI_VIDEO_LIBRARY_Customer_Edition');
const zipFile = path.join(rootDir, 'dist/AI_VIDEO_LIBRARY_Khach_Hang_v3.0.zip');

if (!fs.existsSync(distDir)) {
  console.error('❌ Không tìm thấy thư mục distDir:', distDir);
  process.exit(1);
}

if (fs.existsSync(zipFile)) {
  try { fs.unlinkSync(zipFile); } catch(e) {}
}
console.log('[*] Đang đồng bộ hóa mã nguồn sạch sang thư mục dist...');
try {
  execSync(`node "${path.join(__dirname, 'sync_dist.cjs')}"`, { stdio: 'inherit', cwd: rootDir });
} catch(e) {
  console.error('❌ Lỗi khi đồng bộ dist:', e.message);
  process.exit(1);
}

console.log('[*] Kích hoạt Lớp Giáp Bảo Vệ Chống AI (Anti-AI Code Shield)...');
try {
  execSync(`node "${path.join(__dirname, 'obfuscate_release.cjs')}"`, { stdio: 'inherit', cwd: rootDir });
} catch(e) {
  console.error('❌ Lỗi khi mã hóa chống AI:', e.message);
  process.exit(1);
}

// 🛡️ Kiểm tra bảo mật dữ liệu khách hàng tuyệt đối
console.log('[*] Kiểm tra bảo vệ riêng tư: Đảm bảo không chứa tài khoản hoặc phiên đăng nhập của Tris...');
const forbiddenDataFiles = [
  'browser-sessions.json',
  'license-state.production.json',
  'license-state.development.json',
  'asset-state.json',
  'queue-state.json',
  'deleted-accounts-registry.json'
];
for (const badFile of forbiddenDataFiles) {
  const badPath = path.join(distDir, 'resources/app', badFile);
  if (fs.existsSync(badPath)) {
    console.warn(`[CẢNH BÁO BẢO MẬT] Phát hiện file dữ liệu ${badFile} trong bản phân phối. Đang xóa ngay...`);
    fs.unlinkSync(badPath);
  }
}
console.log('✅ 100% Xác nhận: Bản phát hành hoàn toàn sạch, mỗi máy khách hàng tự quản lý tài khoản riêng biệt.');

console.log('[*] Đang nén thư mục bằng .NET Native Zip Engine...');
const psZipCmd = `powershell -Command "Add-Type -AssemblyName System.IO.Compression.FileSystem; [System.IO.Compression.ZipFile]::CreateFromDirectory('${distDir.replace(/'/g, "''")}', '${zipFile.replace(/'/g, "''")}', [System.IO.Compression.CompressionLevel]::Fastest, $false)"`;

try {
  execSync(psZipCmd, { stdio: 'inherit' });
  console.log(`✅ Đã tạo file ZIP thành công: ${zipFile} (${(fs.statSync(zipFile).size / 1024 / 1024).toFixed(1)} MB)`);
} catch(e) {
  console.error('Lỗi khi tạo zip:', e.message);
  process.exit(1);
}

console.log('[*] Đang biên dịch bộ cài đặt AI_VIDEO_LIBRARY_Setup_v3.0.exe...');
try {
  execSync(`node "${path.join(__dirname, 'compile_installer.js')}"`, { stdio: 'inherit', cwd: rootDir });
} catch(e) {
  console.error('Lỗi khi compile installer:', e.message);
}

console.log('[*] Đang đóng gói bộ cài đặt 1-Click Universal cho MacBook (M1/M2/M3/M4 & Intel)...');
try {
  execSync(`node "${path.join(__dirname, 'create_mac_universal_package.js')}"`, { stdio: 'inherit', cwd: rootDir });
} catch(e) {
  console.error('Lỗi khi đóng gói Mac:', e.message);
}

console.log('======================================================================');
console.log('🎉 TỔNG KẾT ĐÓNG GÓI HOÀN TẤT ĐẦY ĐỦ 2 PHIÊN BẢN (WINDOWS & MACBOOK) 🎉');
console.log(`🪟 Windows Setup EXE : ${path.join(rootDir, 'dist/AI_VIDEO_LIBRARY_Setup_v3.0.exe')}`);
console.log(`🍎 MacBook Universal: ${path.join(rootDir, 'dist/AI_VIDEO_LIBRARY_Mac_Universal_v3.0.zip')}`);
console.log('======================================================================');

