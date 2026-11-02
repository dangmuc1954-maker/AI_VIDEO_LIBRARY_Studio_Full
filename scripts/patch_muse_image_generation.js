const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

console.log('======================================================================');
console.log('🎨 TÍCH HỢP TOÀN DIỆN TẠO ẢNH (IMAGE GENERATION) CHO MUSE AI 🎨');
console.log('======================================================================');

const mainFile = path.resolve(__dirname, '../app/out/main/index.js');
let code = fs.readFileSync(mainFile, 'utf8');

// 1. CẬP NHẬT class dm: get(e, t) hỗ trợ t === "Image"
console.log('[1/5] Cập nhật bộ điều phối runtime dm.prototype.get...');
const oldDmCheck = 'if(muse&&(t==="Video"||!t||!e||String(e).toLowerCase().includes("muse")||String(e).startsWith("custom-"))){return muse}';
const newDmCheck = 'if(muse&&(t==="Video"||t==="Image"||!t||!e||String(e).toLowerCase().includes("muse")||String(e).startsWith("custom-"))){return muse}';

if (code.includes(oldDmCheck)) {
  code = code.replace(oldDmCheck, newDmCheck);
  console.log('  ✓ Đã cập nhật dm.get hỗ trợ fallback cho t === "Image"');
} else {
  console.log('  ℹ dm.get đã hỗ trợ hoặc cấu trúc đã thay đổi');
}

// 2. CẬP NHẬT function _B: Nhận diện job Image của Muse AI để phân bổ account
console.log('[2/5] Cập nhật hàm phân bổ tài khoản _B(r, e)...');
const old_B_target = 'if(r.type==="Video"&&(r.providerId==="muse"||r.provider==="Muse AI"||(r.provider&&r.provider.toLowerCase().includes("muse"))||r.payload?.model==="muse-video")){';
const new_B_target = 'if((r.type==="Video"||r.type==="Image"||r.type==="image")&&(r.providerId==="muse"||r.provider==="Muse AI"||(r.provider&&r.provider.toLowerCase().includes("muse"))||r.payload?.model==="muse-video"||r.payload?.model==="muse-image")){';

if (code.includes(old_B_target)) {
  code = code.replace(old_B_target, new_B_target);
  console.log('  ✓ Đã cập nhật _B() xử lý cả type Video và Image cho Muse AI');
} else {
  console.log('  ℹ _B() đã được cập nhật trước đó');
}

// 3. CẬP NHẬT Jd: supportedJobTypes của Muse AI bao gồm cả Image Generation
console.log('[3/5] Cập nhật supportedJobTypes của Muse AI trong danh mục Jd...');
code = code.replace(
  '{id:"muse",name:"Muse AI",startUrl:"https://muse.ai/",supportedJobTypes:["Video Generation"',
  '{id:"muse",name:"Muse AI",startUrl:"https://muse.ai/",supportedJobTypes:["Image Generation","Video Generation"'
);
console.log('  ✓ Đã thêm "Image Generation" vào supportedJobTypes của Muse AI');

// 4. CẬP NHẬT MuseVideoRuntime để hỗ trợ cả Video và Image
console.log('[4/5] Nâng cấp MuseVideoRuntime -> hỗ trợ tạo cả Ảnh (Image) và Video...');

// 4.1. Cập nhật supports(type)
const oldSupports = `  supports(type) {
    return type === "Video" || type === "video";
  }`;
const newSupports = `  supports(type) {
    return type === "Video" || type === "video" || type === "Image" || type === "image";
  }`;

if (code.includes(oldSupports)) {
  code = code.replace(oldSupports, newSupports);
  console.log('  ✓ Đã cập nhật supports(type) trả về true cho cả Image và Video');
}

// 4.2. Tìm khối MuseVideoRuntime và chèn logic xử lý Image
// Trích xuất vị trí của class MuseVideoRuntime
const runtimeStart = code.indexOf('class MuseVideoRuntime');
const runtimeEnd = code.indexOf('class Ys');

if (runtimeStart !== -1 && runtimeEnd !== -1) {
  let runtimeSlice = code.substring(runtimeStart, runtimeEnd);

  // Đảm bảo supports trả về true cho Image
  runtimeSlice = runtimeSlice.replace(
    /supports\s*\([^)]*\)\s*\{[^}]+\}/,
    'supports(type) {\n    return type === "Video" || type === "video" || type === "Image" || type === "image";\n  }'
  );

  // Thêm nhận diện isImageJob ở đầu runJob
  const isImageDeclaration = 'const isImageJob = (job.type === "Image" || job.type === "image");';
  if (!runtimeSlice.includes(isImageDeclaration)) {
    runtimeSlice = runtimeSlice.replace(
      'async runJob(job, tracker) {',
      'async runJob(job, tracker) {\n    const isImageJob = (job.type === "Image" || job.type === "image");'
    );
  }

  // Cập nhật thông báo tiến trình cho Image/Video
  runtimeSlice = runtimeSlice.replace(
    'tracker.updateProgress(5, "Đang kết nối tài khoản Muse AI...");',
    'tracker.updateProgress(5, isImageJob ? "Đang kết nối tài khoản Muse AI tạo ảnh..." : "Đang kết nối tài khoản Muse AI tạo video...");'
  );
  runtimeSlice = runtimeSlice.replace(
    'tracker.updateProgress(10, "Đang mở trang tạo video Muse AI...");',
    'tracker.updateProgress(10, isImageJob ? "Đang mở trang tạo ảnh Muse AI..." : "Đang mở trang tạo video Muse AI...");'
  );
  runtimeSlice = runtimeSlice.replace(
    'tracker.updateProgress(35, "Prompt đã gửi thành công! Đang theo dõi tiến trình tạo video...");',
    'tracker.updateProgress(35, isImageJob ? "Prompt đã gửi thành công! Đang theo dõi tiến trình tạo ảnh Muse AI..." : "Prompt đã gửi thành công! Đang theo dõi tiến trình tạo video...");'
  );

  // Cập nhật polling loop: Tìm kiếm cả Image (thẻ img, link png/jpg/webp) khi isImageJob = true
  const oldScanMarker = 'const scanRes = await wc.executeJavaScript(`';
  const newScanScript = `const scanRes = await wc.executeJavaScript(\`
          (() => {
            try {
              const bodyText = (document.body?.innerText || '').toLowerCase();
              if (bodyText.includes('upgrade to pro') || bodyText.includes('out of credits') || bodyText.includes('hết credit')) {
                return { hasError: true, error: "Tài khoản Muse AI đã hết credits." };
              }

              const log = document.querySelector('[role="log"]') || document.body;

              // 1. NẾU LÀ TẠO ẢNH: QUÉT THẺ IMG VÀ LINK ẢNH TRƯỚC TIÊN
              const isImg = \${isImageJob};
              if (isImg) {
                // Quét các thẻ img trong khung chat
                const imgs = Array.from(log.querySelectorAll('img')).filter(img => {
                  const r = img.getBoundingClientRect();
                  const w = img.naturalWidth || r.width || 0;
                  const h = img.naturalHeight || r.height || 0;
                  const src = img.currentSrc || img.src || '';
                  if (w < 180 || h < 180) return false;
                  if (src.includes('avatar') || src.includes('profile') || src.includes('icon') || src.includes('logo')) return false;
                  return src.startsWith('http') || src.startsWith('blob:') || src.startsWith('data:');
                });

                if (imgs.length > 0) {
                  const lastImg = imgs[imgs.length - 1];
                  const src = lastImg.currentSrc || lastImg.src;
                  return { found: true, mediaType: 'image', url: src };
                }

                // Quét các link tải ảnh PNG / JPG / WEBP
                const imgLinks = Array.from(log.querySelectorAll('a[href*=".png"], a[href*=".jpg"], a[href*=".jpeg"], a[href*=".webp"]'));
                for (let i = imgLinks.length - 1; i >= 0; i--) {
                  const a = imgLinks[i];
                  if (a.href) return { found: true, mediaType: 'image', url: a.href };
                }
              }

              // 2. QUÉT VIDEO (CHO JOB VIDEO HOẶC FALLBACK NẾU MUSE XUẤT VIDEO)
              const hatchVideos = Array.from(log.querySelectorAll('[data-hatch-video-src]'));
              for (let i = hatchVideos.length - 1; i >= 0; i--) {
                const e = hatchVideos[i];
                const u = e.getAttribute('data-hatch-video-src');
                if (u && (u.startsWith('http') || u.startsWith('blob:'))) {
                  return { found: true, mediaType: 'video', url: u };
                }
              }

              const videos = Array.from(log.querySelectorAll('video'));
              for (let i = videos.length - 1; i >= 0; i--) {
                const v = videos[i];
                const u = v.currentSrc || v.src || v.querySelector('source')?.src;
                if (u && (u.startsWith('http') || u.startsWith('blob:'))) {
                  return { found: true, mediaType: 'video', url: u, duration: v.duration || 0 };
                }
              }

              const links = Array.from(log.querySelectorAll('a[href*=".mp4"], a[download]'));
              for (let i = links.length - 1; i >= 0; i--) {
                const a = links[i];
                if (a.href) return { found: true, mediaType: 'video', url: a.href };
              }

              return { found: false };
            } catch(e) {
              return { found: false, error: e.message };
            }
          })()
        \`, true);`;

  // Thay thế khối scanRes
  const scanIdx = runtimeSlice.indexOf('const scanRes = await wc.executeJavaScript(`');
  const scanEndIdx = runtimeSlice.indexOf('if (scanRes?.hasError)', scanIdx);
  if (scanIdx !== -1 && scanEndIdx !== -1) {
    runtimeSlice = runtimeSlice.substring(0, scanIdx) + newScanScript + '\n\n        ' + runtimeSlice.substring(scanEndIdx);
    console.log('  ✓ Đã tích hợp bộ quét DOM thông minh nhận diện cả Ảnh và Video');
  }

  // Thêm xử lý lưu ảnh khi scanRes.mediaType === 'image'
  const oldLogMarker = 'logDebug("Candidate video found in log", scanRes);';
  const newLogMarker = `logDebug("Candidate media found in log", scanRes);

          // XỬ LÝ LƯU ẢNH (IMAGE JOB)
          if (scanRes.mediaType === 'image' || isImageJob) {
            try {
              tracker.updateProgress(90, "Đang trích xuất ảnh Muse AI...");
              const imgBlobRes = await wc.executeJavaScript(\`
                (async () => {
                  try {
                    const r = await fetch(\${JSON.stringify(scanRes.url)});
                    if (!r.ok) return { ok: false, error: 'HTTP ' + r.status };
                    const blob = await r.blob();
                    const b64 = await new Promise((resolve, reject) => {
                      const reader = new FileReader();
                      reader.onload = () => resolve(reader.result.split(',')[1]);
                      reader.onerror = () => reject(Error('Cannot read blob'));
                      reader.readAsDataURL(blob);
                    });
                    return { ok: true, size: blob.size, mimeType: blob.type || 'image/png', b64: b64 };
                  } catch(e) {
                    return { ok: false, error: e.message };
                  }
                })()
              \`, true);

              if (imgBlobRes?.ok && imgBlobRes.b64) {
                const imgBytes = Buffer.from(imgBlobRes.b64, 'base64');
                if (imgBytes.length > 5000) {
                  logDebug("Captured real image successfully!", { byteLength: imgBytes.length });
                  tracker.updateProgress(98, "Đang lưu ảnh vào Thư viện...");
                  const assetService = this.assets || (typeof V !== 'undefined' ? V : null);
                  if (assetService && typeof assetService.cacheGeneratedBytes === 'function') {
                    const savedAsset = await assetService.cacheGeneratedBytes(job, {
                      bytes: imgBytes,
                      mimeType: imgBlobRes.mimeType || "image/png",
                      remoteUrl: scanRes.url,
                      providerAssetId: "muse-img-" + Date.now()
                    });
                    tracker.updateProgress(100, "Tạo ảnh Muse AI hoàn tất!");
                    logDebug("Successfully saved NEW Muse AI image asset!", { assetId: savedAsset.id });
                    return {
                      assets: [savedAsset],
                      provider: {
                        operationId: "muse-" + Date.now(),
                        raw: {
                          model: "muse-image",
                          prompt: prompt,
                          remoteUrl: scanRes.url,
                          accountId: session.accountId
                        }
                      }
                    };
                  }
                }
              }
            } catch(imgErr) {
              logDebug("Error capturing image bytes", { error: imgErr.message });
            }
          }`;

  if (runtimeSlice.includes(oldLogMarker)) {
    runtimeSlice = runtimeSlice.replace(oldLogMarker, newLogMarker);
    console.log('  ✓ Đã tích hợp luồng nạp và lưu ảnh hoàn chỉnh vào AssetService');
  } else if (runtimeSlice.includes('logDebug("Candidate media found in log"')) {
    console.log('  ✓ Luồng lưu ảnh đã có sẵn trong runtimeSlice');
  }

  code = code.substring(0, runtimeStart) + runtimeSlice + code.substring(runtimeEnd);
}

fs.writeFileSync(mainFile, code, 'utf8');
console.log('💾 Đã lưu app/out/main/index.js thành công!');

// 5. CẬP NHẬT DỮ LIỆU APPDATA BROWSER SESSIONS
console.log('[5/5] Cập nhật danh sách session trong AppData để Muse AI hỗ trợ Image...');
const sessionPath = path.join(process.env.APPDATA || '', 'AI_VIDEO_LIBRARY_DATA/browser-sessions.json');
if (fs.existsSync(sessionPath)) {
  try {
    const raw = JSON.parse(fs.readFileSync(sessionPath, 'utf8'));
    const isArr = Array.isArray(raw);
    const sessions = isArr ? raw : (raw.sessions || []);
    let modified = false;

    sessions.forEach(s => {
      if ((s.provider && s.provider.toLowerCase().includes('muse')) || (s.startUrl && s.startUrl.includes('muse.ai')) || s.providerId === 'muse') {
        s.supportedJobTypes = ["Image Generation", "Video Generation", "Image to Video", "Reference Assets", "Browser Request"];
        modified = true;
      }
    });

    if (modified) {
      fs.writeFileSync(sessionPath, JSON.stringify(raw, null, 2), 'utf8');
      console.log('  ✓ Đã cập nhật session Muse AI trong AppData: hỗ trợ Image Generation');
    }
  } catch(e) {
    console.error('  ⚠️ Lỗi khi cập nhật browser-sessions.json:', e.message);
  }
}

// Kiểm tra cú pháp JavaScript
console.log('\n[*] Kiểm tra cú pháp (Syntax Check)...');
try {
  execSync(`node -c "${mainFile}"`, { stdio: 'inherit' });
  console.log('  ✅ main/index.js cú pháp 100% hợp lệ!');
} catch (err) {
  console.error('❌ Lỗi cú pháp:', err.message);
  process.exit(1);
}

console.log('======================================================================');
console.log('🎉 ĐÃ HOÀN TẤT TÍCH HỢP TẠO ẢNH CHO MUSE AI THÀNH CÔNG RỰC RỠ! 🎉');
console.log('======================================================================');
