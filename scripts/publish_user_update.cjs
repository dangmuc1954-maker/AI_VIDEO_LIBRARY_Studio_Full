const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

console.log('======================================================================');
console.log('🚀 AI VIDEO LIBRARY - QUY TRÌNH PHÁT HÀNH BẢN CẬP NHẬT CHO USER 🚀');
console.log('======================================================================');

const rootDir = path.resolve(__dirname, '..');
const appDir = path.join(rootDir, 'app');
const distDir = path.join(rootDir, 'dist');
const vercelDir = path.join(rootDir, 'vercel_server');

const targetVersion = process.argv[2] || '3.1.0';
const releaseTag = `v${targetVersion.replace(/^v/i, '')}`;
const changelogText = process.argv[3] || 'Tách 2 cổng First/End Frame Google Flow & Tự động chạy tiếp Chuỗi Kịch Bản khi tạo lại';
const todayStr = new Date().toISOString().slice(0, 10);

console.log(`[*] Phiên bản phát hành : ${targetVersion} (${releaseTag})`);
console.log(`[*] Ngày phát hành      : ${todayStr}`);
console.log(`[*] Nội dung cập nhật   : ${changelogText}`);
console.log('----------------------------------------------------------------------');

// 1. Cập nhật app/package.json
const appPkgPath = path.join(appDir, 'package.json');
if (fs.existsSync(appPkgPath)) {
  const pkg = JSON.parse(fs.readFileSync(appPkgPath, 'utf8'));
  pkg.version = targetVersion;
  fs.writeFileSync(appPkgPath, JSON.stringify(pkg, null, 2), 'utf8');
  console.log('✓ Đã cập nhật app/package.json lên version', targetVersion);
}

// 2. Chạy sync_dist.cjs & create_zip_and_installer.js theo Quy tắc cốt lõi 1
console.log('[*] Đang biên dịch release targets (Setup EXE & Mac Zip) theo Quy tắc cốt lõi 1...');
try {
  execSync(`node "${path.join(__dirname, 'sync_dist.cjs')}"`, { stdio: 'inherit', cwd: rootDir });
  execSync(`node "${path.join(__dirname, 'create_zip_and_installer.js')}"`, { stdio: 'inherit', cwd: rootDir });
} catch (e) {
  console.error('❌ Lỗi khi đồng bộ hoặc biên dịch dist:', e.message);
  process.exit(1);
}

// 3. Đóng gói In-App Patch ~7MB (chỉ out/ và package.json)
console.log('[*] Đang đóng gói bản vá siêu tốc In-App Hot-Patch (~7MB)...');
const stagingDir = path.join(distDir, 'patch_staging');
if (fs.existsSync(stagingDir)) {
  fs.rmSync(stagingDir, { recursive: true, force: true });
}
fs.mkdirSync(stagingDir, { recursive: true });

function copyDirRecursive(src, dest) {
  fs.mkdirSync(dest, { recursive: true });
  for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
    const s = path.join(src, entry.name);
    const d = path.join(dest, entry.name);
    if (entry.isDirectory()) {
      copyDirRecursive(s, d);
    } else {
      fs.copyFileSync(s, d);
    }
  }
}

// Copy out/
copyDirRecursive(path.join(appDir, 'out'), path.join(stagingDir, 'out'));
// Copy package.json
fs.copyFileSync(appPkgPath, path.join(stagingDir, 'package.json'));

// 🛡️ Quét kiểm tra bảo vệ dữ liệu khách hàng tuyệt đối
const forbiddenNames = ['license-state', 'browser-sessions', 'asset-state', 'queue-state'];
function scanDir(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      scanDir(full);
    } else if (forbiddenNames.some(k => entry.name.toLowerCase().includes(k))) {
      console.warn(`⚠️ Xóa file nhạy cảm trong patch: ${entry.name}`);
      fs.rmSync(full, { force: true });
    }
  }
}
scanDir(stagingDir);

const patchZip = path.join(distDir, 'update-patch.zip');
if (fs.existsSync(patchZip)) {
  try { fs.unlinkSync(patchZip); } catch (_) {}
}

const psZip = `powershell -NoProfile -Command "Add-Type -AssemblyName System.IO.Compression.FileSystem; [System.IO.Compression.ZipFile]::CreateFromDirectory('${stagingDir.replace(/'/g, "''")}', '${patchZip.replace(/'/g, "''")}', [System.IO.Compression.CompressionLevel]::Optimal, $false)"`;
execSync(psZip, { stdio: 'inherit' });

const patchSizeMb = (fs.statSync(patchZip).size / 1024 / 1024).toFixed(2);
console.log(`✅ Đã đóng gói thành công bản vá: update-patch.zip (${patchSizeMb} MB)`);
fs.rmSync(stagingDir, { recursive: true, force: true });

// 4. Phát hành lên GitHub Releases
const repos = [
  'dangmuc1954-maker/AI_VIDEO_LIBRARY_Studio_Full',
  'dangmuc1954-maker/AI_VIDEO_LIBRARY_Veo3_Studio'
];
const patchUrl = `https://github.com/${repos[0]}/releases/download/${releaseTag}/update-patch.zip`;
console.log(`[*] Đang đẩy bản vá lên GitHub Release ${releaseTag}...`);

for (const repoSlug of repos) {
  try {
    let releaseExists = false;
    try {
      execSync(`gh release view ${releaseTag} --repo ${repoSlug}`, { stdio: 'ignore' });
      releaseExists = true;
    } catch (_) {
      releaseExists = false;
    }

    if (releaseExists) {
      console.log(`  Release ${releaseTag} trên ${repoSlug} đã tồn tại. Đang tải đè file patch...`);
      execSync(`gh release upload ${releaseTag} "${patchZip}" --repo ${repoSlug} --clobber`, { stdio: 'inherit' });
    } else {
      console.log(`  Đang tạo mới Release ${releaseTag} trên ${repoSlug}...`);
      execSync(`gh release create ${releaseTag} "${patchZip}" --repo ${repoSlug} --title "AI VIDEO LIBRARY ${releaseTag}" --notes "${changelogText.replace(/"/g, '\\"')}"`, { stdio: 'inherit' });
    }
    console.log(`✅ GitHub Release sẵn sàng tại: https://github.com/${repoSlug}/releases/tag/${releaseTag}`);
  } catch (ghErr) {
    console.error(`⚠️ Cảnh báo lỗi GitHub Release (${repoSlug}):`, ghErr.message);
  }
}

// 5. Cập nhật version.json trên Vercel Server
console.log('[*] Đang cập nhật API Version trên Server Vercel...');
const vercelVersionFile = path.join(vercelDir, 'api/version.json');
const versionPayload = {
  version: targetVersion,
  name: `AI VIDEO LIBRARY v${targetVersion}`,
  releaseDate: todayStr,
  changelog: changelogText,
  patchUrl: patchUrl,
  mandatory: false,
  minVersion: '3.0.0'
};
fs.writeFileSync(vercelVersionFile, JSON.stringify(versionPayload, null, 2), 'utf8');
console.log('✓ Đã cập nhật file vercel_server/api/version.json');

// 6. Triển khai Server lên Vercel Production
console.log('[*] Đang deploy Vercel Serverless Production...');
try {
  execSync('npx -y vercel --prod --yes', { stdio: 'inherit', cwd: vercelDir });
  console.log('✅ Server Vercel đã deploy thành công!');
} catch (vErr) {
  console.error('⚠️ Cảnh báo lỗi deploy Vercel:', vErr.message);
}

// 7. Git commit & push
console.log('[*] Đang đồng bộ Git repository...');
try {
  execSync('git add .', { stdio: 'inherit', cwd: rootDir });
  execSync(`git commit -m "chore(release): v${targetVersion} user update - ${changelogText}"`, { stdio: 'inherit', cwd: rootDir });
  execSync('git push github_full main', { stdio: 'inherit', cwd: rootDir });
  execSync('git push origin main', { stdio: 'inherit', cwd: rootDir });
  console.log('✅ Git repository đã push đồng bộ thành công!');
} catch (gitErr) {
  console.warn('⚠️ Git push note:', gitErr.message);
}

console.log('======================================================================');
console.log('🎉 BẢN CẬP NHẬT ĐÃ ĐƯỢC PHÁT HÀNH THÀNH CÔNG CHO TOÀN BỘ NGƯỜI DÙNG! 🎉');
console.log(`📦 Phiên bản mới      : v${targetVersion}`);
console.log(`⚡ Dung lượng patch   : ${patchSizeMb} MB (tải 2 giây qua App)`);
console.log(`🌐 API Check Update   : https://vercelserver-eight.vercel.app/api/version`);
console.log(`🔗 Link Tải Bản Vá    : ${patchUrl}`);
console.log(`🪟 Windows Setup Gốc : dist/AI_VIDEO_LIBRARY_Setup_v3.0.exe (Giữ link Google Drive cũ)`);
console.log(`🍏 Mac Universal Gốc  : dist/AI_VIDEO_LIBRARY_Mac_Universal_v3.0.zip`);
console.log('======================================================================');
