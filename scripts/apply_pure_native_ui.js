const fs = require('fs');
const path = require('path');

const targetFile = path.resolve(__dirname, '../app/out/main/index.js');
let code = fs.readFileSync(targetFile, 'utf8');

console.log('--- CHUYỂN SANG 100% PURE NATIVE UI AUTOMATION (KHÔNG DÙNG RPC NGẦM) ---');

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

const pureNativeUiCode = `function nl(r){const{params:e,timeoutMs:t=18e4,rpcConfig:A=qe}=r,d=JSON.stringify(e);return\`
    (async () => {
      const logs = [];
      function addLog(msg) {
        logs.push(new Date().toISOString().slice(11, 23) + ' ' + msg);
      }

      try {
        const params = \${d};
        const prompt = String(params.prompt || '').trim();
        const modelKey = String(params.modelKey || 'veo_3_1_fast').toLowerCase();
        const ratioEnum = params.ratioEnum || 2; // 1 = 9:16, 2 = 16:9
        const duration = String(params.duration || '8s').toLowerCase();
        const refFilePaths = Array.isArray(params.refFilePaths) ? params.refFilePaths.filter(Boolean) : [];

        addLog('FlowVideo: Bắt đầu 100% Native Web UI Simulation (Veo 3.1 / 16:9 / ' + duration + ')');

        // 1. CÀI ĐẶT NETWORK SNIFFER BẮT CHÍNH XÁC MEDIA ID & VIDEO URL
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

          const origXhrSend = XMLHttpRequest.prototype.send;
          XMLHttpRequest.prototype.send = function(...args) {
            this.addEventListener('load', function() {
              try {
                const text = this.responseText;
                if (text && text.includes('wrb.fr')) {
                  const ids = text.match(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi) || [];
                  for (const id of ids) {
                    if (!window.__aiforge_captured_video_media_ids.includes(id)) {
                      window.__aiforge_captured_video_media_ids.push(id);
                    }
                  }
                }
              } catch (_) {}
            });
            return origXhrSend.apply(this, args);
          };
        }

        const initialMediaCount = (window.__aiforge_captured_video_media_ids || []).length;
        const preExistingVideos = new Set(
          Array.from(document.querySelectorAll('video[src]')).map(v => v.src).filter(Boolean)
        );

        // 2. BẤM NÚT CÀI ĐẶT PILL "Video • 720p • 8s" ĐỂ THIẾT LẬP CHUẨN XÁC MODEL, TỈ LỆ 16:9 & THỜI LƯỢNG
        addLog('Đang tìm nút cài đặt Settings Pill (Video • 720p • 8s)...');
        const findSettingsPill = () => {
          const els = Array.from(document.querySelectorAll('button, [role=\"button\"], div, span')).filter(el => {
            if (el.offsetWidth <= 0 || el.offsetHeight <= 0) return false;
            const t = (el.innerText || '').trim();
            return (t.includes('•') || t.includes('·') || t.includes('–') || t.includes('Video') || t.includes('720p')) &&
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
          addLog('Bấm mở nút cài đặt: ' + pillBtn.innerText.trim());
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

          // Đóng popup settings
          document.body.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', code: 'Escape', bubbles: true }));
          await new Promise(r => setTimeout(r, 200));
        }

        // 3. NẠP ẢNH THAM CHIẾU (NÚT + HOẶC NÚT + TIỀN TỐ/HẬU TỐ)
        if (refFilePaths.length > 0) {
          addLog('Đang đính kèm ' + refFilePaths.length + ' ảnh tham chiếu trên giao diện...');
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

        // 4. TÌM VÀ ĐIỀN PROMPT VÀO PROSEMIRROR
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

        // 5. BẤM NÚT SUBMIT
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

        addLog('Đã kích hoạt tạo video qua Native UI, theo dõi kết quả...');

        // 6. CHỜ BẮT MEDIA ID HOẶC DIRECT VIDEO URL
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
        addLog('Lỗi trong Native UI Simulation: ' + err.message);
        return { success: false, error: err.message, log: logs };
      }
    })()
  \`}`;

code = code.slice(0, nlStart) + pureNativeUiCode + code.slice(nlEnd);
console.log('✓ Đã cập nhật 100% Pure Native UI Automation');

fs.writeFileSync(targetFile, code, 'utf8');
console.log('✅ HOÀN TẤT!');
