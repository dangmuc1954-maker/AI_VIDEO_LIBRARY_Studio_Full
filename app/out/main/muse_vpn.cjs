'use strict';
// =====================================================================
// VPN MỸ RIÊNG CHO MUSE AI
// Chỉ các phiên trình duyệt của tài khoản Muse AI đi qua VPN (WireGuard
// do người dùng tự tải từ Proton VPN). Flow, Grok, Banana... giữ mạng thật.
// Cơ chế: chạy wireproxy (WireGuard chạy trong ứng dụng, không cài VPN vào
// máy) mở cổng SOCKS5 trên 127.0.0.1, rồi đặt proxy cho đúng session Muse.
// =====================================================================
const fs = require('fs');
const path = require('path');
const net = require('net');
const { spawn } = require('child_process');

let electron;
try { electron = require('electron'); } catch (_) { electron = {}; }

const state = {
  app: null,
  listSessions: () => [],
  settings: { enabled: false, configName: '' },
  child: null,
  port: 0,
  running: false,
  starting: null,
  lastError: '',
  lastIp: null,
  applied: new WeakMap(), // session -> rule đã đặt
  restartTimer: null,
  stopping: false
};

function dataDir() {
  const d = path.join(state.app.getPath('userData'), 'muse-vpn');
  fs.mkdirSync(d, { recursive: true });
  return d;
}
const settingsPath = () => path.join(dataDir(), 'settings.json');
const wgConfPath = () => path.join(dataDir(), 'wireguard.conf');
const proxyConfPath = () => path.join(dataDir(), 'wireproxy.conf');
const logPath = () => path.join(dataDir(), 'wireproxy.log');

function log(...a) {
  const line = `[${new Date().toISOString()}] ${a.join(' ')}\n`;
  try {
    const p = logPath();
    if (fs.existsSync(p) && fs.statSync(p).size > 512 * 1024) fs.writeFileSync(p, '');
    fs.appendFileSync(p, line);
  } catch (_) {}
  console.log('[MuseVPN]', ...a);
}

function loadSettings() {
  try { state.settings = { ...state.settings, ...JSON.parse(fs.readFileSync(settingsPath(), 'utf8')) }; } catch (_) {}
}
function saveSettings() {
  try { fs.writeFileSync(settingsPath(), JSON.stringify(state.settings, null, 2)); } catch (e) { log('save settings error', e.message); }
}

function binaryPath() {
  const sub = process.platform === 'win32' ? ['win32-x64', 'wireproxy.exe'] : process.platform === 'darwin' ? ['darwin', 'wireproxy'] : null;
  if (!sub) return '';
  const candidates = [
    path.join(__dirname, '..', 'bin', 'wireproxy', ...sub),
    process.resourcesPath ? path.join(process.resourcesPath, 'app', 'out', 'bin', 'wireproxy', ...sub) : ''
  ].filter(Boolean);
  return candidates.find(p => fs.existsSync(p)) || '';
}

function isMuseSession(s) {
  if (!s) return false;
  const pid = String(s.providerId || '').toLowerCase();
  return pid === 'muse' || pid === 'muse-ai' ||
    String(s.provider || '').toLowerCase().includes('muse') ||
    String(s.startUrl || '').includes('muse.ai') ||
    String(s.currentUrl || '').includes('muse.ai');
}

function musePartitions() {
  let list = [];
  try { list = state.listSessions() || []; } catch (_) {}
  return [...new Set(list.filter(isMuseSession).map(s => s.partition).filter(Boolean))];
}

function freePort() {
  return new Promise((resolve, reject) => {
    const srv = net.createServer();
    srv.unref();
    srv.on('error', reject);
    srv.listen(0, '127.0.0.1', () => { const { port } = srv.address(); srv.close(() => resolve(port)); });
  });
}

function waitPort(port, timeoutMs) {
  const until = Date.now() + timeoutMs;
  return new Promise((resolve) => {
    const tryOnce = () => {
      const sock = net.connect(port, '127.0.0.1');
      sock.once('connect', () => { sock.destroy(); resolve(true); });
      sock.once('error', () => { sock.destroy(); if (Date.now() > until) resolve(false); else setTimeout(tryOnce, 250); });
    };
    tryOnce();
  });
}

function validateWgConfig(text) {
  const t = String(text || '');
  if (!/\[Interface\]/i.test(t) || !/^\s*PrivateKey\s*=/im.test(t)) return 'File không phải cấu hình WireGuard (thiếu [Interface] / PrivateKey)';
  if (!/\[Peer\]/i.test(t) || !/^\s*Endpoint\s*=/im.test(t)) return 'File cấu hình WireGuard thiếu [Peer] / Endpoint';
  if (!/^\s*Address\s*=/im.test(t)) return 'File cấu hình WireGuard thiếu Address';
  return '';
}

// ---------- Proxy cho session Muse ----------
async function applyToSession(ses) {
  if (!ses) return;
  const want = state.settings.enabled ? (state.port ? `socks5://127.0.0.1:${state.port}` : 'socks5://127.0.0.1:9') : 'direct';
  if (state.applied.get(ses) === want) return;
  if (want === 'direct') {
    await ses.setProxy({ mode: 'direct' });
  } else {
    // VPN bật nhưng chưa chạy được -> trỏ vào cổng chết để Muse báo lỗi mạng rõ ràng,
    // tuyệt đối không âm thầm đi bằng IP thật.
    await ses.setProxy({ mode: 'fixed_servers', proxyRules: want, proxyBypassRules: '<-loopback>' });
  }
  try { await ses.closeAllConnections(); } catch (_) {}
  state.applied.set(ses, want);
  log('proxy', want, 'cho', ses.storagePath ? path.basename(ses.storagePath) : 'session');
}

async function applyAll() {
  const { session } = electron;
  if (!session) return;
  for (const p of musePartitions()) {
    try { await applyToSession(session.fromPartition(p)); } catch (e) { log('apply error', p, e.message); }
  }
}

// ---------- wireproxy ----------
async function start() {
  if (state.running && state.child) return true;
  if (state.starting) return state.starting;
  state.starting = (async () => {
    const bin = binaryPath();
    if (!bin) { state.lastError = 'Thiếu công cụ wireproxy trong bộ cài'; log(state.lastError); return false; }
    if (!fs.existsSync(wgConfPath())) { state.lastError = 'Chưa chọn file cấu hình WireGuard (Proton VPN)'; return false; }
    if (process.platform !== 'win32') { try { fs.chmodSync(bin, 0o755); } catch (_) {} }

    const port = await freePort();
    const wg = wgConfPath().replace(/\\/g, '/');
    fs.writeFileSync(proxyConfPath(), `WGConfig = ${wg}\n\n[Socks5]\nBindAddress = 127.0.0.1:${port}\n`);

    log('start wireproxy port', port);
    const child = spawn(bin, ['-c', proxyConfPath()], { windowsHide: true, stdio: ['ignore', 'pipe', 'pipe'] });
    state.child = child;
    let tail = '';
    const onData = (b) => { const s = b.toString(); tail = (tail + s).slice(-2000); try { fs.appendFileSync(logPath(), s); } catch (_) {} };
    child.stdout.on('data', onData);
    child.stderr.on('data', onData);
    child.on('exit', (code) => {
      log('wireproxy thoát, mã', code);
      if (state.child === child) {
        state.child = null; state.running = false;
        if (!state.stopping) {
          state.lastError = 'VPN Muse bị ngắt (wireproxy thoát mã ' + code + '). ' + tail.split('\n').filter(Boolean).slice(-2).join(' ');
          scheduleRestart();
        }
      }
    });
    child.on('error', (e) => { state.lastError = 'Không chạy được wireproxy: ' + e.message; log(state.lastError); });

    const ok = await waitPort(port, 15000);
    if (!ok || !state.child) {
      state.lastError = state.lastError || ('wireproxy không mở được cổng. ' + tail.split('\n').filter(Boolean).slice(-2).join(' '));
      try { child.kill(); } catch (_) {}
      return false;
    }
    state.port = port;
    state.running = true;
    state.lastError = '';
    return true;
  })();
  try { return await state.starting; } finally { state.starting = null; }
}

function scheduleRestart() {
  if (state.restartTimer || !state.settings.enabled) return;
  state.restartTimer = setTimeout(async () => {
    state.restartTimer = null;
    if (!state.settings.enabled) return;
    await start();
    await applyAll();
  }, 5000);
}

async function stop() {
  state.stopping = true;
  try { if (state.child) state.child.kill(); } catch (_) {}
  state.child = null; state.running = false; state.port = 0;
  state.stopping = false;
}

async function testIp() {
  const { session } = electron;
  if (!session) return { ok: false, error: 'no session' };
  const ses = session.fromPartition('muse-vpn-test');
  state.applied.delete(ses);
  if (state.settings.enabled && state.port) await ses.setProxy({ mode: 'fixed_servers', proxyRules: `socks5://127.0.0.1:${state.port}`, proxyBypassRules: '<-loopback>' });
  else await ses.setProxy({ mode: 'direct' });
  try { await ses.closeAllConnections(); } catch (_) {}
  try {
    const ctl = new AbortController();
    const t = setTimeout(() => ctl.abort(), 15000);
    const r = await ses.fetch('https://ipinfo.io/json', { cache: 'no-store', signal: ctl.signal });
    clearTimeout(t);
    const j = await r.json();
    state.lastIp = { ip: j.ip, country: j.country, city: j.city, org: j.org, at: Date.now() };
    return { ok: true, ...state.lastIp };
  } catch (e) {
    return { ok: false, error: 'Không kết nối được qua VPN: ' + e.message };
  }
}

function status() {
  return {
    enabled: !!state.settings.enabled,
    hasConfig: fs.existsSync(wgConfPath()),
    configName: state.settings.configName || '',
    running: state.running,
    hasBinary: !!binaryPath(),
    lastError: state.lastError,
    lastIp: state.lastIp,
    museAccounts: musePartitions().length
  };
}

async function setEnabled(on) {
  state.settings.enabled = !!on;
  saveSettings();
  if (on) {
    await start();
  } else {
    await stop();
    state.lastError = '';
    state.lastIp = null;
  }
  await applyAll();
  return status();
}

async function chooseConfig() {
  const { dialog, BrowserWindow } = electron;
  const win = BrowserWindow?.getFocusedWindow?.() || undefined;
  const r = await dialog.showOpenDialog(win, {
    title: 'Chọn file cấu hình WireGuard (Proton VPN - máy chủ US)',
    properties: ['openFile'],
    filters: [{ name: 'WireGuard', extensions: ['conf'] }, { name: 'Tất cả', extensions: ['*'] }]
  });
  if (r.canceled || !r.filePaths?.[0]) return { ...status(), canceled: true };
  const src = r.filePaths[0];
  const text = fs.readFileSync(src, 'utf8');
  const err = validateWgConfig(text);
  if (err) return { ...status(), error: err };
  fs.writeFileSync(wgConfPath(), text, { mode: 0o600 });
  state.settings.configName = path.basename(src);
  saveSettings();
  if (state.settings.enabled) { await stop(); await start(); await applyAll(); }
  return status();
}

// Gọi trước khi một view tài khoản tải trang: tài khoản Muse phải có proxy trước khi ra mạng.
async function beforeLoad(viewRecord) {
  try {
    const wc = viewRecord?.view?.webContents;
    if (!wc || wc.isDestroyed()) return;
    const pid = String(viewRecord.providerId || '').toLowerCase();
    let muse = pid === 'muse' || pid === 'muse-ai';
    if (!muse) {
      const sess = (state.listSessions() || []).find(s => s.accountId === viewRecord.accountId);
      muse = isMuseSession(sess);
    }
    if (!muse) return;
    if (state.settings.enabled && !state.running) await start();
    await applyToSession(wc.session);
  } catch (e) { log('beforeLoad error', e.message); }
}

function register(ipcMain, app, securityCheck, listSessions) {
  state.app = app;
  state.listSessions = typeof listSessions === 'function' ? listSessions : () => [];
  loadSettings();
  const guard = (ev) => { if (typeof securityCheck === 'function') securityCheck(ev); };
  ipcMain.handle('museVpn:getStatus', (ev) => { guard(ev); return status(); });
  ipcMain.handle('museVpn:chooseConfig', async (ev) => { guard(ev); return chooseConfig(); });
  ipcMain.handle('museVpn:setEnabled', async (ev, on) => { guard(ev); return setEnabled(on); });
  ipcMain.handle('museVpn:test', async (ev) => { guard(ev); return testIp(); });

  global.__museVpnBeforeLoad = beforeLoad;
  // Cửa sổ chạy job Muse: đảm bảo partition đã có proxy trước khi mở trang
  global.__museVpnEnsurePartition = async (partition) => {
    try {
      if (!partition || !electron.session) return;
      if (state.settings.enabled && !state.running) await start();
      await applyToSession(electron.session.fromPartition(partition));
    } catch (e) { log('ensurePartition error', e.message); }
  };

  const boot = async () => {
    if (state.settings.enabled) await start();
    await applyAll();
  };
  boot().catch(e => log('boot error', e.message));
  // Tài khoản Muse thêm mới / đổi trạng thái -> tự áp lại
  setInterval(() => { applyAll().catch(() => {}); }, 15000).unref?.();
  app.on('will-quit', () => { state.stopping = true; try { state.child?.kill(); } catch (_) {} });
  log('registered, enabled =', state.settings.enabled);
}

module.exports = { register, _validateWgConfig: validateWgConfig };
