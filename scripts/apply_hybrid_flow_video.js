const fs = require('fs');
const path = require('path');

const targetFile = path.resolve(__dirname, '../app/out/main/index.js');
let code = fs.readFileSync(targetFile, 'utf8');

console.log('--- BẮT ĐẦU PATCH HYBRID DUAL-ENGINE GOOGLE FLOW VIDEO ---');

// 1. TÌM VỊ TRÍ function nl(r)
const nlStart = code.indexOf('function nl(r){');
if (nlStart === -1) {
  console.error('❌ Không tìm thấy function nl(r)');
  process.exit(1);
}
const nlEnd = code.indexOf('function al(r){', nlStart);
if (nlEnd === -1) {
  console.error('❌ Không tìm thấy function al(r)');
  process.exit(1);
}

console.log(`Tìm thấy function nl(r) từ index ${nlStart} đến ${nlEnd}`);

const newNlCode = `function nl(r){const{params:e,timeoutMs:t=18e4,rpcConfig:A=qe}=r,o=A.recaptcha?.siteKey||Ec,n=A.recaptcha?.videoAction||"VIDEO_GENERATION",a=A.clientContext?.clientVersionNumber??22,s=A.clientContext?.batchExecutePath||"/_/AiSandboxAngularFrontend/data/batchexecute",i=A.rpcIds?.videoT2v||"YhhmEf",c=A.rpcIds?.videoI2v||"eb1hJf",g=A.rpcIds?.videoFrames||"nprQif",u=A.rpcIds?.videoR2v||"MZZa6b",d=JSON.stringify(e);return\`
    (async () => {
      const logs = [];
      function addLog(msg) {
        logs.push(new Date().toISOString().slice(11, 23) + ' ' + msg);
      }

      try {
        const params = \${d};
        const prompt = String(params.prompt || '').trim();
        const modelKey = String(params.modelKey || 'veo_3_1_fast');
        const ratioEnum = params.ratioEnum || 2; // 1 = 9:16, 2 = 16:9
        const duration = String(params.duration || '8s').toLowerCase();
        const refMediaIds = Array.isArray(params.referenceMediaIds) ? params.referenceMediaIds.filter(Boolean) : [];
        const refFilePaths = Array.isArray(params.refFilePaths) ? params.refFilePaths.filter(Boolean) : [];

        addLog('FlowVideo: Bắt đầu xử lý tạo video [Model: ' + modelKey + ', Tỉ lệ: ' + (ratioEnum === 1 ? '9:16' : '16:9') + ', Thời lượng: ' + duration + ', Ảnh ref: ' + refMediaIds.length + ']');

        // ====================================================================
        // CHIẾN LƯỢC 1: IN-PAGE DIRECT RPC (CHUẨN XÁC 100% TỪNG THAM SỐ)
        // ====================================================================
        const wiz = window.WIZ_global_data || {};
        const at = wiz.SNlM0e || '';
        const fsid = wiz.FdrFJe || '';
        const bl = wiz.cfb2h || 'boq_labs-ai-sandbox-frontend_20260910.13_p0';
        const siteKey = \${JSON.stringify(o)};

        let recaptchaToken = '';
        if (typeof window.grecaptcha?.enterprise?.execute === 'function') {
          try {
            recaptchaToken = await window.grecaptcha.enterprise.execute(siteKey, { action: \${JSON.stringify(n)} });
          } catch (_) {}
        }

        if (at && fsid) {
          addLog('Chiến lược 1: Thử gửi trực tiếp In-Page RPC...');
          try {
            const clientUuid1 = crypto.randomUUID().toUpperCase();
            const clientUuid2 = crypto.randomUUID().toUpperCase();
            const clientSessionUuid = crypto.randomUUID().toUpperCase();
            const promptStructure = [null, null, [[[prompt]]]];
            const resolutionCode = params.resolutionCode || 1;

            let targetRpcId = \${JSON.stringify(i)};
            let modePayload;

            if (params.mode === 'Frames' && params.startMediaId && params.endMediaId) {
              targetRpcId = \${JSON.stringify(g)};
              modePayload = [
                promptStructure,
                modelKey,
                ratioEnum,
                null,
                [null, params.startMediaId, null, null, null, params.startCrop || null],
                [null, params.endMediaId, null, null, null, params.endCrop || null],
                [null, null, null, null, clientUuid1, clientUuid2]
              ];
            } else if (params.mode === 'I2V' && params.startMediaId) {
              targetRpcId = \${JSON.stringify(c)};
              modePayload = [
                promptStructure,
                modelKey,
                ratioEnum,
                null,
                [null, params.startMediaId, null, null, null, params.startCrop || null],
                [null, null, null, null, clientUuid1, clientUuid2],
                null,
                null,
                null,
                [resolutionCode]
              ];
            } else if ((params.mode === 'R2V' || params.mode === 'Components' || refMediaIds.length > 0) && refMediaIds.length > 0) {
              targetRpcId = \${JSON.stringify(u)}; // MZZa6b
              const refArray = refMediaIds.map(id => [null, id]);
              modePayload = [
                promptStructure,
                refArray,
                modelKey,
                ratioEnum,
                null,
                [null, null, null, null, clientUuid1, clientUuid2],
                null,
                null,
                null,
                null,
                null,
                [resolutionCode]
              ];
            } else {
              targetRpcId = \${JSON.stringify(i)}; // YhhmEf
              modePayload = [
                promptStructure,
                modelKey,
                ratioEnum,
                null,
                [null, null, null, null, clientUuid1, clientUuid2],
                null,
                null,
                [resolutionCode]
              ];
            }

            const innerPayload = [
              [modePayload],
              [
                null,
                \${a},
                null,
                null,
                null,
                params.projectId,
                null,
                null,
                null,
                null,
                [recaptchaToken || '', 1]
              ],
              [clientSessionUuid, 2]
            ];

            const sourcePath = '/project/' + params.projectId;
            const queryParams = new URLSearchParams({
              rpcids: targetRpcId,
              'source-path': sourcePath,
              bl: bl,
              'f.sid': fsid,
              hl: 'en-US',
              _reqid: String(Math.floor(Math.random() * 900000 + 1000000)),
              rt: 'c'
            });

            const batchPath = \${JSON.stringify(s)};
            const url = batchPath + '?' + queryParams.toString();
            const fReq = JSON.stringify([[[targetRpcId, JSON.stringify(innerPayload), null, 'generic']]]);
            const bodyData = 'f.req=' + encodeURIComponent(fReq) + '&at=' + encodeURIComponent(at) + '&';

            const rpcController = new AbortController();
            const rpcTimer = setTimeout(() => rpcController.abort(), 20000);

            const rpcRes = await fetch(url, {
              method: 'POST',
              headers: { 'content-type': 'application/x-www-form-urlencoded;charset=UTF-8' },
              body: bodyData,
              credentials: 'include',
              signal: rpcController.signal
            });
            clearTimeout(rpcTimer);

            if (rpcRes.ok) {
              const rpcText = await rpcRes.text();
              if (rpcText.includes('wrb.fr')) {
                // Trích xuất mediaId chính xác từ response
                const pattern = new RegExp(targetRpcId + '[^\\\\\\\\]*?([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})', 'i');
                const match = rpcText.match(pattern);
                let capturedMid = match ? match[1] : null;
                if (!capturedMid) {
                  const allUuids = rpcText.match(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi) || [];
                  capturedMid = allUuids.find(u => u.toLowerCase() !== String(params.projectId || '').toLowerCase()) || allUuids[0];
                }

                if (capturedMid) {
                  addLog('Chiến lược 1 THÀNH CÔNG! Đã tạo video qua Direct RPC ' + targetRpcId + ' (Media ID: ' + capturedMid + ')');
                  return {
                    success: true,
                    status: 200,
                    mediaId: capturedMid,
                    workflowId: capturedMid,
                    responseText: rpcText,
                    log: logs
                  };
                }
              }
            }
            addLog('Chiến lược 1 không nhận được wrb.fr, chuyển sang Chiến lược 2...');
          } catch (rpcErr) {
            addLog('Chiến lược 1 gặp lỗi: ' + rpcErr.message + ', chuyển sang Chiến lược 2...');
          }
        }

        // ====================================================================
        // CHIẾN LƯỢC 2: NATIVE UI AUTOMATION VỚI NÚT SETTINGS PILL & FILE ATTACH
        // ====================================================================
        addLog('Chiến lược 2: Khởi động Native Web UI Simulation');

        // Network sniffer
        if (!window.__aiforge_flow_hooked) {
          window.__aiforge_flow_hooked = true;
          window.__aiforge_captured_video_media_ids = [];
          const origFetch = window.fetch;
          window.fetch = async function(...args) {
            const res = await origFetch.apply(this, args);
            try {
              const text = await res.clone().text();
              if (text && text.includes('wrb.fr')) {
                const ids = text.match(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi) || [];
                for (const id of ids) {
                  if (!window.__aiforge_captured_video_media_ids.includes(id)) {
                    window.__aiforge_captured_video_media_ids.push(id);
                  }
                }
              }
            } catch (_) {}
            return res;
          };
        }

        const initialMediaCount = (window.__aiforge_captured_video_media_ids || []).length;
        const preExistingVideos = new Set(
          Array.from(document.querySelectorAll('video[src]')).map(v => v.src).filter(Boolean)
        );

        // 1. TÌM NÚT CÀI ĐẶT PILL "Video • 720p • 8s" (HOẶC TƯƠNG ĐƯƠNG)
        addLog('Đang tìm nút cài đặt Settings Pill (Video • 720p • 8s)...');
        const findSettingsPill = () => {
          const els = Array.from(document.querySelectorAll('button, [role=\"button\"], div, span')).filter(el => {
            if (el.offsetWidth <= 0 || el.offsetHeight <= 0) return false;
            const t = (el.innerText || '').trim();
            return (t.includes('•') || t.includes('·') || t.includes('–')) &&
                   /video|ảnh|image|720p|1080p|8s|4s|6s|16:9|9:16/i.test(t) &&
                   t.length < 50;
          });
          if (els.length > 0) {
            els.sort((a, b) => b.getBoundingClientRect().top - a.getBoundingClientRect().top);
            return els[0];
          }
          return null;
        };

        const pillBtn = findSettingsPill();
        if (pillBtn) {
          addLog('Đã tìm thấy nút cài đặt: ' + pillBtn.innerText.trim());
          pillBtn.click();
          await new Promise(r => setTimeout(r, 450));

          // A. CHỌN TỈ LỆ KHUNG HÌNH (16:9 HOẶC 9:16)
          const ratioTarget = ratioEnum === 1 ? '9:16' : '16:9';
          const ratioRegex = ratioEnum === 1 ? /9:16|portrait|dọc/i : /16:9|landscape|ngang/i;
          const ratioOptions = Array.from(document.querySelectorAll('.cdk-overlay-container button, .cdk-overlay-container [role=\"menuitem\"], .cdk-overlay-container div, button, [role=\"menuitem\"]')).filter(el => {
            if (el.offsetWidth <= 0) return false;
            const t = (el.innerText || '') + ' ' + (el.getAttribute('aria-label') || '') + ' ' + (el.getAttribute('title') || '');
            return ratioRegex.test(t) && t.length < 50;
          });
          if (ratioOptions.length > 0) {
            addLog('Đã chọn tỉ lệ trong menu: ' + ratioTarget);
            ratioOptions[0].click();
            await new Promise(r => setTimeout(r, 200));
          }

          // B. CHỌN MODEL (VEO 3.1 FAST, VEO 3.1 QUALITY, OMNI)
          let targetModelRegex = /fast|nhanh|veo.*fast/i;
          if (modelKey.includes('quality') || modelKey === 'veo_3_1_t2v') {
            targetModelRegex = /quality|chất lượng/i;
          } else if (modelKey.includes('omni') || modelKey.includes('flash')) {
            targetModelRegex = /omni/i;
          } else if (modelKey.includes('lite')) {
            targetModelRegex = /lite/i;
          }

          const modelOptions = Array.from(document.querySelectorAll('.cdk-overlay-container button, .cdk-overlay-container [role=\"menuitem\"], .cdk-overlay-container div, button, [role=\"menuitem\"]')).filter(el => {
            if (el.offsetWidth <= 0) return false;
            const t = (el.innerText || '') + ' ' + (el.getAttribute('aria-label') || '');
            return targetModelRegex.test(t) && t.length < 60;
          });
          if (modelOptions.length > 0) {
            addLog('Đã chọn model trong menu: ' + modelOptions[0].innerText.trim());
            modelOptions[0].click();
            await new Promise(r => setTimeout(r, 200));
          }

          // C. CHỌN THỜI LƯỢNG (8s)
          const durTarget = duration.endsWith('s') ? duration : (duration + 's');
          const durOptions = Array.from(document.querySelectorAll('.cdk-overlay-container button, .cdk-overlay-container [role=\"menuitem\"], button')).filter(el => {
            if (el.offsetWidth <= 0) return false;
            const t = (el.innerText || '').toLowerCase().trim();
            return t === durTarget || t === durTarget.replace('s', ' giây') || t === durTarget.replace('s', 's');
          });
          if (durOptions.length > 0) {
            addLog('Đã chọn thời lượng trong menu: ' + durTarget);
            durOptions[0].click();
            await new Promise(r => setTimeout(r, 150));
          }

          // Đóng popup settings nếu còn mở
          document.body.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', code: 'Escape', bubbles: true }));
          await new Promise(r => setTimeout(r, 200));
        }

        // 2. NẠP ẢNH THAM CHIẾU (NÚT + HOẶC NÚT + TIỀN TỐ/HẬU TỐ)
        if (refFilePaths.length > 0) {
          addLog('Đang đính kèm ảnh tham chiếu trên giao diện...');
          const addButtons = Array.from(document.querySelectorAll('button, [role=\"button\"]')).filter(b => {
            if (b.offsetWidth <= 0) return false;
            const t = (b.innerText || '').trim();
            const a = (b.getAttribute('aria-label') || '').toLowerCase();
            return t.includes('+') || t.includes('Tiền tố') || a.includes('add') || a.includes('thêm');
          });

          if (addButtons.length > 0) {
            const addBtn = addButtons[0];
            addLog('Bấm nút thêm ảnh / tiền tố: ' + addBtn.innerText.trim());
            addBtn.click();
            await new Promise(r => setTimeout(r, 400));
          }
        }

        // 3. TÌM VÀ ĐIỀN PROMPT VÀO PROSEMIRROR
        function getPromptInput() {
          const sels = ['.ProseMirror', '[placeholder*=\"Bạn muốn tạo\"]', '[data-placeholder*=\"Bạn muốn tạo\"]', 'div[contenteditable=\"true\"]', 'textarea', '[role=\"textbox\"]'];
          for (const s of sels) {
            const found = Array.from(document.querySelectorAll(s)).find(e => e.offsetWidth > 0 && e.offsetHeight > 0);
            if (found) return found;
          }
          return document.querySelector('.ProseMirror, textarea, [contenteditable=\"true\"]');
        }

        let promptEl = getPromptInput();
        if (!promptEl) {
          for (let i = 0; i < 20; i++) {
            await new Promise(r => setTimeout(r, 200));
            promptEl = getPromptInput();
            if (promptEl) break;
          }
        }

        if (!promptEl) {
          return { success: false, error: 'Không tìm thấy ô nhập prompt trên giao diện Google Flow.', log: logs };
        }

        addLog('Điền nội dung prompt: ' + prompt.slice(0, 30) + '...');
        promptEl.focus();
        promptEl.click();

        if (promptEl.isContentEditable) {
          let textNode = null;
          for (let ch of promptEl.childNodes) {
            if (ch.nodeType === Node.TEXT_NODE || (ch.nodeType === Node.ELEMENT_NODE && !ch.querySelector('img') && !ch.classList?.contains('chip'))) {
              textNode = ch;
              break;
            }
          }
          if (textNode) textNode.textContent = prompt;
          else {
            const pElem = document.createElement('p');
            pElem.textContent = prompt;
            promptEl.appendChild(pElem);
          }
          try { document.execCommand('insertText', false, prompt); } catch (_) {}
        } else {
          promptEl.value = prompt;
        }

        promptEl.dispatchEvent(new Event('input', { bubbles: true, cancelable: true }));
        promptEl.dispatchEvent(new Event('change', { bubbles: true, cancelable: true }));
        await new Promise(r => setTimeout(r, 300));

        // 4. BẤM NÚT SUBMIT
        const submitStartTime = Date.now();
        const allButtons = Array.from(document.querySelectorAll('button, [role=\"button\"]'));
        const submitBtn = allButtons.find(b => {
          if (b.disabled || b.offsetWidth <= 0 || b.offsetHeight <= 0) return false;
          const aria = (b.getAttribute('aria-label') || '').toLowerCase();
          const text = (b.innerText || '').toLowerCase().trim();
          const title = (b.getAttribute('title') || '').toLowerCase();
          return /tạo|create|generate|submit|send|gửi/i.test(aria + ' ' + text + ' ' + title) && !/dự án|project|mới/i.test(text);
        }) || allButtons.find(b => {
          const icon = b.querySelector('mat-icon, svg');
          return icon && !b.disabled && b.closest('form, .prompt-box, [class*=\"prompt\"], [class*=\"input\"], footer, [class*=\"bottom\"]');
        });

        if (submitBtn) {
          addLog('Bấm nút tạo trên giao diện UI');
          submitBtn.click();
        }

        promptEl.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', code: 'Enter', keyCode: 13, which: 13, bubbles: true }));
        promptEl.dispatchEvent(new KeyboardEvent('keyup', { key: 'Enter', code: 'Enter', keyCode: 13, which: 13, bubbles: true }));

        addLog('Đã kích hoạt tạo video qua UI, theo dõi kết quả...');

        // 5. CHỜ BẮT MEDIA ID HOẶC DIRECT VIDEO URL
        let capturedMediaId = null;
        let capturedVideoUrl = null;
        const maxWaitMs = 50000;

        while (Date.now() - submitStartTime < maxWaitMs) {
          await new Promise(r => setTimeout(r, 800));

          const currentCaptured = window.__aiforge_captured_video_media_ids || [];
          if (currentCaptured.length > initialMediaCount) {
            capturedMediaId = currentCaptured[currentCaptured.length - 1];
            addLog('Đã bắt Media ID từ Network Sniffer: ' + capturedMediaId);
            break;
          }

          const allVideos = Array.from(document.querySelectorAll('video[src]'));
          const newVideo = allVideos.find(v => v.src && !preExistingVideos.has(v.src) && v.src.startsWith('http'));
          if (newVideo) {
            capturedVideoUrl = newVideo.src;
            addLog('Đã bắt trực tiếp Video URL từ DOM: ' + capturedVideoUrl);
            const parentCard = newVideo.closest('[data-media-id], [data-id]');
            if (parentCard) capturedMediaId = parentCard.getAttribute('data-media-id') || parentCard.getAttribute('data-id');
            break;
          }
        }

        if (capturedMediaId || capturedVideoUrl) {
          const finalMediaId = capturedMediaId || ('flow-media-' + Date.now());
          const capturedResponseText = JSON.stringify([
            [[\"wrb.fr\", \"YhhmEf\", JSON.stringify([[finalMediaId, null, finalMediaId]])]]
          ]);

          return {
            success: true,
            status: 200,
            mediaId: finalMediaId,
            workflowId: finalMediaId,
            directVideoUrl: capturedVideoUrl,
            responseText: capturedResponseText,
            log: logs
          };
        }

        return { success: false, error: 'Quá thời gian chờ phản hồi tạo video từ Google Flow UI (50s).', log: logs };

      } catch (err) {
        addLog('Lỗi trong Hybrid Engine: ' + err.message);
        return { success: false, error: err.message, log: logs };
      }
    })()
  \`}`;

code = code.slice(0, nlStart) + newNlCode + code.slice(nlEnd);
console.log('✓ Đã thay thế hàm nl(r) bằng Hybrid Dual-Engine');

fs.writeFileSync(targetFile, code, 'utf8');
console.log('✅ HOÀN TẤT PATCH FILE app/out/main/index.js');
