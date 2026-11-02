const fs = require('fs');
const path = require('path');

const rootDir = path.resolve(__dirname, '..');
const appOutDir = path.join(rootDir, 'app', 'out');
const backupDir = path.join(rootDir, 'app', 'out_backup_before_v101_upgrade');
const sourceOutDir = path.join(rootDir, 'extracted_v101_out', 'out');

console.log('=== NÂNG CẤP LÕI MAIN TRANSPORT CHO BANANA & VEO3 (v1.0.1) ===');

// 1. Sao lưu app/out hiện tại nếu chưa có
if (!fs.existsSync(backupDir)) {
  console.log('[1/7] Đang tạo bản sao lưu an toàn tại:', backupDir);
  fs.cpSync(appOutDir, backupDir, { recursive: true });
} else {
  console.log('[1/7] Bản sao lưu đã tồn tại, tiếp tục.');
}

// 2. Chép toàn bộ 93 files từ sourceOutDir sang appOutDir
console.log('[2/7] Chép toàn bộ bundle v1.0.1 sạch vào app/out...');
fs.cpSync(sourceOutDir, appOutDir, { recursive: true });

// 3. Chuẩn bị file main/index.js
const mainFile = path.join(appOutDir, 'main', 'index.js');
let code = fs.readFileSync(mainFile, 'utf8');

// A. Thêm Module Require & Security Chip & Isolation Hook ở đầu file
const topImports = `import { createRequire as __createRequire } from "node:module";
const require = __createRequire(import.meta.url);
try { require('./security_trap.cjs'); } catch(e) {}
function _getWatermarkCleanerModule(){const _pM=require("node:path"),_fM=require("node:fs");const _base=typeof __dirname!=="undefined"?__dirname:process.cwd();const _cPaths=[_pM.join(_base,"../../modules/media_watermark_cleaner.cjs"),_pM.join(_base,"../modules/media_watermark_cleaner.cjs"),_pM.join(_base,"modules/media_watermark_cleaner.cjs"),_pM.join(process.cwd(),"app/modules/media_watermark_cleaner.cjs"),_pM.join(process.cwd(),"modules/media_watermark_cleaner.cjs"),process.resourcesPath?_pM.join(process.resourcesPath,"app/modules/media_watermark_cleaner.cjs"):"",process.resourcesPath?_pM.join(process.resourcesPath,"modules/media_watermark_cleaner.cjs"):"","C:/Users/admin/AppData/Local/Programs/AI VIDEO LIBRARY/resources/app/modules/media_watermark_cleaner.cjs"].filter(Boolean);const _mPath=_cPaths.find(p=>_fM.existsSync(p));if(_mPath){try{return require(_mPath)}catch(e){console.warn("[MediaWatermarkCleaner require failed]:",e.message)}}return null;}
`;

code = topImports + code;

// B. Inject Isolation Hook vào ngay sau khi biến $ (app) sẵn sàng
const isolationHook = `
try {
  process.on("uncaughtException", (err) => {
    try {
      const _fs = require("node:fs"), _p = require("node:path");
      const _dir = _p.join(process.env.APPDATA || ".", "AI_VIDEO_LIBRARY_DATA");
      if (!_fs.existsSync(_dir)) _fs.mkdirSync(_dir, { recursive: true });
      _fs.appendFileSync(_p.join(_dir, "crash.log"), "[" + new Date().toISOString() + "] " + (err?.stack || err) + "\\n");
    } catch {}
  });
  const _ud = Q($.getPath("appData"), "AI_VIDEO_LIBRARY_DATA");
  $.setName("AI VIDEO LIBRARY");
  $.setAppUserModelId("com.tris.aivideolibrary.studio");
  $.setPath("userData", _ud);
  if (!Qo.existsSync(_ud)) Qo.mkdirSync(_ud, { recursive: true });

  // Tự động sao chép video catalog và sessions từ aiforge-studio nếu chưa có
  try {
    const _srcCat = Q($.getPath("appData"), "aiforge-studio", "google-flow-video-catalog.production.json");
    const _dstCat = Q(_ud, "google-flow-video-catalog.production.json");
    if (!Qo.existsSync(_dstCat) && Qo.existsSync(_srcCat)) {
      Qo.copyFileSync(_srcCat, _dstCat);
    }
  } catch (_) {}
} catch(e) { console.error("[Isolation Hook Error]", e); }
`;

// Chèn isolationHook ngay sau phần import đầu tiên
const firstImportEnd = code.indexOf('from"node:os";');
if (firstImportEnd !== -1) {
  const insertPos = firstImportEnd + 'from"node:os";'.length;
  code = code.slice(0, insertPos) + isolationHook + code.slice(insertPos);
}

// C. Cập nhật License Backend URL & Public Key
// Tìm function Pi() và function tG()
const piIdx = code.indexOf('function Pi(){');
if (piIdx !== -1) {
  const piEnd = code.indexOf('}', piIdx);
  const newPi = `function Pi(){return(process.env.AIVIDEO_BACKEND_URL||process.env.AFS_BACKEND_URL||"https://vercelserver-eight.vercel.app").replace(/\\/+$/,"")}`;
  code = code.slice(0, piIdx) + newPi + code.slice(piEnd + 1);
  console.log('[3/7] Đã gán Backend URL chính xác: https://vercelserver-eight.vercel.app');
}

const tgIdx = code.indexOf('function tG(){');
if (tgIdx !== -1) {
  const tgEnd = code.indexOf('function Cl(){', tgIdx);
  if (tgEnd !== -1) {
    const newTg = `function tG(){const _k={"2026-q3":"-----BEGIN PUBLIC KEY-----\\nMCowBQYDK2VwAyEAMAXS0Ql/9WdX8ZAQQQwG4ZG/RYbkegjO2+C8Gptn4mo=\\n-----END PUBLIC KEY-----\\n"};return _k;}`;
    code = code.slice(0, tgIdx) + newTg + code.slice(tgEnd);
    console.log('[4/7] Đã gán Ed25519 Public Key bản quyền server');
  }
}

// D. Hỗ trợ scheme 'aivideo-asset'
const schemeIdx = code.indexOf('xl.registerSchemesAsPrivileged([');
if (schemeIdx !== -1) {
  const schemeInsert = `xl.registerSchemesAsPrivileged([{scheme:"aivideo-asset",privileges:{standard:!0,secure:!0,supportFetchAPI:!0,corsEnabled:!0,stream:!0,bypassCSP:!0}},`;
  code = code.slice(0, schemeIdx) + schemeInsert + code.slice(schemeIdx + 'xl.registerSchemesAsPrivileged(['.length);
  console.log('[5/7] Đã đăng ký scheme aivideo-asset là privileged');
}

// Handler cho 'aivideo-asset'
const handleAssetIdx = code.indexOf('xl.handle("aiforge-asset",');
if (handleAssetIdx !== -1) {
  // Tìm khối handle
  const aivideoHandle = `xl.handle("aivideo-asset",async d=>{try{const l=new URL(d.url),m=decodeURIComponent(l.pathname.replace(/^\\//,"")),h=l.host==="asset"?(J.getAsset(m)||global.__aiforge_temp_merged_assets?.get(m)):null,f=l.searchParams.get("variant")||void 0;if(h){const I=f?h.variants?.[f]?.localPath||h.localPath:h.localPath;if(I&&Qo.existsSync(I))return Qh.fetch(to(I))}return new Response("Not found",{status:404})}catch(l){return new Response("Asset error",{status:500})}});\n`;
  code = code.slice(0, handleAssetIdx) + aivideoHandle + code.slice(handleAssetIdx);
  console.log('[5/7] Đã đăng ký handler cho scheme aivideo-asset');
}

// E. Tự động đồng bộ browser-sessions từ các nguồn lân cận vào hydrate()
const hydrateIdx = code.indexOf('hydrate(e){if(this.store=new ke(e,{sessions:[]})');
if (hydrateIdx !== -1) {
  const syncSessionsInject = `
    try {
      const _pData = $.getPath("appData");
      const _siblingSources = [
        Q(_pData, "aiforge-studio", "browser-sessions.json"),
        Q(_pData, "aiforge-studio", "browser-sessions.json.master_vault.json"),
        Q(_pData, "AI VIDEO LIBRARY", "browser-sessions.json")
      ];
      let _existingData = { sessions: [] };
      if (Oe(e)) {
        try { _existingData = JSON.parse(Qt(e, "utf8")) || { sessions: [] }; } catch (_) {}
      }
      const _sessionMap = new Map();
      for (const s of (_existingData.sessions || [])) { if (s && s.accountId) _sessionMap.set(s.accountId, s); }
      for (const src of _siblingSources) {
        if (Oe(src)) {
          try {
            const parsed = JSON.parse(Qt(src, "utf8"));
            if (Array.isArray(parsed?.sessions)) {
              for (const s of parsed.sessions) {
                if (s && s.accountId && !_sessionMap.has(s.accountId)) {
                  _sessionMap.set(s.accountId, s);
                }
              }
            }
          } catch (_) {}
        }
      }
      _existingData.sessions = Array.from(_sessionMap.values());
      try { Qo.writeFileSync(e, JSON.stringify(_existingData, null, 2), "utf8"); } catch (_) {}
    } catch (_) {}
`;
  code = code.slice(0, hydrateIdx + 'hydrate(e){'.length) + syncSessionsInject + code.slice(hydrateIdx + 'hydrate(e){'.length);
  console.log('[6/7] Đã tích hợp tự động đồng bộ Browser Hub sessions liên thư mục');
}

// F. Ghi lại main/index.js
fs.writeFileSync(mainFile, code, 'utf8');
console.log('✅ Đã cập nhật xong app/out/main/index.js (Độ dài:', code.length, 'bytes)');

// 4. Cập nhật renderer/index.html
const htmlFile = path.join(appOutDir, 'renderer', 'index.html');
const newHtml = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <link rel="icon" type="image/png" href="./app-icon.png" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <link rel="preconnect" href="https://fonts.googleapis.com" />
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
    <link
      href="https://fonts.googleapis.com/css2?family=Be+Vietnam+Pro:wght@300;400;500;600;700;800&family=Plus+Jakarta+Sans:wght@300;400;500;600;700;800&family=Inter:wght@300;400;500;600;700;800&family=JetBrains+Mono:wght@400;500;600;700&display=swap"
      rel="stylesheet"
    />
    <link
      href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200"
      rel="stylesheet"
    />

    <title>AI VIDEO LIBRARY</title>
    <script>
      try {
        if (!sessionStorage.getItem("aiforge_app_session_active")) {
          sessionStorage.setItem("aiforge_app_session_active", "1");
          window.__aiforge_session_start_time = Date.now();
        }
        window.addEventListener("DOMContentLoaded", () => {
          try {
            const vDir = localStorage.getItem("aiforge_auto_download_video_dir") || localStorage.getItem("aiforge_auto_download_dir") || "";
            const iDir = localStorage.getItem("aiforge_auto_download_image_dir") || "";
            const vOn = localStorage.getItem("aiforge_auto_download_video") === "true";
            const iOn = localStorage.getItem("aiforge_auto_download_image") === "true";
            const mOn = localStorage.getItem("aiforge_auto_merge_queue_enabled") === "true";
            window.aivideo?.settings?.setAutoDownloadConfig?.({
              video: { enabled: vOn, directory: vDir },
              image: { enabled: iOn, directory: iDir },
              autoMerge: { enabled: mOn, directory: vDir }
            });
          } catch (_) {}
        });
      } catch (_) {}
    </script>
    <script type="module" crossorigin src="./assets/index-C16kk4eT.js"></script>
    <script type="module" src="./assets/aiforge_video_editor_automerge.js"></script>
    <link rel="stylesheet" crossorigin href="./assets/index-B3hyrVNo.css">
    <link rel="stylesheet" href="./assets/cyber_galaxy_theme.css">
  </head>
  <body class="bg-[#0a0a14] text-white antialiased">
    <div id="root"></div>
  </body>
</html>
`;

fs.writeFileSync(htmlFile, newHtml, 'utf8');
console.log('✅ Đã cập nhật xong app/out/renderer/index.html');

// 5. Chép addon files
const assetDest = path.join(appOutDir, 'renderer', 'assets');
const automergeSrc = path.join(rootDir, 'app', 'out_backup_before_sync', 'renderer', 'assets', 'aiforge_video_editor_automerge.js');
const cyberThemeSrc = path.join(rootDir, 'app', 'out_backup_before_sync', 'renderer', 'assets', 'cyber_galaxy_theme.css');

if (fs.existsSync(automergeSrc)) {
  fs.copyFileSync(automergeSrc, path.join(assetDest, 'aiforge_video_editor_automerge.js'));
  console.log('  ✓ Đã chép aiforge_video_editor_automerge.js');
}
if (fs.existsSync(cyberThemeSrc)) {
  fs.copyFileSync(cyberThemeSrc, path.join(assetDest, 'cyber_galaxy_theme.css'));
  console.log('  ✓ Đã chép cyber_galaxy_theme.css');
}

const secTrapSrc = path.join(rootDir, 'app', 'out_backup_before_sync', 'main', 'security_trap.cjs');
if (fs.existsSync(secTrapSrc)) {
  fs.copyFileSync(secTrapSrc, path.join(appOutDir, 'main', 'security_trap.cjs'));
  console.log('  ✓ Đã chép security_trap.cjs');
}

console.log('[7/7] Hoàn tất toàn bộ quy trình nâng cấp v1.0.1!');
