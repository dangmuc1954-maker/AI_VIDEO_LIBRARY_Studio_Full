const fs = require('fs');
const path = require('path');

const targetFile = path.resolve(__dirname, '../app/out/main/index.js');
let code = fs.readFileSync(targetFile, 'utf8');

console.log('--- BẮT ĐẦU PATCH GOOGLE FLOW VIDEO NATIVE UI AUTOMATION ---');

// 1. TÌM VÀ THAY THẾ function nl(r)
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
console.log(`Tìm thấy function nl(r) từ index ${nlStart} đến ${nlEnd} (${nlEnd - nlStart} bytes)`);

const newNlFunction = `function nl(r){const{params:e,timeoutMs:t=18e4,rpcConfig:A=qe}=r,d=JSON.stringify(e);return\`
    (async () => {
      const logs = [];
      function addLog(msg) {
        logs.push(new Date().toISOString().slice(11, 23) + ' ' + msg);
      }

      try {
        addLog('FlowVideo: Bắt đầu Native UI Automation (Veo 3.1 / Omni)');
        const params = \${d};
        const prompt = String(params.prompt || '').trim();
        const modelKey = String(params.modelKey || '').toLowerCase();
        const ratioEnum = params.ratioEnum || 2; // 1 = 9:16, 2 = 16:9
        const duration = String(params.duration || '8s').toLowerCase();
        const refFilePaths = Array.isArray(params.refFilePaths) ? params.refFilePaths : [];

        // 1. Cài đặt Network Sniffer bắt CHÍNH XÁC Media ID từ Video RPC của Google Flow
        if (!window.__aiforge_flow_hooked) {
          window.__aiforge_flow_hooked = true;
          window.__aiforge_captured_video_media_ids = [];
          window.__aiforge_last_created_video_url = null;

          const VIDEO_RPC_IDS = ['YhhmEf', 'MZZa6b', 'eb1hJf', 'nprQif', 'SPrCad', 'ogiZ0b'];

          function extractMediaIdFromBoq(text) {
            try {
              if (!text || typeof text !== 'string') return null;
              if (text.includes('wrb.fr')) {
                for (const rpcId of VIDEO_RPC_IDS) {
                  if (text.includes(rpcId)) {
                    const pattern = new RegExp(rpcId + '[^\\\\\\\\]*?([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})', 'i');
                    const match = text.match(pattern);
                    if (match && match[1]) return match[1];
                  }
                }
                const wrbIdx = text.indexOf('wrb.fr');
                if (wrbIdx !== -1) {
                  const chunk = text.slice(wrbIdx, wrbIdx + 1500);
                  const ids = chunk.match(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi);
                  if (ids && ids.length > 0) return ids[0];
                }
              }
            } catch (_) {}
            return null;
          }

          const origFetch = window.fetch;
          window.fetch = async function(...args) {
            const res = await origFetch.apply(this, args);
            try {
              const url = typeof args[0] === 'string' ? args[0] : (args[0]?.url || '');
              if (url.includes('batchexecute') || url.includes('flow') || url.includes('asb')) {
                const clone = res.clone();
                const text = await clone.text();
                const mid = extractMediaIdFromBoq(text);
                if (mid && !window.__aiforge_captured_video_media_ids.includes(mid)) {
                  window.__aiforge_captured_video_media_ids.push(mid);
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
                  const mid = extractMediaIdFromBoq(text);
                  if (mid && !window.__aiforge_captured_video_media_ids.includes(mid)) {
                    window.__aiforge_captured_video_media_ids.push(mid);
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
        const preExistingCards = new Set(
          Array.from(document.querySelectorAll('[data-media-id]')).map(el => el.getAttribute('data-media-id')).filter(Boolean)
        );

        // 2. Tìm ô nhập prompt
        function getPromptInput() {
          const sels = [
            '.ProseMirror',
            '[placeholder*="Bạn muốn tạo"]',
            '[data-placeholder*="Bạn muốn tạo"]',
            'div[contenteditable="true"]',
            'textarea',
            '[role="textbox"]',
            'input[placeholder*="tạo"]',
            'input[placeholder*="create"]',
            'input[placeholder*="What"]',
            '[data-placeholder*="What"]'
          ];
          for (const s of sels) {
            const els = Array.from(document.querySelectorAll(s));
            const found = els.find(e => e.offsetWidth > 0 && e.offsetHeight > 0);
            if (found) return found;
          }
          return document.querySelector('.ProseMirror, textarea, [contenteditable="true"]');
        }

        let promptEl = getPromptInput();
        if (!promptEl) {
          for (let i = 0; i < 25; i++) {
            await new Promise(r => setTimeout(r, 200));
            promptEl = getPromptInput();
            if (promptEl) break;
          }
        }

        if (!promptEl) {
          return {
            success: false,
            error: 'Không tìm thấy ô nhập prompt trên giao diện Google Flow. Vui lòng kiểm tra màn hình project.',
            log: logs
          };
        }
        addLog('Đã định vị ô prompt: ' + promptEl.tagName);

        // 3. ĐÍNH KÈM ẢNH THAM CHIẾU (NẾU CÓ)
        if (refFilePaths.length > 0) {
          addLog('Đang kiểm tra đính kèm ' + refFilePaths.length + ' ảnh tham chiếu...');
          const hasExistingRefChip = () => {
            const chips = Array.from(document.querySelectorAll('[class*="ingredient"], [class*="reference"], [class*="media-chip"], [class*="chip"] img, .ProseMirror img, [data-asset-id]'));
            return chips.some(c => c.offsetWidth > 0);
          };

          if (!hasExistingRefChip()) {
            const addRefBtn = Array.from(document.querySelectorAll('button, [role="button"]')).find(b => {
              if (b.offsetWidth <= 0) return false;
              const text = (b.innerText || '').toLowerCase();
              const aria = (b.getAttribute('aria-label') || '').toLowerCase();
              const title = (b.getAttribute('title') || '').toLowerCase();
              return /thêm ảnh|thêm thành phần|thành phần|tham chiếu|add reference|add ingredient|upload/i.test(text + ' ' + aria + ' ' + title) ||
                     (b.querySelector('mat-icon, svg') && (text === '+' || aria.includes('add') || aria.includes('thêm')) && b.closest('[class*="prompt"], [class*="input"], footer, [class*="bottom"]'));
            });

            if (addRefBtn) {
              addLog('Bấm nút thêm ảnh tham chiếu trên prompt bar');
              addRefBtn.click();
              await new Promise(r => setTimeout(r, 300));
            }

            for (let w = 0; w < 10; w++) {
              if (hasExistingRefChip()) {
                addLog('Đã xuất hiện chip ảnh tham chiếu!');
                break;
              }
              await new Promise(r => setTimeout(r, 200));
            }
          }
        }

        // 4. CHỌN MODEL CHUẨN XÁC THEO TOOL (Veo 3.1 Fast, Veo 3.1 Quality, Omni Flash, Veo Lite)
        let targetType = 'fast';
        if (modelKey.includes('omni') || modelKey.includes('abra') || modelKey.includes('flash')) {
          targetType = 'omni';
        } else if (modelKey.includes('quality') || modelKey === 'veo_3_1_t2v') {
          targetType = 'quality';
        } else if (modelKey.includes('lite')) {
          targetType = 'lite';
        } else {
          targetType = 'fast';
        }
        addLog('Model mục tiêu: ' + targetType + ' (modelKey: ' + modelKey + ')');

        try {
          const allBottomBtns = Array.from(document.querySelectorAll('button, [role="button"], [role="combobox"], [aria-haspopup="menu"], div, span')).filter(b => {
            if (b.offsetWidth <= 0 || b.offsetHeight <= 0) return false;
            const t = (b.innerText || '').toLowerCase();
            const a = (b.getAttribute('aria-label') || '').toLowerCase();
            const isModelLike = t.includes('veo') || t.includes('omni') || t.includes('banana') || t.includes('flash') || t.includes('fast') || t.includes('quality') || a.includes('model');
            const hasCaret = t.includes('▾') || t.includes('▼') || b.innerHTML.includes('arrow_drop_down') || b.innerHTML.includes('svg');
            const isNearBottom = b.closest('[class*="bottom"], [class*="prompt"], [class*="toolbar"], [class*="footer"], footer');
            return isModelLike && (hasCaret || isNearBottom);
          });

          if (allBottomBtns.length > 0) {
            allBottomBtns.sort((a, b) => b.getBoundingClientRect().top - a.getBoundingClientRect().top);
            const modelChip = allBottomBtns[0];
            const curText = (modelChip.innerText || '').toLowerCase();
            addLog('Nút model hiện tại: ' + curText);

            let needClick = false;
            if (targetType === 'fast' && (!curText.includes('fast') || curText.includes('omni') || curText.includes('flash'))) needClick = true;
            if (targetType === 'quality' && !curText.includes('quality')) needClick = true;
            if (targetType === 'omni' && !curText.includes('omni')) needClick = true;
            if (targetType === 'lite' && !curText.includes('lite')) needClick = true;

            if (needClick) {
              addLog('Bấm mở menu model...');
              modelChip.click();
              await new Promise(r => setTimeout(r, 400));

              const menuItems = Array.from(document.querySelectorAll('.cdk-overlay-container [role="menuitem"], .cdk-overlay-container .mat-mdc-menu-item, .cdk-overlay-container button, [role="menuitem"], .mat-mdc-menu-item')).filter(el => {
                if (el.offsetWidth <= 0 || el.offsetHeight <= 0) return false;
                const t = (el.innerText || '').toLowerCase().trim();
                return t.length > 0 && t.length < 60;
              });

              addLog('Tìm thấy ' + menuItems.length + ' menu options trong overlay');

              let targetItem = null;
              if (targetType === 'fast') {
                targetItem = menuItems.find(el => {
                  const t = (el.innerText || '').toLowerCase();
                  return (t.includes('veo') && t.includes('fast')) || (t.includes('fast') && !t.includes('omni')) || t.includes('nhanh');
                }) || menuItems.find(el => (el.innerText || '').toLowerCase().includes('fast'));
              } else if (targetType === 'quality') {
                targetItem = menuItems.find(el => {
                  const t = (el.innerText || '').toLowerCase();
                  return (t.includes('veo') && t.includes('quality')) || t.includes('quality') || t.includes('chất lượng');
                });
              } else if (targetType === 'omni') {
                targetItem = menuItems.find(el => (el.innerText || '').toLowerCase().includes('omni'));
              } else if (targetType === 'lite') {
                targetItem = menuItems.find(el => (el.innerText || '').toLowerCase().includes('lite'));
              }

              if (targetItem) {
                addLog('Đã chọn menu item model: ' + targetItem.innerText.trim());
                targetItem.click();
                await new Promise(r => setTimeout(r, 350));
              } else {
                addLog('Không tìm thấy menu item khớp với ' + targetType + ', đóng menu.');
                document.body.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', code: 'Escape', bubbles: true }));
              }
            }
          }
        } catch (eM) {
          addLog('Lỗi chọn model (non-fatal): ' + eM.message);
        }

        // 5. CHỌN TỈ LỆ KHUNG HÌNH (ASPECT RATIO: 16:9 hoặc 9:16)
        try {
          const ratioTarget = ratioEnum === 1 ? '9:16' : '16:9';
          const ratioKeywords = ratioEnum === 1 ? ['9:16', 'portrait', 'dọc'] : ['16:9', 'landscape', 'ngang'];
          const ratioBtns = Array.from(document.querySelectorAll('button, [role="button"], [role="radio"], span')).filter(b => {
            if (b.offsetWidth <= 0) return false;
            const t = (b.innerText || '').toLowerCase();
            const a = (b.getAttribute('aria-label') || '').toLowerCase();
            const title = (b.getAttribute('title') || '').toLowerCase();
            return ratioKeywords.some(k => t.includes(k) || a.includes(k) || title.includes(k));
          });
          if (ratioBtns.length > 0) {
            addLog('Đã chọn tỉ lệ: ' + ratioTarget);
            ratioBtns[0].click();
            await new Promise(r => setTimeout(r, 150));
          }
        } catch (_) {}

        // 6. CHỌN THỜI LƯỢNG (DURATION: 8s, 4s, 6s)
        try {
          const durTarget = duration.endsWith('s') ? duration : (duration + 's');
          const durBtns = Array.from(document.querySelectorAll('button, [role="button"], [role="radio"], span')).filter(b => {
            if (b.offsetWidth <= 0) return false;
            const t = (b.innerText || '').toLowerCase().trim();
            return t === durTarget || t === durTarget.replace('s', ' giây') || t === durTarget.replace('s', 's');
          });
          if (durBtns.length > 0) {
            addLog('Đã chọn thời lượng: ' + durTarget);
            durBtns[0].click();
            await new Promise(r => setTimeout(r, 150));
          }
        } catch (_) {}

        // 7. ĐIỀN PROMPT VÀO Ô NHẬP LIỆU
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
          if (textNode) {
            textNode.textContent = prompt;
          } else {
            const pElem = document.createElement('p');
            pElem.textContent = prompt;
            promptEl.appendChild(pElem);
          }
          try {
            document.execCommand('insertText', false, prompt);
          } catch (_) {}
        } else {
          promptEl.value = prompt;
        }

        promptEl.dispatchEvent(new Event('input', { bubbles: true, cancelable: true }));
        promptEl.dispatchEvent(new Event('change', { bubbles: true, cancelable: true }));
        await new Promise(r => setTimeout(r, 350));

        // 8. BẤM NÚT TẠO / SUBMIT
        const submitStartTime = Date.now();
        const allButtons = Array.from(document.querySelectorAll('button, [role="button"]'));
        const submitBtn = allButtons.find(b => {
          if (b.disabled || b.offsetWidth <= 0 || b.offsetHeight <= 0) return false;
          const aria = (b.getAttribute('aria-label') || '').toLowerCase();
          const text = (b.innerText || '').toLowerCase().trim();
          const title = (b.getAttribute('title') || '').toLowerCase();
          return /tạo|create|generate|submit|send|gửi/i.test(aria + ' ' + text + ' ' + title) &&
                 !/dự án|project|mới/i.test(text);
        }) || allButtons.find(b => {
          const icon = b.querySelector('mat-icon, svg');
          return icon && !b.disabled && b.closest('form, .prompt-box, [class*="prompt"], [class*="input"], footer, [class*="bottom"]');
        });

        if (submitBtn) {
          addLog('Bấm nút tạo trên giao diện UI');
          submitBtn.click();
        }

        promptEl.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', code: 'Enter', keyCode: 13, which: 13, bubbles: true }));
        promptEl.dispatchEvent(new KeyboardEvent('keyup', { key: 'Enter', code: 'Enter', keyCode: 13, which: 13, bubbles: true }));

        addLog('Đã kích hoạt lệnh tạo video, theo dõi phản hồi...');

        // 9. CHỜ BẮT MEDIA ID & VIDEO URL CHUẨN XÁC
        let capturedMediaId = null;
        let capturedVideoUrl = null;
        const maxWaitMs = 50000;

        while (Date.now() - submitStartTime < maxWaitMs) {
          await new Promise(r => setTimeout(r, 800));

          // A. Network Sniffer
          const currentCaptured = window.__aiforge_captured_video_media_ids || [];
          if (currentCaptured.length > initialMediaCount) {
            capturedMediaId = currentCaptured[currentCaptured.length - 1];
            addLog('Đã bắt Media ID chuẩn từ Video RPC: ' + capturedMediaId);
            break;
          }

          // B. DOM Video Card
          const currentCards = Array.from(document.querySelectorAll('[data-media-id]'));
          const newCard = currentCards.find(c => {
            const mid = c.getAttribute('data-media-id');
            return mid && !preExistingCards.has(mid);
          });
          if (newCard) {
            capturedMediaId = newCard.getAttribute('data-media-id');
            addLog('Đã bắt Media ID từ Video Card mới: ' + capturedMediaId);
            break;
          }

          // C. Kiểm tra trực tiếp thẻ video mới load trong DOM
          const allVideos = Array.from(document.querySelectorAll('video[src]'));
          const newVideo = allVideos.find(v => v.src && !preExistingVideos.has(v.src) && v.src.startsWith('http'));
          if (newVideo) {
            capturedVideoUrl = newVideo.src;
            addLog('Đã bắt trực tiếp Video URL từ DOM: ' + capturedVideoUrl);
            const parentCard = newVideo.closest('[data-media-id], [data-id]');
            if (parentCard) {
              capturedMediaId = parentCard.getAttribute('data-media-id') || parentCard.getAttribute('data-id');
            }
            break;
          }

          // D. Kiểm tra cảnh báo / thông báo lỗi
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

        if (capturedMediaId || capturedVideoUrl) {
          const finalMediaId = capturedMediaId || ('flow-media-' + Date.now());
          const capturedResponseText = JSON.stringify([
            [["wrb.fr", "YhhmEf", JSON.stringify([[finalMediaId, null, finalMediaId]])]]
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

        return {
          success: false,
          error: 'Quá thời gian chờ phản hồi tạo video từ Google Flow UI (50s). Vui lòng kiểm tra lại trạng thái project.',
          log: logs
        };

      } catch (err) {
        addLog('Lỗi trong Native Web UI Simulation: ' + err.message);
        return {
          success: false,
          error: err.message,
          log: logs
        };
      }
    })()
  \`}`;

code = code.slice(0, nlStart) + newNlFunction + code.slice(nlEnd);
console.log('✓ Đã cập nhật hàm nl(r) hoàn chỉnh');

// 2. CẬP NHẬT executeFlowVideoRpc ĐỂ XỬ LÝ ĐÍNH KÈM ẢNH THAM CHIẾU (CDP & CLIPBOARD PASTE)
const execVideoStart = code.indexOf('async executeFlowVideoRpc(e,t,A,o){');
if (execVideoStart === -1) {
  console.error('❌ Không tìm thấy executeFlowVideoRpc');
  process.exit(1);
}
const execVideoEnd = code.indexOf('async executeFlowVideoStatusRpc(', execVideoStart);
if (execVideoEnd === -1) {
  console.error('❌ Không tìm thấy executeFlowVideoStatusRpc');
  process.exit(1);
}
console.log(`Tìm thấy executeFlowVideoRpc từ index ${execVideoStart} đến ${execVideoEnd}`);

const newExecVideoRpc = `async executeFlowVideoRpc(e,t,A,o){const n=Date.now();if(A?.aborted)throw new p("PROVIDER_REJECTED","Yêu cầu tạo video đã bị hủy",!1);const a=await this.ensureGoogleFlowViewReady(e,A);const wc=a.view.webContents;const curUrl=wc.getURL();const targetProjectUrl=t.projectId&&/^[a-f0-9-]{10,}$/i.test(t.projectId)?\`https://flow.google.com/project/\${t.projectId}\`:null;if(targetProjectUrl&&!curUrl.includes(t.projectId)){try{await wc.loadURL(targetProjectUrl);await new Promise(r=>setTimeout(r,2500))}catch(_){}}else if(!curUrl.includes('/project/')){await wc.executeJavaScript("(()=>{const p=document.querySelector('a[href*=\\"/project/\\"], [data-project-id]');if(p){p.click();return;}const b=Array.from(document.querySelectorAll('button,[role=\\"button\\"],div')).find(el=>/dự án mới|new project|tạo mới/i.test(el.innerText||el.getAttribute('aria-label')||''));if(b)b.click();})()",!0).catch(()=>{});await new Promise(r=>setTimeout(r,3000))}for(let w=0;w<25;w++){const ready=await wc.executeJavaScript("Boolean(document.querySelector('.ProseMirror, textarea, [contenteditable=\\"true\\"], [placeholder*=\\"Bạn muốn tạo\\"], [data-placeholder*=\\"Bạn muốn tạo\\"]'))",!0).catch(()=>!1);if(ready)break;await new Promise(r=>setTimeout(r,400))}const refFiles=Array.isArray(t.refFilePaths)?t.refFilePaths:Array.isArray(t.referenceFilePaths)?t.referenceFilePaths:[];if(refFiles.length>0){y("browser-view","flow video: đính kèm ảnh tham chiếu",{count:refFiles.length,files:refFiles});try{if(!wc.debugger.isAttached())wc.debugger.attach('1.3');const doc=await wc.debugger.sendCommand('DOM.getDocument');const node=await wc.debugger.sendCommand('DOM.querySelector',{nodeId:doc.root.nodeId,selector:'input[type="file"]'});if(node?.nodeId){await wc.debugger.sendCommand('DOM.setFileInputFiles',{files:refFiles,nodeId:node.nodeId});y("browser-view","CDP setFileInputFiles thành công",{files:refFiles})}}catch(cdpE){}for(const fpath of refFiles){if(require('fs').existsSync(fpath)){try{const nImg=require('electron').nativeImage.createFromPath(fpath);require('electron').clipboard.writeImage(nImg);await wc.executeJavaScript("(()=>{const p=document.querySelector('.ProseMirror, textarea, [contenteditable=\\"true\\"]');if(p){p.focus();p.click();}})()",!0);await new Promise(r=>setTimeout(r,200));wc.paste();await new Promise(r=>setTimeout(r,1000))}catch(eClip){}}}}const s=nl({params:t,rpcConfig:o});y("browser-view","flow video rpc: bắt đầu thực thi in-page script",{accountId:e.accountId,projectId:t.projectId,modelKey:t.modelKey,mode:t.mode,ratioEnum:t.ratioEnum,prompt:t.prompt.slice(0,50)});const i=18e4,c=a.view.webContents.executeJavaScript(s,!0);let g;const u=new Promise((l,m)=>{g=setTimeout(()=>{m(new p("NETWORK",\`Google Flow Video RPC quá thời gian chờ (\${Math.round(i/1e3)}s)\`,!0))},i)});let d;try{A?d=await Promise.race([c,u,new Promise((l,m)=>{A.addEventListener("abort",()=>m(new p("PROVIDER_REJECTED","Tác vụ tạo video bị hủy",!1)),{once:!0})})]):d=await Promise.race([c,u])}finally{g&&clearTimeout(g)}if(d&&d.success&&(d.mediaId||d.directVideoUrl))return{mediaId:d.mediaId,workflowId:d.workflowId||d.mediaId,directVideoUrl:d.directVideoUrl};if(y("browser-view","flow video rpc: kết quả in-page execution",{accountId:e.accountId,projectId:t.projectId,success:d.success,status:d.status,durationMs:Date.now()-n,error:d.error}),!d.success||!d.responseText)throw yt(d,d.error||\`Google Flow Video RPC thất bại với status \${d.status}\`);return Xu(d.responseText)}`;

code = code.slice(0, execVideoStart) + newExecVideoRpc + code.slice(execVideoEnd);
console.log('✓ Đã cập nhật executeFlowVideoRpc');

// 3. CẬP NHẬT runVideoJobViaRpc ĐỂ TRUYỀN refFilePaths & duration VÀ NHẬN directVideoUrl
// Tìm vị trí submitVideo trong runVideoJobViaRpc
const submitTarget = 'k=await this.measureStep(n,"rpc-video-submit",()=>this.videoRpcClient.submitVideo(A,{projectId:i,prompt:c,modelKey:g.modelKey,ratioEnum:d,mode:u,resolutionCode:_,startMediaId:P,startCrop:w,endMediaId:I,endCrop:D,referenceMediaIds:b},t.signal))';
if (code.includes(submitTarget)) {
  const replacement = 'const refPaths=(m||[]).map(x=>this.assets.getAsset(x)?.localPath).filter(p=>p&&require("fs").existsSync(p)),durStr=e.payload?.duration||g.duration||"8s";k=await this.measureStep(n,"rpc-video-submit",()=>this.videoRpcClient.submitVideo(A,{projectId:i,prompt:c,modelKey:g.modelKey,ratioEnum:d,mode:u,resolutionCode:_,startMediaId:P,startCrop:w,endMediaId:I,endCrop:D,referenceMediaIds:b,refFilePaths:refPaths,duration:durStr},t.signal))';
  code = code.replace(submitTarget, replacement);
  console.log('✓ Đã cập nhật submitVideo đầu tiên với refFilePaths và duration');
} else {
  console.log('ℹ️ Không tìm thấy exact submitTarget, thử regex...');
  code = code.replace(
    /this\.videoRpcClient\.submitVideo\(A,\{projectId:i,prompt:c,modelKey:g\.modelKey,ratioEnum:d,mode:u,resolutionCode:_,startMediaId:P,startCrop:w,endMediaId:I,endCrop:D,referenceMediaIds:b\},t\.signal\)/g,
    'this.videoRpcClient.submitVideo(A,{projectId:i,prompt:c,modelKey:g.modelKey,ratioEnum:d,mode:u,resolutionCode:_,startMediaId:P,startCrop:w,endMediaId:I,endCrop:D,referenceMediaIds:b,refFilePaths:(m||[]).map(x=>this.assets.getAsset(x)?.localPath).filter(p=>p&&require("fs").existsSync(p)),duration:e.payload?.duration||g.duration||"8s"},t.signal)'
  );
  console.log('✓ Đã cập nhật submitVideo qua regex');
}

// Cập nhật lấy directVideoUrl nếu có
const pollTarget = 't.updateProgress(45,"Đang render video trên Google Flow..."),await this.measureStep(n,"rpc-video-poll",()=>this.videoRpcClient.pollVideo(A,{projectId:i,mediaId:k.mediaId},(H,Ae)=>t.updateProgress(H,Ae),t.signal,300)),t.updateProgress(80,"Đang lấy liên kết video MP4...");const S=(await this.measureStep(n,"rpc-video-media",()=>this.videoRpcClient.fetchVideoMedia(A,{projectId:i,mediaId:k.mediaId},t.signal))).videoUrl';

if (code.includes(pollTarget)) {
  const newPollCode = 'let S;if(k.directVideoUrl&&typeof k.directVideoUrl=="string"&&k.directVideoUrl.startsWith("http")){S=k.directVideoUrl;t.updateProgress(85,"Đã nhận liên kết video trực tiếp từ Google Flow");}else{t.updateProgress(45,"Đang render video trên Google Flow..."),await this.measureStep(n,"rpc-video-poll",()=>this.videoRpcClient.pollVideo(A,{projectId:i,mediaId:k.mediaId},(H,Ae)=>t.updateProgress(H,Ae),t.signal,300)),t.updateProgress(80,"Đang lấy liên kết video MP4...");try{S=(await this.measureStep(n,"rpc-video-media",()=>this.videoRpcClient.fetchVideoMedia(A,{projectId:i,mediaId:k.mediaId},t.signal))).videoUrl}catch(errM){if(k.directVideoUrl)S=k.directVideoUrl;else throw errM;}}';
  code = code.replace(pollTarget, newPollCode);
  console.log('✓ Đã nâng cấp video polling và download để hỗ trợ directVideoUrl');
} else {
  console.log('ℹ️ Kiểm tra pollTarget');
}

fs.writeFileSync(targetFile, code, 'utf8');
console.log('✅ HOÀN TẤT PATCH FILE app/out/main/index.js');
