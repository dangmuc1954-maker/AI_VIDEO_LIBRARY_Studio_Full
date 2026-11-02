const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

console.log('=== [PATCH] FIX HOÀN HẢO BẮT ĐÚNG ẢNH KẾT QUẢ TỪ MUSE AI (LOẠI BỎ ẢNH THAM CHIẾU INPUT) ===');

const mainFile = path.resolve('app/out/main/index.js');
let code = fs.readFileSync(mainFile, 'utf8');

const sMarker = '// ĐỒNG BỘ URL LUỒNG MỚI SANG BROWSER HUB';
const eMarker = 'tracker.updateProgress(98, "Đang lưu video vào Thư viện...");';

const sIdx = code.indexOf(sMarker);
const eIdx = code.indexOf(eMarker, sIdx);

if (sIdx === -1 || eIdx === -1) {
  console.error('❌ Không tìm thấy marker! sIdx:', sIdx, 'eIdx:', eIdx);
  process.exit(1);
}

const replacementSection = `// ĐỒNG BỘ URL LUỒNG MỚI SANG BROWSER HUB ĐỂ NGƯỜI DÙNG CÓ THỂ XEM TRỰC TIẾP
      currentUrl = wc.getURL();
      logDebug("Active generation URL", { url: currentUrl });
      if (currentUrl && !currentUrl.includes('/thread/new')) {
        session.currentUrl = currentUrl;
        try {
          const viewObj = this.browserViewManager?.views?.get(session.accountId);
          if (viewObj?.view?.webContents && !viewObj.view.webContents.isDestroyed()) {
            viewObj.view.webContents.loadURL(currentUrl);
            logDebug("Synced active thread URL to Browser Hub view", { url: currentUrl });
          }
        } catch(e) {}
      }

      // THU THẬP KÍCH THƯỚC BYTE TẤT CẢ ẢNH THAM CHIẾU ĐỂ LOẠI TRỪ TUYỆT ĐỐI (TRÁNH LẤY NHẦM ẢNH ĐẦU VÀO)
      const refFileSizes = refFilePaths.map(p => {
        try { return fs.statSync(p).size; } catch(e) { return 0; }
      }).filter(s => s > 0);
      logDebug("Reference file sizes for exclusion", { refFileSizes });

      // CHỤP SNAPSHOT TẤT CẢ ẢNH ĐANG CÓ TRÊN TRANG NGAY KHI VỪA GỬI XONG ĐỂ LÀM DANH SÁCH LOẠI TRỪ (BASELINE)
      const baselineSnapshot = await wc.executeJavaScript(\`
        (() => {
          try {
            const list = [];
            document.querySelectorAll('img').forEach(img => {
              const s = img.currentSrc || img.src;
              if (s) list.push(s);
            });
            return list;
          } catch(e) {
            return [];
          }
        })()
      \`, true).catch(() => []);
      const knownInputImages = Array.from(new Set(baselineSnapshot || []));
      logDebug("Known input images baseline captured", { count: knownInputImages.length });

      tracker.updateProgress(35, isImageJob ? "Prompt đã gửi thành công! Đang theo dõi tiến trình tạo ảnh Muse AI..." : "Prompt đã gửi thành công! Đang theo dõi tiến trình tạo video...");

      // 5. POLLING KẾT QUẢ HOÀN THÀNH (TIMEOUT TỐI ĐA 4 PHÚT)
      const startTime = Date.now();
      const timeoutMs = 4 * 60 * 1000;
      let videoBytes = null;
      let finalVideoUrl = "";

      while (Date.now() - startTime < timeoutMs) {
        if (tracker.signal?.aborted) throw new Error("Tác vụ đã bị người dùng hủy");

        const elapsed = Math.round((Date.now() - startTime) / 1000);
        const curPct = Math.min(92, 35 + Math.floor(elapsed / 2.2));
        tracker.updateProgress(curPct, isImageJob ? ("Muse AI đang vẽ ảnh (" + elapsed + "s)...") : ("Muse AI đang dựng video (" + elapsed + "s)..."));

        // Quét kết quả thời gian thực
        const scanRes = await wc.executeJavaScript(\`
          (() => {
            try {
              const bodyText = (document.body?.innerText || '').toLowerCase();
              if (bodyText.includes('upgrade to pro') || bodyText.includes('out of credits') || bodyText.includes('hết credit')) {
                return { hasError: true, error: "Tài khoản Muse AI đã hết credits." };
              }

              const log = document.querySelector('[role="log"]') || document.body;

              // 1. NẾU LÀ TẠO ẢNH: QUÉT THẺ IMG VÀ LINK ẢNH CỦA BOT TRẢ VỀ
              const isImg = \${isImageJob};
              if (isImg) {
                // Kiểm tra trạng thái Muse đang sinh ảnh
                const stopBtn = document.querySelector('button[aria-label*="Stop"], button[aria-label*="Dừng"], button[title*="Stop"], button[title*="Dừng"]');
                const hasSpinner = document.querySelector('[class*="spinner"], [class*="generating"], [role="progressbar"], [aria-busy="true"]') !== null;
                const isGenerating = !!stopBtn || hasSpinner || bodyText.includes('generating...') || bodyText.includes('thinking...');

                // Tránh lấy nhầm khi AI chưa kịp bắt đầu hoặc còn đang sinh ảnh
                if (\${elapsed} < 7 || isGenerating) {
                  return { found: false, isGenerating: true };
                }

                const knownInputs = new Set(\${JSON.stringify(knownInputImages)});

                // Định vị phần tử chứa nội dung prompt của người dùng để phân tách:
                // Ảnh kết quả BẮT BUỘC phải nằm sau vị trí tin nhắn prompt trong DOM
                const promptSnippet = \${JSON.stringify(prompt.slice(0, 35).trim())};
                let promptNode = null;
                if (promptSnippet) {
                  const allTextNodes = Array.from(document.querySelectorAll('*')).filter(el => {
                    return el.children.length === 0 && (el.innerText || el.textContent || '').includes(promptSnippet);
                  });
                  if (allTextNodes.length > 0) {
                    promptNode = allTextNodes[allTextNodes.length - 1];
                  }
                }

                // Quét các thẻ img trong khung chat
                const allImgs = Array.from(log.querySelectorAll('img'));
                const candidateImgs = allImgs.filter(img => {
                  const r = img.getBoundingClientRect();
                  const w = img.naturalWidth || r.width || 0;
                  const h = img.naturalHeight || r.height || 0;
                  const src = img.currentSrc || img.src || '';

                  // Lọc kích thước tối thiểu (ảnh kết quả thường >= 200px)
                  if (w < 200 || h < 200) return false;

                  // Lọc các thành phần UI
                  if (src.includes('avatar') || src.includes('profile') || src.includes('icon') || src.includes('logo') || src.includes('landing')) return false;

                  // BẮT BUỘC: Không phải là ảnh tham chiếu ban đầu
                  if (knownInputs.has(src)) return false;

                  // BẮT BUỘC: Nếu tìm thấy promptNode, ảnh kết quả phải nằm sau promptNode
                  if (promptNode) {
                    const pos = promptNode.compareDocumentPosition(img);
                    if (!(pos & Node.DOCUMENT_POSITION_FOLLOWING)) return false;
                  }

                  return src.startsWith('http') || src.startsWith('blob:') || src.startsWith('data:');
                });

                if (candidateImgs.length > 0) {
                  const targetImg = candidateImgs[candidateImgs.length - 1];
                  // Kiểm tra xem img có nằm trong thẻ <a> có link tải trực tiếp không
                  const parentA = targetImg.closest('a[href*=".png"], a[href*=".jpg"], a[href*=".jpeg"], a[href*=".webp"]');
                  const finalUrl = (parentA && parentA.href) ? parentA.href : (targetImg.currentSrc || targetImg.src);
                  return { found: true, mediaType: 'image', url: finalUrl };
                }

                // Quét các link tải ảnh PNG / JPG / WEBP xuất hiện sau promptNode
                const imgLinks = Array.from(log.querySelectorAll('a[href*=".png"], a[href*=".jpg"], a[href*=".jpeg"], a[href*=".webp"]')).filter(a => {
                  if (!a.href) return false;
                  if (knownInputs.has(a.href)) return false;
                  if (promptNode) {
                    const pos = promptNode.compareDocumentPosition(a);
                    if (!(pos & Node.DOCUMENT_POSITION_FOLLOWING)) return false;
                  }
                  return true;
                });
                if (imgLinks.length > 0) {
                  const a = imgLinks[imgLinks.length - 1];
                  return { found: true, mediaType: 'image', url: a.href };
                }
              }

              // 2. QUÉT VIDEO (CHO JOB VIDEO HOẶC FALLBACK NẾU MUSE XUẤT VIDEO)
              if (!isImg) {
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
              }

              return { found: false };
            } catch(e) {
              return { found: false, error: e.message };
            }
          })()
        \`, true);

        if (scanRes?.hasError) {
          throw new Error(scanRes.error);
        }

        if (scanRes?.found && scanRes.url) {
          logDebug("Candidate media found in log", scanRes);

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
                // KIỂM TRA ĐỐI CHIẾU BYTE: Tuyệt đối không lấy nhầm ảnh tham chiếu đầu vào
                if (refFileSizes.includes(imgBytes.length)) {
                  logDebug("Candidate image matches exact byte size of reference input (" + imgBytes.length + " bytes), skipping input reference image and waiting for real generated image...");
                } else if (imgBytes.length > 5000) {
                  logDebug("Captured REAL generated image successfully!", { byteLength: imgBytes.length });
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
          }

          // XỬ LÝ LƯU VIDEO (VIDEO JOB)
          if (!isImageJob) {
            try {
              const blobRes = await wc.executeJavaScript(\`
                (async () => {
                  try {
                    const r = await fetch(\${JSON.stringify(scanRes.url)});
                    if (!r.ok) return { ok: false, error: 'HTTP ' + r.status };
                    const blob = await r.blob();
                    if (blob.size > 256 * 1024 * 1024) return { ok: false, error: 'File quá lớn' };

                    const b64 = await new Promise((resolve, reject) => {
                      const reader = new FileReader();
                      reader.onload = () => resolve(reader.result.split(',')[1]);
                      reader.onerror = () => reject(Error('Cannot read blob'));
                      reader.readAsDataURL(blob);
                    });
                    return { ok: true, size: blob.size, b64: b64 };
                  } catch(e) {
                    return { ok: false, error: e.message };
                  }
                })()
              \`, true);

              if (blobRes?.ok && blobRes.b64) {
                const bytes = Buffer.from(blobRes.b64, 'base64');
                logDebug("Candidate blob size check", { byteLength: bytes.length });

                // Lọc bỏ mascot / video avatar mở đầu (< 1,000,000 bytes)
                if (bytes.length < 1000000) {
                  logDebug("Mascot avatar skipped (" + bytes.length + " bytes), waiting for real video...");
                } else {
                  videoBytes = bytes;
                  finalVideoUrl = scanRes.url;
                  logDebug("Captured real video successfully!", { byteLength: videoBytes.length });
                  break;
                }
              }
            } catch(e) {
              logDebug("Error reading candidate video blob", { error: e.message });
            }
          }
        }

        await new Promise(r => setTimeout(r, 2500));
      }

      if (isImageJob) {
        throw new Error("Quá thời gian chờ tạo ảnh trên Muse AI (4 phút). Vui lòng thử lại với prompt khác hoặc kiểm tra tài khoản Muse AI.");
      }

      if (!videoBytes || videoBytes.length < 1000000) {
        throw new Error("Quá thời gian chờ tạo video trên Muse AI (4 phút). Vui lòng thử lại với prompt ngắn hơn hoặc kiểm tra tài khoản Muse AI.");
      }

      `;

code = code.substring(0, sIdx) + replacementSection + code.substring(eIdx);
fs.writeFileSync(mainFile, code, 'utf8');
console.log('✅ Đã cập nhật thành công logic trích xuất ảnh Muse AI chuẩn xác vào app/out/main/index.js');

// Kiểm tra cú pháp
try {
  execSync('node -c app/out/main/index.js', { stdio: 'inherit' });
  console.log('🎉 Cú pháp app/out/main/index.js hợp lệ 100%!');
} catch (e) {
  console.error('❌ Lỗi cú pháp JavaScript trong app/out/main/index.js');
  process.exit(1);
}
