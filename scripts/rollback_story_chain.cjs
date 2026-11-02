const fs = require('fs');
const { execSync } = require('child_process');

console.log('🔄 Đang khôi phục toàn bộ trạng thái trước khi cài đặt Chuỗi Kịch Bản...');

const files = [
  'app/out/renderer/assets/VideoStudio-frcr8V6s.js',
  'app/out/main/index.js',
  'app/out/preload/index.cjs'
];

let restoredCount = 0;
for (const f of files) {
  const bak = f + '.bak_before_story_chain';
  if (fs.existsSync(bak)) {
    fs.copyFileSync(bak, f);
    console.log(`  ✓ Đã khôi phục: ${f} từ ${bak}`);
    restoredCount++;
  } else {
    console.warn(`  ⚠️ Không tìm thấy file backup: ${bak}`);
  }
}

if (restoredCount > 0) {
  console.log('[*] Đang kiểm tra cú pháp sau khi khôi phục...');
  try {
    execSync('node --check app/out/main/index.js', { stdio: 'inherit' });
    execSync('node --check app/out/preload/index.cjs', { stdio: 'inherit' });
    console.log('  🎉 [PASS] Cú pháp code chuẩn xác 100%!');
  } catch (err) {
    console.error('  ❌ [FAIL] Lỗi kiểm tra cú pháp:', err.message);
  }

  console.log('[*] Đang đồng bộ và đóng gói lại bản phát hành...');
  try {
    execSync('node scripts/sync_dist.cjs', { stdio: 'inherit' });
    execSync('node scripts/create_zip_and_installer.js', { stdio: 'inherit' });
    console.log('🎉 [HOÀN TẤT] Đã rollback về bản cũ thành công 100%!');
  } catch (err) {
    console.error('Lỗi khi build lại:', err.message);
  }
}
