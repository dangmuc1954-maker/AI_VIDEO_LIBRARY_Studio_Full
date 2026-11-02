const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

console.log('======================================================================');
console.log('🔄 ĐANG KHÔI PHỤC (ROLLBACK) BẢN WATERMARK CŨ CHO ANH TRIS... 🔄');
console.log('======================================================================');

const mainBak = path.resolve(__dirname, '../app/out/main/index.js.bak_before_flawless_watermark');
const mainTarget = path.resolve(__dirname, '../app/out/main/index.js');
const cleanerBak = path.resolve(__dirname, '../app/modules/media_watermark_cleaner.cjs.bak_before_flawless_watermark');
const cleanerTarget = path.resolve(__dirname, '../app/modules/media_watermark_cleaner.cjs');

if (fs.existsSync(mainBak)) {
  fs.copyFileSync(mainBak, mainTarget);
  console.log('  ✓ Đã khôi phục app/out/main/index.js từ bản sao lưu');
} else {
  console.log('  ⚠️ Không tìm thấy mainBak');
}

if (fs.existsSync(cleanerBak)) {
  fs.copyFileSync(cleanerBak, cleanerTarget);
  console.log('  ✓ Đã khôi phục app/modules/media_watermark_cleaner.cjs từ bản sao lưu');
} else {
  console.log('  ⚠️ Không tìm thấy cleanerBak');
}

try {
  execSync(`node -c "${mainTarget}"`, { stdio: 'inherit' });
  console.log('  ✅ Cú pháp main/index.js hợp lệ 100%!');
} catch (e) {
  console.error('❌ Lỗi cú pháp:', e.message);
}

console.log('\n[*] Đang đồng bộ và đóng gói lại bản phát hành cũ...');
try {
  execSync('node scripts/sync_dist.cjs', { stdio: 'inherit' });
  execSync('node scripts/create_zip_and_installer.js', { stdio: 'inherit' });
  console.log('🎉 ĐÃ KHÔI PHỤC VỀ NGUYÊN BẢN CŨ THÀNH CÔNG RỰC RỠ! 🎉');
} catch (e) {
  console.error('Lỗi khi đóng gói:', e.message);
}
