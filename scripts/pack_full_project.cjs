const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const projectRoot = path.resolve(__dirname, '..');
const outZipName = 'AIForge_Veo3_Studio_TRON_BO.zip';
const outZipPath = path.join(projectRoot, outZipName);

console.log('======================================================================');
console.log('🚀 ĐANG ĐÓNG GÓI NGUYÊN VẸN TRỌN BỘ DỰ ÁN SANG FILE ZIP DUY NHẤT 🚀');
console.log('👉 File đích: ' + outZipPath);
console.log('======================================================================');

if (fs.existsSync(outZipPath)) {
  try {
    fs.unlinkSync(outZipPath);
  } catch (e) {}
}

// Danh sách các thư mục và file cốt lõi cần nén
const itemsToInclude = [
  'app',
  'assets',
  'scripts',
  'vercel_server',
  'dist/AI_VIDEO_LIBRARY_Customer_Edition',
  'dist/AI_VIDEO_LIBRARY_Mac_Universal_v3.0',
  '*.bat',
  '*.json',
  '*.md'
];

const cmd = `tar.exe -a -c -f "${outZipName}" --exclude="${outZipName}" --exclude=".git" --exclude="node_modules" ${itemsToInclude.join(' ')}`;

console.log('[*] Đang thực hiện nén dữ liệu... (Vui lòng chờ khoảng 30 - 60 giây)');
const start = Date.now();

try {
  execSync(cmd, { cwd: projectRoot, stdio: 'inherit' });
  const duration = ((Date.now() - start) / 1000).toFixed(1);
  const sizeMb = (fs.statSync(outZipPath).size / (1024 * 1024)).toFixed(1);

  console.log('======================================================================');
  console.log(`🎉 NÉN HOÀN TẤT TRONG ${duration} GIÂY!`);
  console.log(`📦 File nén hoàn chỉnh: ${outZipPath}`);
  console.log(`📊 Dung lượng file ZIP: ${sizeMb} MB`);
  console.log('======================================================================');
} catch (err) {
  console.error('❌ Lỗi khi nén:', err.message);
}
