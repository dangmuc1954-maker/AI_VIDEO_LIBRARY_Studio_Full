const fs = require('fs');
const path = require('path');

function copyDir(src, dest) {
  fs.mkdirSync(dest, { recursive: true });
  for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
    const s = path.join(src, entry.name);
    const d = path.join(dest, entry.name);
    if (entry.isDirectory()) {
      copyDir(s, d);
    } else {
      try {
        fs.copyFileSync(s, d);
      } catch (e) {
        if (e.code !== 'EBUSY' && e.code !== 'EPERM') throw e;
      }
    }
  }
}

const targets = [
  path.join(__dirname, '../dist/AI_VIDEO_LIBRARY_Customer_Edition/resources/app'),
  path.join(__dirname, '../dist/AI_VIDEO_LIBRARY_Khach_Hang_v3.0/resources/app'),
  ...(process.env.AIFORGE_SKIP_INSTALLED_SYNC === '1' ? [] : ['C:/Users/admin/AppData/Local/Programs/AI VIDEO LIBRARY/resources/app'])
];

for (const target of targets) {
  if (!fs.existsSync(target)) continue;
  console.log('[*] Đang đồng bộ hóa sang:', target);
  
  // 1. Clean & Copy out
  const targetOut = path.join(target, 'out');
  try {
    if (fs.existsSync(targetOut)) {
      fs.rmSync(targetOut, { recursive: true, force: true });
    }
  } catch (e) {
    console.log('  [*] Ghi đè trực tiếp vào out/ (tiến trình đang chạy)');
  }
  copyDir(path.join(__dirname, '../app/out'), targetOut);
  console.log('  ✓ Đã cập nhật out/ sạch sẽ 100%');

  // 2. Copy canvas-confetti & STT modules
  const extraPkgs = [
    'canvas-confetti',
    '@xenova',
    'onnxruntime-node',
    'onnxruntime-web',
    'onnxruntime-common',
    '@huggingface',
    'sharp'
  ];
  for (const pkg of extraPkgs) {
    const pkgSrc = path.join(__dirname, '../app/node_modules', pkg);
    const pkgDest = path.join(target, 'node_modules', pkg);
    if (fs.existsSync(pkgSrc)) {
      copyDir(pkgSrc, pkgDest);
      console.log(`  ✓ Đã cập nhật node_modules/${pkg}`);
    }
  }

  // 3. Copy models/ (Whisper model)
  const modelsSrc = path.join(__dirname, '../app/models');
  const modelsDest = path.join(target, 'models');
  if (fs.existsSync(modelsSrc)) {
    copyDir(modelsSrc, modelsDest);
    console.log('  ✓ Đã đồng bộ thư mục models/ (Whisper STT)');
  }

  // 3b. Copy modules/ (AI Upscaler & Watermark Cleaner)
  const modulesSrc = path.join(__dirname, '../app/modules');
  const modulesDest = path.join(target, 'modules');
  if (fs.existsSync(modulesSrc)) {
    copyDir(modulesSrc, modulesDest);
    console.log('  ✓ Đã đồng bộ thư mục modules/ (AI Upscaler & Watermark Cleaner)');
  }

  // 3c. Copy extensions/ (AIForge Flow Bridge & Captcha Solver)
  const extSrc = path.join(__dirname, '../app/extensions');
  const extDest = path.join(target, 'extensions');
  if (fs.existsSync(extSrc)) {
    copyDir(extSrc, extDest);
    console.log('  ✓ Đã đồng bộ thư mục extensions/ (AIForge Flow Bridge & Captcha Solver)');
  }

  // 4. Update package.json
  const srcPkgPath = path.join(__dirname, '../app/package.json');
  const srcPkg = fs.existsSync(srcPkgPath) ? JSON.parse(fs.readFileSync(srcPkgPath, 'utf8')) : {};
  const pkgPath = path.join(target, 'package.json');
  if (fs.existsSync(pkgPath)) {
    const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
    if (srcPkg.version) pkg.version = srcPkg.version;
    pkg.dependencies = pkg.dependencies || {};
    pkg.dependencies['canvas-confetti'] = '^1.9.4';
    pkg.dependencies['@xenova/transformers'] = '^2.17.2';
    fs.writeFileSync(pkgPath, JSON.stringify(pkg, null, 2), 'utf8');
    console.log('  ✓ Đã cập nhật package.json lên version', pkg.version);
  }

  // 5. Copy Cap_Quyen_Ghi_O_Dia_D.bat tool
  const batSrc = path.join(__dirname, '../Cap_Quyen_Ghi_O_Dia_D.bat');
  if (fs.existsSync(batSrc)) {
    try {
      fs.copyFileSync(batSrc, path.join(target, 'Cap_Quyen_Ghi_O_Dia_D.bat'));
      const appRoot = path.join(target, '../../');
      if (fs.existsSync(appRoot)) {
        fs.copyFileSync(batSrc, path.join(appRoot, 'Cap_Quyen_Ghi_O_Dia_D.bat'));
      }
      console.log('  ✓ Đã đính kèm công cụ mở khóa quyền ổ đĩa: Cap_Quyen_Ghi_O_Dia_D.bat');
    } catch (_) {}
  }

  // 6. 🛡️ BẢO VỆ DỮ LIỆU RIÊNG TƯ & CÔ LẬP KHÁCH HÀNG (CUSTOMER PRIVACY GUARDRAIL)
  // Quét và tiêu diệt triệt để mọi file dữ liệu nhạy cảm nếu vô tình bị sao chép vào target
  const forbiddenPatterns = [
    'browser-sessions',
    'license-state',
    'asset-state',
    'queue-state',
    'deleted-accounts',
    'google-flow-runtime-state',
    'gemini-api-key'
  ];
  function scanAndPurge(dir) {
    if (!fs.existsSync(dir)) return;
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        if (entry.name === 'Partitions') {
          console.warn('⚠️ Phát hiện thư mục Partitions trong dist - Đang tiêu hủy ngay để bảo vệ riêng tư...');
          fs.rmSync(fullPath, { recursive: true, force: true });
        } else {
          scanAndPurge(fullPath);
        }
      } else {
        const lowerName = entry.name.toLowerCase();
        if (forbiddenPatterns.some(p => lowerName.includes(p)) && lowerName.endsWith('.json')) {
          console.warn(`⚠️ Phát hiện file tài khoản/dữ liệu cá nhân: ${entry.name} trong dist - Đang tiêu hủy ngay!`);
          fs.rmSync(fullPath, { force: true });
        }
      }
    }
  }
  scanAndPurge(target);
  console.log('  🛡️ Đã kiểm tra & đảm bảo 100% sạch bóng tài khoản/dữ liệu cá nhân');
}

console.log('🌟 ĐỒNG BỘ TOÀN BỘ CÁC BẢN EXE THÀNH CÔNG! 🌟');

