const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

console.log('======================================================================');
console.log('🚀 TỰ ĐỘNG THIẾT LẬP ELECTRON_BIN & THƯ MỤC NỀN TẢNG CHO MÁY MỚI 🚀');
console.log('======================================================================');

const rootDir = path.resolve(__dirname, '..');
const electronBinDir = path.join(rootDir, 'electron_bin');
const distCustomerDir = path.join(rootDir, 'dist/AI_VIDEO_LIBRARY_Customer_Edition');
const electronZipUrl = 'https://github.com/electron/electron/releases/download/v30.5.1/electron-v30.5.1-win32-x64.zip';
const tempZipPath = path.join(rootDir, 'temp_electron_win64.zip');

function copyRecursiveSync(src, dest) {
  if (!fs.existsSync(src)) return;
  const stats = fs.statSync(src);
  if (stats.isDirectory()) {
    if (!fs.existsSync(dest)) fs.mkdirSync(dest, { recursive: true });
    fs.readdirSync(src).forEach(child => copyRecursiveSync(path.join(src, child), path.join(dest, child)));
  } else {
    fs.copyFileSync(src, dest);
  }
}

async function run() {
  if (!fs.existsSync(electronBinDir) || !fs.existsSync(path.join(electronBinDir, 'electron.exe'))) {
    console.log('[*] Chưa có electron_bin. Đang tải Electron Runtime Portable từ GitHub...');
    const psDownload = `powershell -Command "[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12; (New-Object System.Net.WebClient).DownloadFile('${electronZipUrl}', '${tempZipPath.replace(/'/g, "''")}')"`;
    try {
      execSync(psDownload, { stdio: 'inherit', cwd: rootDir });
      console.log('✓ Tải zip thành công! Đang giải nén vào electron_bin...');
      fs.mkdirSync(electronBinDir, { recursive: true });
      const psUnzip = `powershell -Command "Expand-Archive -Path '${tempZipPath.replace(/'/g, "''")}' -DestinationPath '${electronBinDir.replace(/'/g, "''")}' -Force"`;
      execSync(psUnzip, { stdio: 'inherit', cwd: rootDir });
      if (fs.existsSync(tempZipPath)) fs.unlinkSync(tempZipPath);
      console.log('✓ Đã giải nén electron_bin hoàn tất!');
    } catch (e) {
      console.error('❌ Lỗi khi tải/giải nén Electron:', e.message);
      return;
    }
  } else {
    console.log('✓ Đã có sẵn electron_bin.');
  }

  // Khởi tạo thư mục nền tảng dist/AI_VIDEO_LIBRARY_Customer_Edition nếu chưa có
  if (!fs.existsSync(distCustomerDir)) {
    console.log('[*] Đang khởi tạo khung dist/AI_VIDEO_LIBRARY_Customer_Edition từ electron_bin...');
    fs.mkdirSync(distCustomerDir, { recursive: true });
    const binFiles = fs.readdirSync(electronBinDir);
    binFiles.forEach(file => {
      if (file === 'resources') return;
      const srcPath = path.join(electronBinDir, file);
      if (file === 'electron.exe') {
        fs.copyFileSync(srcPath, path.join(distCustomerDir, 'AI VIDEO LIBRARY.exe'));
      } else {
        copyRecursiveSync(srcPath, path.join(distCustomerDir, file));
      }
    });
    console.log('✓ Đã tạo khung dist hoàn chỉnh!');
  }

  // Đồng bộ mã nguồn app vào dist
  console.log('[*] Kích hoạt sync_dist...');
  execSync(`node "${path.join(__dirname, 'sync_dist.cjs')}"`, { stdio: 'inherit', cwd: rootDir });
  console.log('\n🎉 THIẾT LẬP HOÀN TẤT 100%! BÂY GIỜ ANH CÓ THỂ CHẠY: node scripts/create_zip_and_installer.js HOẶC Tao_Bo_Cai_Dat_1_Click.bat');
}

run();
