'use strict';
// =====================================================================
// FFMPEG CHO MACBOOK
// Bộ cài được đóng gói trên Windows nên node_modules/ffmpeg-static chỉ có
// ffmpeg.exe (Mac không chạy được -> lỗi ENOEXEC khi lấy frame cuối, ghép
// video, xóa watermark). Trên Mac, nếu thiếu file `ffmpeg` đúng chip thì tự
// tải bản chính thức của ffmpeg-static (cùng phiên bản b6.1.1 với Windows),
// kiểm tra SHA-256 rồi mới đặt vào node_modules/ffmpeg-static/ffmpeg.
// Windows: không làm gì.
// =====================================================================
const fs = require('fs');
const path = require('path');
const zlib = require('zlib');
const crypto = require('crypto');

const RELEASE = 'b6.1.1';
const BIN = {
  arm64: { url: `https://github.com/eugeneware/ffmpeg-static/releases/download/${RELEASE}/ffmpeg-darwin-arm64.gz`, sha256: 'a90e3db6a3fd35f6074b013f948b1aa45b31c6375489d39e572bea3f18336584' },
  x64: { url: `https://github.com/eugeneware/ffmpeg-static/releases/download/${RELEASE}/ffmpeg-darwin-x64.gz`, sha256: 'ebdddc936f61e14049a2d4b549a412b8a40deeff6540e58a9f2a2da9e6b18894' }
};

let readyPromise = null;
const status = { ok: process.platform !== 'darwin', path: '', error: '', source: '' };

function log(...a) { console.log('[MacFFmpeg]', ...a); }

function targetPath() {
  const cands = [];
  try { cands.push(path.dirname(require.resolve('ffmpeg-static/package.json'))); } catch (_) {}
  if (process.resourcesPath) cands.push(path.join(process.resourcesPath, 'app', 'node_modules', 'ffmpeg-static'));
  cands.push(path.join(__dirname, '..', '..', 'node_modules', 'ffmpeg-static'));
  const dir = cands.find(d => d && fs.existsSync(d)) || cands[0];
  return dir ? path.join(dir, 'ffmpeg') : '';
}

// File Mach-O đúng chip của máy (không phải file .exe Windows, không phải file hỏng)
function isGoodMacBinary(file, arch) {
  try {
    const fd = fs.openSync(file, 'r');
    const b = Buffer.alloc(8);
    fs.readSync(fd, b, 0, 8, 0);
    fs.closeSync(fd);
    const magic = b.readUInt32LE(0);
    const cpu = b.readUInt32LE(4);
    if (magic === 0xbebafeca) return true; // universal (fat) binary
    if (magic !== 0xfeedfacf) return false;
    return arch === 'arm64' ? cpu === 0x0100000c : cpu === 0x01000007;
  } catch (_) { return false; }
}

async function download(url) {
  let fetchFn = null;
  try { const { net } = require('electron'); if (net && typeof net.fetch === 'function') fetchFn = net.fetch.bind(net); } catch (_) {}
  if (!fetchFn && typeof fetch === 'function') fetchFn = fetch;
  if (!fetchFn) throw new Error('Không có hàm tải file');
  const ctl = new AbortController();
  const timer = setTimeout(() => ctl.abort(), 10 * 60 * 1000);
  try {
    const r = await fetchFn(url, { redirect: 'follow', signal: ctl.signal });
    if (!r.ok) throw new Error('HTTP ' + r.status);
    return Buffer.from(await r.arrayBuffer());
  } finally { clearTimeout(timer); }
}

async function ensure() {
  if (process.platform !== 'darwin') return status;
  const arch = process.arch === 'arm64' ? 'arm64' : 'x64';
  const target = targetPath();
  status.path = target;
  if (!target) { status.error = 'Không tìm thấy thư mục ffmpeg-static'; return status; }
  if (isGoodMacBinary(target, arch)) {
    try { fs.chmodSync(target, 0o755); } catch (_) {}
    status.ok = true; status.source = 'installed';
    return status;
  }
  const spec = BIN[arch];
  log('Thiếu ffmpeg cho Mac', arch, '- đang tải', spec.url);
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      const gz = await download(spec.url);
      const bin = zlib.gunzipSync(gz);
      const sha = crypto.createHash('sha256').update(bin).digest('hex');
      if (sha !== spec.sha256) throw new Error('Sai mã kiểm tra SHA-256 (' + sha.slice(0, 12) + '...)');
      const tmp = target + '.download';
      fs.writeFileSync(tmp, bin, { mode: 0o755 });
      fs.renameSync(tmp, target);
      fs.chmodSync(target, 0o755);
      status.ok = true; status.error = ''; status.source = 'downloaded';
      log('Đã cài ffmpeg cho Mac', arch, target);
      return status;
    } catch (e) {
      status.error = 'Không tải được ffmpeg cho Mac (lần ' + attempt + '): ' + e.message;
      log(status.error);
      await new Promise(r => setTimeout(r, 3000 * attempt));
    }
  }
  return status;
}

function start() {
  if (!readyPromise) readyPromise = ensure().catch(e => { status.error = e.message; return status; });
  global.__macFfmpegReady = readyPromise;
  global.__macFfmpegStatus = status;
  return readyPromise;
}

module.exports = { start, ensure, _isGoodMacBinary: isGoodMacBinary, _BIN: BIN };
