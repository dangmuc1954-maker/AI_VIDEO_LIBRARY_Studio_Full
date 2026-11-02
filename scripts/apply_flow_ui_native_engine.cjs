const fs = require('fs');
const path = require('path');

console.log('======================================================================');
console.log('🚀 NATIVE WEB UI SIMULATION + SNIFFER ENGINE FOR GOOGLE FLOW (VEO 3 & BANANA) 🚀');
console.log('======================================================================');

const mainFile = path.resolve(__dirname, '../app/out/main/index.js');
let content = fs.readFileSync(mainFile, 'utf8');

// Tạo backup
fs.writeFileSync(mainFile + '.before_flow_ui_native.bak', content, 'utf8');
console.log('✓ Đã tạo file sao lưu: app/out/main/index.js.before_flow_ui_native.bak');

// 1. CLEAR TOÀN BỘ COOLDOWN & LỖI CHALLENGE_REQUIRED CŨ TRONG BROWSER-SESSIONS.JSON
try {
  const appData = process.env.APPDATA || (process.env.USERPROFILE ? path.join(process.env.USERPROFILE, 'AppData', 'Roaming') : null);
  if (appData) {
    const sessionFile = path.join(appData, 'AI_VIDEO_LIBRARY_DATA', 'browser-sessions.json');
    if (fs.existsSync(sessionFile)) {
      const data = JSON.parse(fs.readFileSync(sessionFile, 'utf8'));
      let modified = false;
      const list = Array.isArray(data) ? data : (data.sessions || []);
      for (const s of list) {
        if (s.diagnostics && (s.diagnostics.cooldownUntil || s.diagnostics.lastProviderErrorCode)) {
          console.log(`[Sessions] Xóa cooldown cho tài khoản: ${s.accountName || s.accountId}`);
          delete s.diagnostics.cooldownUntil;
          delete s.diagnostics.cooldownReason;
          delete s.diagnostics.lastProviderErrorCode;
          delete s.diagnostics.lastError;
          s.healthScore = 100;
          s.healthLabel = "Excellent";
          modified = true;
        }
      }
      if (modified) {
        fs.writeFileSync(sessionFile, JSON.stringify(data, null, 2), 'utf8');
        console.log('✅ 1. Đã làm sạch toàn bộ cooldown & cờ xác minh trong browser-sessions.json');
      }
    }
  }
} catch(e) {
  console.warn('Non-fatal error clearing cooldowns:', e.message);
}

// 2. PATCH zu(r) (IMAGE GENERATION - BANANA PRO / IMAGEN 3 NATIVE UI ENGINE)
const zuStart = content.indexOf('function zu(r){');
const zuEndMarker = 'function Ku(r){';
const zuEnd = content.indexOf(zuEndMarker, zuStart);

if (zuStart === -1 || zuEnd === -1) {
  console.error('❌ Không tìm thấy vị trí hàm zu(r) trong index.js');
  process.exit(1);
}

const newZuCode = `function zu(r){const{params:e,timeoutMs:t=18e4,rpcConfig:A=qe}=r,c=JSON.stringify(e);return\`
    (async () => {
      const logs = [];
      function addLog(msg) {
        logs.push(new Date().toISOString().slice(11, 23) + ' ' + msg);
      }

      try {
        addLog('FlowImage: Khoi chay Native Web UI Simulation (Banana Pro / Imagen 3)');
        const params = \${c};
        const prompt = String(params.prompt || '').trim();
        const aspectRatio = String(params.aspectRatio || '1:1');

        // 1. Cai dat Network Sniffer bat anh tu Google Flow CDN
        if (!window.__aiforge_flow_hooked) {
          window.__aiforge_flow_hooked = true;
          window.__aiforge_captured_batches = [];
          window.__aiforge_captured_images = [];

          const origFetch = window.fetch;
          window.fetch = async function(...args) {
            const res = await origFetch.apply(this, args);
            try {
              const url = typeof args[0] === 'string' ? args[0] : (args[0]?.url || '');
              if (url.includes('batchexecute') || url.includes('flow') || url.includes('asb')) {
                const clone = res.clone();
                const text = await clone.text();
                window.__aiforge_captured_batches.push({ text, time: Date.now() });

                const imgMatches = text.match(/https:\\\\/\\\\/flow-content\\\\.google\\\\/image\\\\/[a-f0-9-]+/gi) ||
                                  text.match(/https:\\\\/\\\\/flow\\\\.google\\\\.com\\\\/asb\\\\/[a-zA-Z0-9_-]+/gi);
                if (imgMatches) {
                  for (const m of imgMatches) {
                    const clean = m.replace(/\\\\\\\\/g, '');
                    if (!window.__aiforge_captured_images.includes(clean)) {
                      window.__aiforge_captured_images.push(clean);
                    }
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
                if (text) {
                  window.__aiforge_captured_batches.push({ text, time: Date.now() });
                  const imgMatches = text.match(/https:\\\\/\\\\/flow-content\\\\.google\\\\/image\\\\/[a-f0-9-]+/gi) ||
                                    text.match(/https:\\\\/\\\\/flow\\\\.google\\\\.com\\\\/asb\\\\/[a-zA-Z0-9_-]+/gi);
                  if (imgMatches) {
                    for (const m of imgMatches) {
                      const clean = m.replace(/\\\\\\\\/g, '');
                      if (!window.__aiforge_captured_images.includes(clean)) {
                        window.__aiforge_captured_images.push(clean);
                      }
                    }
                  }
                }
              } catch (_) {}
            });
            return origXhrSend.apply(this, args);
          };
        }

        const initialImgCount = (window.__aiforge_captured_images || []).length;
        const initialDomImgs = new Set(Array.from(document.querySelectorAll('img')).map(i => i.src).filter(Boolean));

        // 2. Kiem tra va dam bao o trang Project
        let curUrl = window.location.href;
        let pMatch = window.location.pathname.match(/\\\\/project\\\\/([a-f0-9-]+)/i);
        if (!pMatch && !curUrl.includes('/project/')) {
          addLog('Kiem tra vi tri project...');
          if (params.projectId && /^[a-f0-9-]{12,}$/i.test(params.projectId)) {
            window.location.href = 'https://flow.google.com/project/' + params.projectId;
            await new Promise(r => setTimeout(r, 2500));
            pMatch = window.location.pathname.match(/\\\\/project\\\\/([a-f0-9-]+)/i);
          }
          if (!pMatch) {
            const projLink = document.querySelector('a[href*="/project/"], [data-project-id]');
            if (projLink) {
              projLink.click();
              await new Promise(r => setTimeout(r, 1800));
            } else {
              const newBtn = Array.from(document.querySelectorAll('button, [role="button"], a')).find(el =>
                /new project|tạo mới|project/i.test(el.innerText || el.getAttribute('aria-label') || '')
              );
              if (newBtn) {
                newBtn.click();
                await new Promise(r => setTimeout(r, 2200));
              }
            }
          }
        }

        const realProjectId = pMatch ? pMatch[1] : (params.projectId || 'banana-project');

        // 3. Chon Ti le khung hinh (Aspect Ratio)
        try {
          const ratioKeywords = aspectRatio === '9:16' ? ['9:16', 'portrait', 'dọc'] :
                                aspectRatio === '16:9' ? ['16:9', 'landscape', 'ngang'] :
                                ['1:1', 'square', 'vuông'];
          const ratioBtn = Array.from(document.querySelectorAll('button, [role="button"], [role="radio"]')).find(b => {
            if (b.offsetWidth <= 0) return false;
            const text = (b.innerText || '').toLowerCase();
            const aria = (b.getAttribute('aria-label') || '').toLowerCase();
            const title = (b.getAttribute('title') || '').toLowerCase();
            return ratioKeywords.some(k => text.includes(k) || aria.includes(k) || title.includes(k));
          });
          if (ratioBtn) {
            addLog('Da chon ti le anh: ' + aspectRatio);
            ratioBtn.click();
            await new Promise(r => setTimeout(r, 150));
          }
        } catch (_) {}

        // 4. Tim o nhap prompt
        let promptEl = document.querySelector('.ProseMirror, textarea, [contenteditable="true"], [role="textbox"], [data-placeholder*="What"], [data-placeholder*="tạo"], [data-placeholder*="create"], input[placeholder*="tạo"], input[placeholder*="create"]');
        if (!promptEl) {
          for (let i = 0; i < 20; i++) {
            await new Promise(r => setTimeout(r, 250));
            promptEl = document.querySelector('.ProseMirror, textarea, [contenteditable="true"], [role="textbox"], div[data-placeholder]');
            if (promptEl) break;
          }
        }

        if (!promptEl) {
          return {
            success: false,
            error: 'Khong tim thay o nhap prompt anh tren Google Flow.',
            log: logs
          };
        }

        addLog('Dien prompt vao Google Flow UI...');
        promptEl.focus();
        promptEl.click();

        if (promptEl.isContentEditable) {
          const range = document.createRange();
          range.selectNodeContents(promptEl);
          range.collapse(false);
          const sel = window.getSelection();
          sel.removeAllRanges();
          sel.addRange(range);
          try {
            document.execCommand('selectAll', false, null);
            document.execCommand('insertText', false, prompt);
          } catch (_) {
            promptEl.innerText = prompt;
          }
          if (!promptEl.innerText || !promptEl.innerText.includes(prompt.slice(0, 10))) {
            promptEl.innerText = prompt;
          }
        } else {
          promptEl.value = prompt;
        }

        promptEl.dispatchEvent(new Event('input', { bubbles: true, cancelable: true }));
        promptEl.dispatchEvent(new Event('change', { bubbles: true, cancelable: true }));
        await new Promise(r => setTimeout(r, 350));

        // 5. Bam nut Submit / Create tren UI
        const submitStartTime = Date.now();
        const allButtons = Array.from(document.querySelectorAll('button, [role="button"]'));
        const submitBtn = allButtons.find(b => {
          if (b.disabled || b.offsetWidth <= 0 || b.offsetHeight <= 0) return false;
          const aria = (b.getAttribute('aria-label') || '').toLowerCase();
          const text = (b.innerText || '').toLowerCase().trim();
          const title = (b.getAttribute('title') || '').toLowerCase();
          return /submit|create|generate|tạo|send|gửi/i.test(aria + ' ' + text + ' ' + title) &&
                 !/new project|project|tạo mới/i.test(text);
        }) || allButtons.find(b => {
          const icon = b.querySelector('mat-icon, svg');
          return icon && !b.disabled && b.closest('form, .prompt-box, [class*="prompt"], [class*="input"], footer, [class*="bottom"]');
        });

        if (submitBtn) {
          addLog('Bam nut tao anh tren UI');
          submitBtn.click();
        }

        promptEl.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', code: 'Enter', keyCode: 13, which: 13, bubbles: true }));
        promptEl.dispatchEvent(new KeyboardEvent('keyup', { key: 'Enter', code: 'Enter', keyCode: 13, which: 13, bubbles: true }));

        addLog('Da kich hoat lenh tao anh, dang cho ket qua tu CDN...');

        // 6. Cho bat URL anh tra ve (toi da 45s)
        let capturedImageUrl = null;
        let capturedMediaId = null;
        let capturedResponseText = '';
        const maxWaitMs = 45000;

        while (Date.now() - submitStartTime < maxWaitMs) {
          await new Promise(r => setTimeout(r, 800));

          // A. Bat tu Network Sniffer
          const currentCaptured = window.__aiforge_captured_images || [];
          if (currentCaptured.length > initialImgCount) {
            capturedImageUrl = currentCaptured[currentCaptured.length - 1];
            addLog('Bat duoc URL anh tu Network Sniffer: ' + capturedImageUrl);
            break;
          }

          // B. Bat tu DOM img elements moi
          const currentDomImgs = Array.from(document.querySelectorAll('img')).map(i => i.src).filter(Boolean);
          const newImg = currentDomImgs.reverse().find(s =>
            (s.includes('flow-content.google/image/') || s.includes('flow.google.com/asb/')) && !initialDomImgs.has(s)
          );
          if (newImg) {
            capturedImageUrl = newImg;
            addLog('Bat duoc URL anh tu DOM: ' + capturedImageUrl);
            break;
          }

          // C. Kiem tra alert loi
          const alerts = Array.from(document.querySelectorAll('[role="alert"], .error-message, .mat-snack-bar-container, [class*="toast"]')).filter(el => el.offsetWidth > 0);
          for (const al of alerts) {
            const txt = (al.innerText || '').toLowerCase();
            if (txt.includes('chính sách') || txt.includes('policy') || txt.includes('vi phạm') || txt.includes('quota') || txt.includes('lỗi')) {
              return {
                success: false,
                error: al.innerText.trim(),
                log: logs
              };
            }
          }
        }

        if (capturedImageUrl) {
          const idMatch = capturedImageUrl.match(/image\\\\/([a-f0-9-]+)/i);
          capturedMediaId = idMatch ? idMatch[1] : ('banana-' + Date.now());
          capturedResponseText = JSON.stringify([
            [["wrb.fr", "ogiZ0b", JSON.stringify([[[ [null, null, null, null, null, null, [[capturedImageUrl, 1, null, [1024, 1024]]]] ]]]) ]]
          ]);

          return {
            success: true,
            status: 200,
            imageUrl: capturedImageUrl,
            providerAssetId: capturedMediaId,
            mediaId: capturedMediaId,
            projectId: realProjectId,
            width: 1024,
            height: 1024,
            responseText: capturedResponseText,
            log: logs
          };
        }

        return {
          success: false,
          error: 'Qua thoi gian cho tao anh tu Google Flow UI (45s). Vui long thu lai.',
          log: logs
        };

      } catch (err) {
        addLog('Loi trong Native Web UI Simulation anh: ' + err.message);
        return {
          success: false,
          error: err.message,
          log: logs
        };
      }
    })()
  \`}`;

content = content.substring(0, zuStart) + newZuCode + content.substring(zuEnd);
console.log('✅ 2. Đã thay thế hàm zu(r) bằng Native Web UI Simulation cho Banana Pro / Imagen 3');

// 3. PATCH nl(r) (VIDEO GENERATION - VEO 3 / OMNI NATIVE UI ENGINE)
const nlStart = content.indexOf('function nl(r){');
const nlEndMarker = 'function al(r){';
const nlEnd = content.indexOf(nlEndMarker, nlStart);

if (nlStart === -1 || nlEnd === -1) {
  console.error('❌ Không tìm thấy vị trí hàm nl(r) trong index.js');
  process.exit(1);
}

const newNlCode = `function nl(r){const{params:e,timeoutMs:t=18e4,rpcConfig:A=qe}=r,d=JSON.stringify(e);return\`
    (async () => {
      const logs = [];
      function addLog(msg) {
        logs.push(new Date().toISOString().slice(11, 23) + ' ' + msg);
      }

      try {
        addLog('FlowVideo: Khoi chay Native Web UI Simulation (Veo 3 / Omni)');
        const params = \${d};
        const prompt = String(params.prompt || '').trim();
        const modelKey = String(params.modelKey || '').toLowerCase();
        const ratioEnum = params.ratioEnum || 2; // 1 = 9:16, 2 = 16:9

        // 1. Cai dat Network Sniffer bat UUID video tra ve
        if (!window.__aiforge_flow_hooked) {
          window.__aiforge_flow_hooked = true;
          window.__aiforge_captured_batches = [];
          window.__aiforge_captured_media_ids = [];

          const origFetch = window.fetch;
          window.fetch = async function(...args) {
            const res = await origFetch.apply(this, args);
            try {
              const url = typeof args[0] === 'string' ? args[0] : (args[0]?.url || '');
              if (url.includes('batchexecute') || url.includes('flow') || url.includes('asb')) {
                const clone = res.clone();
                const text = await clone.text();
                window.__aiforge_captured_batches.push({ text, time: Date.now() });
                const ids = text.match(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi);
                if (ids) {
                  for (const id of ids) {
                    if (!window.__aiforge_captured_media_ids.includes(id)) {
                      window.__aiforge_captured_media_ids.push(id);
                    }
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
                if (text && (text.includes('wrb.fr') || text.includes('flow'))) {
                  window.__aiforge_captured_batches.push({ text, time: Date.now() });
                  const ids = text.match(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi);
                  if (ids) {
                    for (const id of ids) {
                      if (!window.__aiforge_captured_media_ids.includes(id)) {
                        window.__aiforge_captured_media_ids.push(id);
                      }
                    }
                  }
                }
              } catch (_) {}
            });
            return origXhrSend.apply(this, args);
          };
        }

        const initialMediaCount = (window.__aiforge_captured_media_ids || []).length;
        const initialDomUuids = new Set(
          (document.body?.innerHTML?.match(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi) || [])
        );

        // 2. Dam bao o trang Project
        let curUrl = window.location.href;
        let pMatch = window.location.pathname.match(/\\\\/project\\\\/([a-f0-9-]+)/i);
        if (!pMatch && !curUrl.includes('/project/')) {
          addLog('Kiem tra vi tri project...');
          if (params.projectId && /^[a-f0-9-]{12,}$/i.test(params.projectId)) {
            window.location.href = 'https://flow.google.com/project/' + params.projectId;
            await new Promise(r => setTimeout(r, 2500));
            pMatch = window.location.pathname.match(/\\\\/project\\\\/([a-f0-9-]+)/i);
          }
          if (!pMatch) {
            const projLink = document.querySelector('a[href*="/project/"], [data-project-id]');
            if (projLink) {
              projLink.click();
              await new Promise(r => setTimeout(r, 1800));
            } else {
              const newBtn = Array.from(document.querySelectorAll('button, [role="button"], a')).find(el =>
                /new project|tạo mới|project/i.test(el.innerText || el.getAttribute('aria-label') || '')
              );
              if (newBtn) {
                newBtn.click();
                await new Promise(r => setTimeout(r, 2200));
              }
            }
          }
        }

        // 3. Chon Model chuan xac theo tham so cua tool
        // Omni 1.1 Flash, Veo 3.1 Fast, Veo 3.1 Quality, Veo 3.1 Lite
        let targetModelKeyword = 'fast';
        if (modelKey.includes('omni') || modelKey.includes('abra') || modelKey.includes('flash')) {
          targetModelKeyword = 'omni';
        } else if (modelKey.includes('quality') || modelKey === 'veo_3_1_t2v') {
          targetModelKeyword = 'quality';
        } else if (modelKey.includes('lite')) {
          targetModelKeyword = 'lite';
        } else if (modelKey.includes('fast')) {
          targetModelKeyword = 'fast';
        }
        addLog('Model muc tieu tren UI: ' + targetModelKeyword);

        try {
          const allTriggers = Array.from(document.querySelectorAll('button, [role="button"], [role="combobox"], [aria-haspopup="menu"], [aria-haspopup="listbox"], .model-badge'));
          const modelBtn = allTriggers.find(b => {
            const text = (b.innerText || '').toLowerCase();
            const aria = (b.getAttribute('aria-label') || '').toLowerCase();
            return (text.includes('veo') || text.includes('omni') || text.includes('model') || aria.includes('model') || aria.includes('mô hình')) && b.offsetWidth > 0;
          });

          if (modelBtn) {
            const curText = (modelBtn.innerText || '').toLowerCase();
            if (!curText.includes(targetModelKeyword)) {
              addLog('Mo danh sach model...');
              modelBtn.click();
              await new Promise(r => setTimeout(r, 450));

              const options = Array.from(document.querySelectorAll('[role="menuitem"], [role="option"], .mat-mdc-menu-item, li, button')).filter(o => o.offsetWidth > 0);
              const targetOpt = options.find(o => (o.innerText || '').toLowerCase().includes(targetModelKeyword));
              if (targetOpt) {
                addLog('Da chon model: ' + targetModelKeyword);
                targetOpt.click();
                await new Promise(r => setTimeout(r, 300));
              } else {
                document.body.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', code: 'Escape', bubbles: true }));
              }
            }
          }
        } catch (eM) {
          addLog('Loi chon model (khong nghiem trong): ' + eM.message);
        }

        // 4. Chon Ti le khung hinh (Aspect Ratio)
        try {
          const targetRatio = ratioEnum === 1 ? '9:16' : '16:9';
          const ratioKeywords = ratioEnum === 1 ? ['9:16', 'portrait', 'dọc'] : ['16:9', 'landscape', 'ngang'];
          const ratioBtn = Array.from(document.querySelectorAll('button, [role="button"], [role="radio"]')).find(b => {
            if (b.offsetWidth <= 0) return false;
            const text = (b.innerText || '').toLowerCase();
            const aria = (b.getAttribute('aria-label') || '').toLowerCase();
            const title = (b.getAttribute('title') || '').toLowerCase();
            return ratioKeywords.some(k => text.includes(k) || aria.includes(k) || title.includes(k));
          });
          if (ratioBtn) {
            addLog('Da chon ti le video: ' + targetRatio);
            ratioBtn.click();
            await new Promise(r => setTimeout(r, 150));
          }
        } catch (_) {}

        // 5. Tim o nhap prompt
        let promptEl = document.querySelector('.ProseMirror, textarea, [contenteditable="true"], [role="textbox"], [data-placeholder*="What"], [data-placeholder*="tạo"], [data-placeholder*="create"], input[placeholder*="tạo"], input[placeholder*="create"]');
        if (!promptEl) {
          for (let i = 0; i < 20; i++) {
            await new Promise(r => setTimeout(r, 250));
            promptEl = document.querySelector('.ProseMirror, textarea, [contenteditable="true"], [role="textbox"], div[data-placeholder]');
            if (promptEl) break;
          }
        }

        if (!promptEl) {
          return {
            success: false,
            error: 'Khong tim thay o nhap prompt video tren Google Flow UI.',
            log: logs
          };
        }

        addLog('Dien prompt video vao UI...');
        promptEl.focus();
        promptEl.click();

        if (promptEl.isContentEditable) {
          const range = document.createRange();
          range.selectNodeContents(promptEl);
          range.collapse(false);
          const sel = window.getSelection();
          sel.removeAllRanges();
          sel.addRange(range);
          try {
            document.execCommand('selectAll', false, null);
            document.execCommand('insertText', false, prompt);
          } catch (_) {
            promptEl.innerText = prompt;
          }
          if (!promptEl.innerText || !promptEl.innerText.includes(prompt.slice(0, 10))) {
            promptEl.innerText = prompt;
          }
        } else {
          promptEl.value = prompt;
        }

        promptEl.dispatchEvent(new Event('input', { bubbles: true, cancelable: true }));
        promptEl.dispatchEvent(new Event('change', { bubbles: true, cancelable: true }));
        await new Promise(r => setTimeout(r, 350));

        // 6. Bam nut Submit / Create tren UI
        const submitStartTime = Date.now();
        const allButtons = Array.from(document.querySelectorAll('button, [role="button"]'));
        const submitBtn = allButtons.find(b => {
          if (b.disabled || b.offsetWidth <= 0 || b.offsetHeight <= 0) return false;
          const aria = (b.getAttribute('aria-label') || '').toLowerCase();
          const text = (b.innerText || '').toLowerCase().trim();
          const title = (b.getAttribute('title') || '').toLowerCase();
          return /submit|create|generate|tạo|send|gửi/i.test(aria + ' ' + text + ' ' + title) &&
                 !/new project|project|tạo mới/i.test(text);
        }) || allButtons.find(b => {
          const icon = b.querySelector('mat-icon, svg');
          return icon && !b.disabled && b.closest('form, .prompt-box, [class*="prompt"], [class*="input"], footer, [class*="bottom"]');
        });

        if (submitBtn) {
          addLog('Bam nut tao video tren UI');
          submitBtn.click();
        }

        promptEl.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', code: 'Enter', keyCode: 13, which: 13, bubbles: true }));
        promptEl.dispatchEvent(new KeyboardEvent('keyup', { key: 'Enter', code: 'Enter', keyCode: 13, which: 13, bubbles: true }));

        addLog('Da gui yeu cau tao video qua UI, theo doi phan hoi tu Google Flow...');

        // 7. Cho bat Media ID tra ve (toi da 45s)
        let capturedMediaId = null;
        let capturedResponseText = '';
        const maxWaitMs = 45000;

        while (Date.now() - submitStartTime < maxWaitMs) {
          await new Promise(r => setTimeout(r, 800));

          // A. Bat tu Network Sniffer
          const currentCaptured = window.__aiforge_captured_media_ids || [];
          if (currentCaptured.length > initialMediaCount) {
            capturedMediaId = currentCaptured[currentCaptured.length - 1];
            addLog('Bat duoc Media ID tu Network Sniffer: ' + capturedMediaId);
            break;
          }

          // B. Bat tu DOM timeline
          const currentDomUuids = document.body?.innerHTML?.match(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi) || [];
          const newUuid = currentDomUuids.find(id => !initialDomUuids.has(id));
          if (newUuid) {
            capturedMediaId = newUuid;
            addLog('Bat duoc Media ID tu DOM: ' + capturedMediaId);
            break;
          }

          // C. Kiem tra alert loi
          const alerts = Array.from(document.querySelectorAll('[role="alert"], .error-message, .mat-snack-bar-container, [class*="toast"]')).filter(el => el.offsetWidth > 0);
          for (const al of alerts) {
            const txt = (al.innerText || '').toLowerCase();
            if (txt.includes('chính sách') || txt.includes('policy') || txt.includes('vi phạm') || txt.includes('quota') || txt.includes('lỗi')) {
              return {
                success: false,
                error: al.innerText.trim(),
                log: logs
              };
            }
          }
        }

        if (capturedMediaId) {
          capturedResponseText = JSON.stringify([
            [["wrb.fr", "YhhmEf", JSON.stringify([[capturedMediaId, null, capturedMediaId]])]]
          ]);

          return {
            success: true,
            status: 200,
            mediaId: capturedMediaId,
            workflowId: capturedMediaId,
            responseText: capturedResponseText,
            log: logs
          };
        }

        return {
          success: false,
          error: 'Qua thoi gian cho tao video tu Google Flow UI (45s). Vui long thu lai.',
          log: logs
        };

      } catch (err) {
        addLog('Loi trong Native Web UI Simulation video: ' + err.message);
        return {
          success: false,
          error: err.message,
          log: logs
        };
      }
    })()
  \`}`;

content = content.substring(0, nlStart) + newNlCode + content.substring(nlEnd);
console.log('✅ 3. Đã thay thế hàm nl(r) bằng Native Web UI Simulation cho Veo 3 / Omni');

// 4. CẬP NHẬT executeFlowVideoRpc & executeFlowImageRpc ĐỂ CHẤP NHẬN TRỰC TIẾP mediaId & imageUrl TỪ UI NATIVE
const videoRpcTarget = `if(y("browser-view","flow video rpc: kết quả in-page execution",{accountId:e.accountId,projectId:t.projectId,success:d.success,status:d.status,durationMs:Date.now()-n,error:d.error}),!d.success||!d.responseText)throw yt(d,d.error||` + "`Google Flow Video RPC thất bại với status ${d.status}`);return Xu(d.responseText)}";
const videoRpcFix = `if(d&&d.success&&d.mediaId)return{mediaId:d.mediaId,workflowId:d.workflowId||d.mediaId};if(y("browser-view","flow video rpc: kết quả in-page execution",{accountId:e.accountId,projectId:t.projectId,success:d.success,status:d.status,durationMs:Date.now()-n,error:d.error}),!d.success||!d.responseText)throw yt(d,d.error||` + "`Google Flow Video RPC thất bại với status ${d.status}`);return Xu(d.responseText)}";

if (content.includes(videoRpcTarget)) {
  content = content.replace(videoRpcTarget, videoRpcFix);
  console.log('✅ 4.1 Đã nâng cấp executeFlowVideoRpc nhận diện trực tiếp mediaId từ Native UI');
} else {
  console.log('ℹ️ executeFlowVideoRpc đã có logic nhận diện hoặc cần kiểm tra regex');
}

const imageRpcTarget = `if(y("browser-view","flow rpc: kết quả in-page execution",{accountId:e.accountId,projectId:t.projectId,success:d.success,status:d.status,durationMs:Date.now()-n,error:d.error}),!d.success||!d.responseText)throw yt(d,d.error||` + "`Google Flow RPC thất bại với status ${d.status}`);return Lu(d.responseText,t.projectId,o?.rpcIds?.imageGenerate||\"ogiZ0b\")}";
const imageRpcFix = `if(d&&d.success&&d.imageUrl)return{imageUrl:d.imageUrl,width:d.width||1024,height:d.height||1024,providerAssetId:d.providerAssetId||d.mediaId||("banana-"+Date.now()),projectId:d.projectId||t.projectId,seed:d.seed||0};if(y("browser-view","flow rpc: kết quả in-page execution",{accountId:e.accountId,projectId:t.projectId,success:d.success,status:d.status,durationMs:Date.now()-n,error:d.error}),!d.success||!d.responseText)throw yt(d,d.error||` + "`Google Flow RPC thất bại với status ${d.status}`);return Lu(d.responseText,t.projectId,o?.rpcIds?.imageGenerate||\"ogiZ0b\")}";

if (content.includes(imageRpcTarget)) {
  content = content.replace(imageRpcTarget, imageRpcFix);
  console.log('✅ 4.2 Đã nâng cấp executeFlowImageRpc nhận diện trực tiếp imageUrl từ Native UI');
} else {
  console.log('ℹ️ executeFlowImageRpc đã có logic nhận diện hoặc cần kiểm tra regex');
}

// Ghi đè file
fs.writeFileSync(mainFile, content, 'utf8');
console.log('💾 Đã lưu thành công app/out/main/index.js');
