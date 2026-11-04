const fs = require('fs');
const path = require('path');
const https = require('https');
const http = require('http');
const { spawn, execSync } = require('child_process');

// Helper to parse semver string [major, minor, patch]
function parseSemver(v) {
  if (!v || typeof v !== 'string') return [0, 0, 0];
  const cleaned = v.trim().replace(/^v/i, '').split('-')[0];
  const parts = cleaned.split('.').map(n => parseInt(n, 10) || 0);
  while (parts.length < 3) parts.push(0);
  return parts.slice(0, 3);
}

// Compare two version strings. Returns true if remote is strictly newer than current
function isNewer(current, remote) {
  const c = parseSemver(current);
  const r = parseSemver(remote);
  for (let i = 0; i < 3; i++) {
    if (r[i] > c[i]) return true;
    if (r[i] < c[i]) return false;
  }
  return false;
}

// Normalize current app version (defaults 0.1.0 dev builds to 3.0.0)
function normalizeAppVersion(raw) {
  if (!raw || typeof raw !== 'string') return '3.0.0';
  if (raw.startsWith('0.1.0')) return '3.0.0';
  const clean = raw.trim().replace(/^v/i, '').split('-')[0];
  return clean || '3.0.0';
}

// Perform HTTPS GET request with JSON response & timeout
function fetchJson(url, options = {}) {
  return new Promise((resolve, reject) => {
    const parsed = new URL(url);
    const client = parsed.protocol === 'http:' ? http : https;
    const req = client.get(url, {
      headers: {
        'User-Agent': 'AI-VIDEO-LIBRARY-Desktop',
        'Accept': 'application/json',
        ...(options.headers || {})
      },
      timeout: options.timeout || 6000
    }, (res) => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        return resolve(fetchJson(res.headers.location, options));
      }
      if (res.statusCode < 200 || res.statusCode >= 300) {
        return reject(new Error(`HTTP ${res.statusCode}: ${res.statusMessage}`));
      }
      let raw = '';
      res.on('data', chunk => { raw += chunk; });
      res.on('end', () => {
        try {
          resolve(JSON.parse(raw));
        } catch (e) {
          reject(e);
        }
      });
    });
    req.on('timeout', () => {
      req.destroy();
      reject(new Error('Connection timeout'));
    });
    req.on('error', reject);
  });
}

// Download file following redirects with progress emission
function downloadFile(url, destPath, onProgress, maxRedirects = 6) {
  return new Promise((resolve, reject) => {
    if (maxRedirects <= 0) return reject(new Error('Too many redirects'));

    const parsed = new URL(url);
    const client = parsed.protocol === 'http:' ? http : https;
    const req = client.get(url, {
      headers: { 'User-Agent': 'AI-VIDEO-LIBRARY-Desktop' }
    }, (res) => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        let redirectUrl = res.headers.location;
        if (!redirectUrl.startsWith('http://') && !redirectUrl.startsWith('https://')) {
          redirectUrl = new URL(redirectUrl, url).toString();
        }
        return resolve(downloadFile(redirectUrl, destPath, onProgress, maxRedirects - 1));
      }

      if (res.statusCode !== 200) {
        return reject(new Error(`Download failed with HTTP ${res.statusCode}`));
      }

      const totalBytes = parseInt(res.headers['content-length'] || '0', 10);
      let transferred = 0;
      fs.mkdirSync(path.dirname(destPath), { recursive: true });
      const fileStream = fs.createWriteStream(destPath);

      res.on('data', chunk => {
        transferred += chunk.length;
        fileStream.write(chunk);
        if (totalBytes > 0 && typeof onProgress === 'function') {
          const percent = Math.min(100, Math.round((transferred / totalBytes) * 100));
          onProgress({ percent, transferred, total: totalBytes });
        }
      });

      res.on('end', () => {
        fileStream.end();
        if (typeof onProgress === 'function') {
          onProgress({ percent: 100, transferred, total: totalBytes || transferred });
        }
        resolve(destPath);
      });

      res.on('error', err => {
        fileStream.destroy();
        try { fs.unlinkSync(destPath); } catch (_) {}
        reject(err);
      });
    });

    req.on('error', err => {
      try { fs.unlinkSync(destPath); } catch (_) {}
      reject(err);
    });
  });
}

let cachedUpdateInfo = null;

async function checkUpdate(app) {
  const currentVersion = normalizeAppVersion(app.getVersion());
  let updateData = null;

  // 1. Primary check: Vercel License & Version Server
  try {
    const res = await fetchJson('https://vercelserver-eight.vercel.app/api/version', { timeout: 5000 });
    if (res && res.version) {
      updateData = res;
    }
  } catch (e1) {
    console.warn('[Updater] Vercel check failed, trying GitHub fallback:', e1.message);
  }

  // 2. Secondary check: GitHub Releases API fallback
  if (!updateData) {
    try {
      const ghRes = await fetchJson('https://api.github.com/repos/dangmuc1954-maker/AI_VIDEO_LIBRARY_Studio_Full/releases/latest', { timeout: 6000 });
      if (ghRes && ghRes.tag_name) {
        const patchAsset = Array.isArray(ghRes.assets) ? ghRes.assets.find(a => a.name === 'update-patch.zip') : null;
        updateData = {
          version: ghRes.tag_name.replace(/^v/i, ''),
          name: ghRes.name || ghRes.tag_name,
          releaseDate: (ghRes.published_at || '').slice(0, 10),
          changelog: ghRes.body || 'Bản cập nhật tính năng và sửa lỗi mới nhất',
          patchUrl: patchAsset ? patchAsset.browser_download_url : `https://github.com/dangmuc1954-maker/AI_VIDEO_LIBRARY_Studio_Full/releases/download/${ghRes.tag_name}/update-patch.zip`,
          mandatory: false
        };
      }
    } catch (e2) {
      console.warn('[Updater] GitHub fallback check failed:', e2.message);
    }
  }

  if (!updateData || !updateData.version) {
    return {
      hasUpdate: false,
      currentVersion,
      latestVersion: currentVersion,
      error: 'Không thể kết nối đến máy chủ cập nhật'
    };
  }

  const latestVersion = normalizeAppVersion(updateData.version);
  const hasUpdate = isNewer(currentVersion, latestVersion);

  cachedUpdateInfo = {
    hasUpdate,
    currentVersion,
    latestVersion,
    name: updateData.name || `AI VIDEO LIBRARY v${latestVersion}`,
    releaseDate: updateData.releaseDate || '',
    changelog: updateData.changelog || 'Cập nhật hệ thống tối ưu nhất',
    patchUrl: updateData.patchUrl,
    mandatory: Boolean(updateData.mandatory)
  };

  return cachedUpdateInfo;
}

function registerUpdaterHandlers(ipcMain, app, securityCheck) {
  // 1. Check for update
  ipcMain.handle('updater:checkUpdate', async (event) => {
    securityCheck(event);
    return await checkUpdate(app);
  });

  // 2. Download update patch
  ipcMain.handle('updater:downloadUpdate', async (event, customPayload) => {
    securityCheck(event);
    const targetUrl = customPayload?.patchUrl || cachedUpdateInfo?.patchUrl;
    if (!targetUrl) {
      throw new Error('Không có đường dẫn tải bản cập nhật');
    }

    const tempDir = path.join(app.getPath('temp'), 'aiforge_update');
    const zipPath = path.join(tempDir, 'update-patch.zip');

    try {
      if (fs.existsSync(zipPath)) {
        try { fs.unlinkSync(zipPath); } catch (_) {}
      }
      await downloadFile(targetUrl, zipPath, (progress) => {
        try {
          if (!event.sender.isDestroyed()) {
            event.sender.send('updater:downloadProgress', progress);
          }
        } catch (_) {}
      });
      return { ok: true, patchPath: zipPath };
    } catch (err) {
      console.error('[Updater Download Error]', err);
      throw err;
    }
  });

  // 3. Apply update & restart
  ipcMain.handle('updater:applyUpdate', async (event) => {
    securityCheck(event);
    const tempDir = path.join(app.getPath('temp'), 'aiforge_update');
    const zipPath = path.join(tempDir, 'update-patch.zip');
    const extractedDir = path.join(tempDir, 'extracted');

    if (!fs.existsSync(zipPath)) {
      throw new Error('Chưa tải file cập nhật');
    }

    // Determine target app dir
    // Packaged path: resources/app
    let targetAppDir;
    const resourcesApp = path.join(process.resourcesPath || '', 'app');
    if (fs.existsSync(resourcesApp)) {
      targetAppDir = resourcesApp;
    } else {
      // Dev mode: app/
      targetAppDir = path.resolve(__dirname, '../..');
    }

    const exePath = process.execPath;
    console.log('[Updater] Target App Dir:', targetAppDir);
    console.log('[Updater] Target Exe:', exePath);

    // Extract zip to extractedDir
    if (fs.existsSync(extractedDir)) {
      try { fs.rmSync(extractedDir, { recursive: true, force: true }); } catch (_) {}
    }
    fs.mkdirSync(extractedDir, { recursive: true });

    const isWindows = process.platform === 'win32';
    if (isWindows) {
      // Use PowerShell to extract
      const psExtract = `powershell -NoProfile -Command "Add-Type -AssemblyName System.IO.Compression.FileSystem; [System.IO.Compression.ZipFile]::ExtractToDirectory('${zipPath.replace(/'/g, "''")}', '${extractedDir.replace(/'/g, "''")}', $true)"`;
      execSync(psExtract, { stdio: 'inherit' });

      // Generate apply_update.bat
      const batPath = path.join(tempDir, 'apply_update.bat');
      const batContent = `@echo off
chcp 65001 >nul
echo [AI VIDEO LIBRARY] Cho ung dung dong hoan toan...
timeout /t 2 /nobreak >nul
echo [AI VIDEO LIBRARY] Dang ghi de ban cap nhat vao ${targetAppDir}...
xcopy "${extractedDir}\\*" "${targetAppDir}\\" /E /Y /Q >nul 2>&1
echo [AI VIDEO LIBRARY] Khoi dong lai AI VIDEO LIBRARY...
start "" "${exePath}"
exit
`;
      fs.writeFileSync(batPath, batContent, 'utf8');

      // Launch batch detached & quit app
      const child = spawn('cmd.exe', ['/c', batPath], {
        detached: true,
        stdio: 'ignore'
      });
      child.unref();
      setTimeout(() => {
        app.quit();
      }, 300);

      return { ok: true, restarting: true };
    } else {
      // macOS / Linux
      execSync(`unzip -o "${zipPath}" -d "${extractedDir}"`, { stdio: 'inherit' });
      const shPath = path.join(tempDir, 'apply_update.sh');
      const shContent = `#!/bin/bash
sleep 2
cp -R "${extractedDir}/"* "${targetAppDir}/"
open "${exePath}"
`;
      fs.writeFileSync(shPath, shContent, { mode: 0o755 });

      const child = spawn('/bin/bash', [shPath], {
        detached: true,
        stdio: 'ignore'
      });
      child.unref();
      setTimeout(() => {
        app.quit();
      }, 300);

      return { ok: true, restarting: true };
    }
  });

  console.log('[Updater] In-App Auto-Update handlers registered successfully.');
}

module.exports = {
  checkUpdate,
  registerUpdaterHandlers
};
