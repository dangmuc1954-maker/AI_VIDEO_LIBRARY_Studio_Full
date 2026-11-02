const fs = require('fs');
const path = require('path');
const https = require('https');

async function downloadFile(url, destPath) {
  if (fs.existsSync(destPath)) {
    console.log(`[✓] Đã có sẵn trong cache: ${path.basename(destPath)} (${(fs.statSync(destPath).size / 1024 / 1024).toFixed(1)} MB)`);
    return;
  }

  console.log(`[*] Bắt đầu tải: ${path.basename(destPath)}...`);
  return new Promise((resolve, reject) => {
    function get(currentUrl) {
      https.get(currentUrl, { headers: { 'User-Agent': 'NodeDownloader' } }, (res) => {
        if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
          get(res.headers.location);
          return;
        }
        if (res.statusCode !== 200) {
          reject(new Error(`Tải thất bại với HTTP status: ${res.statusCode}`));
          return;
        }

        const totalBytes = parseInt(res.headers['content-length'] || '0', 10);
        let downloadedBytes = 0;
        let lastLogged = 0;

        const fileStream = fs.createWriteStream(destPath);
        res.on('data', (chunk) => {
          downloadedBytes += chunk.length;
          const now = Date.now();
          if (now - lastLogged > 2000 || downloadedBytes === totalBytes) {
            lastLogged = now;
            const pct = totalBytes ? ((downloadedBytes / totalBytes) * 100).toFixed(1) : '?';
            const mb = (downloadedBytes / 1024 / 1024).toFixed(1);
            const totalMb = totalBytes ? (totalBytes / 1024 / 1024).toFixed(1) : '?';
            process.stdout.write(`\r  -> Tiến độ tải: ${pct}% (${mb} MB / ${totalMb} MB)`);
          }
        });

        res.pipe(fileStream);
        fileStream.on('finish', () => {
          fileStream.close();
          console.log(`\n✅ Tải thành công: ${path.basename(destPath)}`);
          resolve();
        });
      }).on('error', (err) => {
        try { fs.unlinkSync(destPath); } catch(_) {}
        reject(err);
      });
    }
    get(url);
  });
}

async function main() {
  const cacheDir = path.resolve(__dirname, 'cache_electron_mac');
  fs.mkdirSync(cacheDir, { recursive: true });

  const arm64Url = 'https://github.com/electron/electron/releases/download/v44.0.0/electron-v44.0.0-darwin-arm64.zip';
  const x64Url = 'https://github.com/electron/electron/releases/download/v44.0.0/electron-v44.0.0-darwin-x64.zip';

  const arm64Zip = path.join(cacheDir, 'electron-v44.0.0-darwin-arm64.zip');
  const x64Zip = path.join(cacheDir, 'electron-v44.0.0-darwin-x64.zip');

  await downloadFile(arm64Url, arm64Zip);
  await downloadFile(x64Url, x64Zip);
  console.log('🌟 Đã sẵn sàng các gói Electron macOS!');
}

main().catch(err => {
  console.error('Lỗi tải:', err);
  process.exit(1);
});
