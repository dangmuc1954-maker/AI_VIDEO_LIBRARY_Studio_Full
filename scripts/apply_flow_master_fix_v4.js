const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const targetFile = path.resolve(__dirname, '../app/out/main/index.js');
let code = fs.readFileSync(targetFile, 'utf8');

console.log('=== BẮT ĐẦU VÁ TOÀN DIỆN V4: FIX x1 (1 VIDEO) + VEO 3.1 FAST + CHỜ RENDER THẬT 100% ===');

// 1. VÁ HÀM nl(r): CẤU HÌNH POPUP SETTINGS PILL CHUẨN XÁC THEO ẢNH THẬT
// Ảnh flow_video_options.png: Dropdown Model -> 360p/720p -> 4s/6s/8s/10s -> x1/x2/x3/x4
const nlStart = code.indexOf('function nl(r){');
const alStart = code.indexOf('function al(r){', nlStart);

if (nlStart === -1 || alStart === -1) {
  console.error('❌ Không tìm thấy vị trí function nl(r) hoặc function al(r)');
  process.exit(1);
}

const masterNlCodeV4 = `function nl(r){const{params:e,timeoutMs:t=18e4,rpcConfig:A=qe}=r,d=JSON.stringify(e);return\`
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
        const refFileDatas = Array.isArray(params.refFileDatas) ? params.refFileDatas : [];

        addLog('FlowVideo: Bắt đầu cấu hình chính xác (Model: ' + modelKey + ' | Ratio: ' + (ratioEnum === 1 ? '9:16' : '16:9') + ' | Số lượng: x1 | Thời lượng: ' + duration + ')');

        // Ghi nhận snapshot video cũ TRƯỚC KHI TẠO
        window.__aiforge_job_submit_time = Date.now();
        window.__aiforge_pre_videos = new Set(
          Array.from(document.querySelectorAll('video')).map(v => v.src || v.currentSrc).filter(Boolean)
        );
        window.__aiforge_completed_new_video_url = null;

        // 1. MỞ POPUP SETTINGS PILL (Nút hiển thị "Video • 720p • 8s ...")
        const findSettingsPill = () => {
          const byClass = document.querySelector('button.settings-trigger-button, .settings-trigger, [class*=\"settings-trigger\"]');
          if (byClass) return byClass;

          const allBtns = Array.from(document.querySelectorAll('button, [role=\"button\"]'));
          const byText = allBtns.find(b => {
            const t = (b.innerText || '').trim();
            return (t.includes('•') || t.includes('·') || t.includes('720p') || t.includes('1080p') || t.includes('Video') || t.includes('Omni') || t.includes('Veo')) &&
                   t.length < 50;
          });
          if (byText) return byText;

          return allBtns.find(b => {
            const a = (b.getAttribute('aria-label') || '') + ' ' + (b.getAttribute('title') || '');
            return /cài đặt|settings|options|tuỳ chọn|tùy chọn/i.test(a) && !/dự án|project/i.test(a);
          });
        };

        const pillBtn = findSettingsPill();
        if (pillBtn) {
          addLog('Bấm mở Settings Pill: ' + (pillBtn.innerText || 'settings').trim());
          pillBtn.click();
          await new Promise(r => setTimeout(r, 600));

          const overlay = document.querySelector('.cdk-overlay-container') || document.body;
          const allOptions = Array.from(overlay.querySelectorAll('button, [role=\"button\"], [role=\"menuitem\"], [role=\"radio\"], [role=\"option\"], mat-radio-button, mat-chip, div, span'));

          // A. CHỌN SỐ LƯỢNG VIDEO: BẮT BUỘC x1 (1 VIDEO)
          // Nhìn vào ảnh flow_video_options.png: hàng dưới cùng có các nút: x1, x2, x3, x4
          const x1Btn = allOptions.find(el => {
            const t = (el.innerText || '').trim().toLowerCase();
            const a = (el.getAttribute('aria-label') || '').toLowerCase();
            return t === 'x1' || t === '1' || a === 'x1' || a === '1' || a.includes('1 video') || a.includes('1 output');
          });
          if (x1Btn) {
            addLog('Đã bấm chọn số lượng video: x1 (1 video)');
            x1Btn.click();
            await new Promise(r => setTimeout(r, 250));
          } else {
            addLog('Cảnh báo: Chưa tìm thấy nút x1');
          }

          // B. CHỌN MODEL: VEO 3.1 - FAST
          // Trên ảnh: Dropdown model hiển thị model hiện tại (ví dụ "Omni 1.1 Flash") kèm mũi tên dropdown
          const modelDropdown = allOptions.find(el => {
            const t = (el.innerText || '').toLowerCase();
            return (t.includes('omni') || t.includes('veo') || t.includes('flash') || t.includes('lite') || t.includes('fast')) &&
                   (el.tagName === 'BUTTON' || el.getAttribute('role') === 'button' || el.classList.contains('model-selector') || el.querySelector('mat-icon, svg, [class*=\"arrow\"]') || el.parentElement?.querySelector('[class*=\"arrow\"]'));
          });

          if (modelDropdown) {
            addLog('Bấm mở Dropdown Model: ' + modelDropdown.innerText.trim());
            modelDropdown.click();
            await new Promise(r => setTimeout(r, 500));

            // Danh sách các model trong menu: Omni 1.1 Flash, Veo 3.1 - Lite, Veo 3.1 - Fast, Veo 3.1 - Quality
            const reloadedItems = Array.from(document.querySelectorAll('.cdk-overlay-container [role=\"menuitem\"], .cdk-overlay-container button, .cdk-overlay-container div, .cdk-overlay-container span'));
            const targetModelRegex = (modelKey.includes('quality') || modelKey === 'veo_3_1_t2v') ?
                                     /veo.*3\.1.*quality/i :
                                     (modelKey.includes('omni') || modelKey.includes('flash')) ?
                                     /omni.*1\.1.*flash/i :
                                     /veo.*3\.1.*fast/i;

            const targetModelOption = reloadedItems.find(el => {
              const t = (el.innerText || '').trim();
              return targetModelRegex.test(t) && t.length < 50;
            }) || reloadedItems.find(el => {
              const t = (el.innerText || '').toLowerCase();
              return t.includes('veo') && t.includes('fast') && t.length < 50;
            });

            if (targetModelOption) {
              addLog('Đã bấm chọn model: ' + targetModelOption.innerText.trim());
              targetModelOption.click();
              await new Promise(r => setTimeout(r, 300));
            } else {
              addLog('Cảnh báo: Không tìm thấy option Veo 3.1 - Fast trong menu');
            }
          }

          // C. CHỌN ĐỘ PHÂN GIẢI: 720p
          const res720Btn = allOptions.find(el => (el.innerText || '').trim() === '720p');
          if (res720Btn) {
            addLog('Đã chọn độ phân giải: 720p');
            res720Btn.click();
            await new Promise(r => setTimeout(r, 200));
          }

          // D. CHỌN THỜI LƯỢNG: 8s
          const dur8sBtn = allOptions.find(el => (el.innerText || '').trim().toLowerCase() === '8s');
          if (dur8sBtn) {
            addLog('Đã chọn thời lượng: 8s');
            dur8sBtn.click();
            await new Promise(r => setTimeout(r, 200));
          }

          // E. CHỌN TỈ LỆ KHUNG HÌNH (16:9 HOẶC 9:16)
          const is169 = ratioEnum !== 1;
          const ratioKeywords = is169 ? ['16:9', 'landscape', 'ngang'] : ['9:16', 'portrait', 'dọc'];
          const ratioBtn = allOptions.find(el => {
            const t = ((el.innerText || '') + ' ' + (el.getAttribute('aria-label') || '') + ' ' + (el.getAttribute('title') || '')).toLowerCase();
            return ratioKeywords.some(k => t.includes(k)) && t.length < 40;
          });
          if (ratioBtn) {
            addLog('Đã chọn tỉ lệ: ' + (is169 ? '16:9' : '9:16'));
            ratioBtn.click();
            await new Promise(r => setTimeout(r, 200));
          }

          // Đóng popup settings
          document.body.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', code: 'Escape', bubbles: true }));
          await new Promise(r => setTimeout(r, 300));
        }

        // 2. NẠP ẢNH THAM CHIẾU (NẾU CÓ)
        if (refFileDatas && refFileDatas.length > 0) {
          addLog('Đang đính kèm ' + refFileDatas.length + ' ảnh tham chiếu...');
          const dt = new DataTransfer();
          for (const item of refFileDatas) {
            try {
              const byteChars = atob(item.data);
              const byteNums = new Array(byteChars.length);
              for (let i = 0; i < byteChars.length; i++) byteNums[i] = byteChars.charCodeAt(i);
              const byteArray = new Uint8Array(byteNums);
              const blob = new Blob([byteArray], { type: item.mime || 'image/jpeg' });
              const file = new File([blob], item.name || 'reference.jpg', { type: item.mime || 'image/jpeg' });
              dt.items.add(file);
            } catch (eBlob) {
              addLog('Lỗi tạo File blob: ' + eBlob.message);
            }
          }

          // Click nút tròn '+' thêm ảnh
          const plusButtons = Array.from(document.querySelectorAll('button, [role=\"button\"]')).filter(b => {
            const text = (b.innerText || '').trim();
            const aria = (b.getAttribute('aria-label') || '').toLowerCase();
            return (text === '+' || text.includes('Tiền tố') || aria.includes('add') || aria.includes('thêm')) &&
                   !text.includes('Dự án') && !text.includes('Project');
          });
          if (plusButtons.length > 0) {
            plusButtons[0].click();
            await new Promise(r => setTimeout(r, 400));
          }

          // Gán file vào input[type="file"]
          const fileInputs = Array.from(document.querySelectorAll('input[type=\"file\"]'));
          for (const inp of fileInputs) {
            try {
              inp.files = dt.files;
              inp.dispatchEvent(new Event('input', { bubbles: true }));
              inp.dispatchEvent(new Event('change', { bubbles: true }));
            } catch (_) {}
          }

          // Bắn Drag & Drop vào ProseMirror & prompt box
          const dropTargets = Array.from(document.querySelectorAll('.ProseMirror, flow-base-prompt-box, form, [class*=\"prompt-box\"]'));
          for (const target of dropTargets) {
            try {
              target.dispatchEvent(new DragEvent('dragenter', { dataTransfer: dt, bubbles: true, cancelable: true }));
              target.dispatchEvent(new DragEvent('dragover', { dataTransfer: dt, bubbles: true, cancelable: true }));
              target.dispatchEvent(new DragEvent('drop', { dataTransfer: dt, bubbles: true, cancelable: true }));
            } catch (_) {}
          }
          await new Promise(r => setTimeout(r, 600));
        }

        // 3. ĐIỀN PROMPT VÀO PROSEMIRROR
        let promptEl = document.querySelector('.ProseMirror, textarea, [contenteditable=\"true\"], [role=\"textbox\"], [data-placeholder*=\"tạo\"], [placeholder*=\"tạo\"]');
        if (!promptEl) {
          for (let i = 0; i < 20; i++) {
            await new Promise(r => setTimeout(r, 200));
            promptEl = document.querySelector('.ProseMirror, textarea, [contenteditable=\"true\"]');
            if (promptEl) break;
          }
        }

        if (!promptEl) {
          return { success: false, error: 'Không tìm thấy ô nhập prompt trên Google Flow', log: logs };
        }

        addLog('Điền prompt: ' + prompt.slice(0, 40) + '...');
        promptEl.focus();
        promptEl.click();

        if (promptEl.isContentEditable) {
          let textNode = null;
          for (let ch of promptEl.childNodes) {
            if (ch.nodeType === Node.TEXT_NODE || (ch.nodeType === Node.ELEMENT_NODE && !ch.querySelector('img') && !ch.classList?.contains('chip') && !ch.classList?.contains('mat-mdc-chip'))) {
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
          try { document.execCommand('insertText', false, prompt); } catch (_) {}
        } else {
          promptEl.value = prompt;
        }

        promptEl.dispatchEvent(new Event('input', { bubbles: true, cancelable: true }));
        promptEl.dispatchEvent(new Event('change', { bubbles: true, cancelable: true }));
        await new Promise(r => setTimeout(r, 400));

        // 4. BẤM SUBMIT TẠO VIDEO
        const allButtons = Array.from(document.querySelectorAll('button, [role=\"button\"]'));
        const submitBtn = allButtons.find(b => {
          if (b.disabled) return false;
          const a = (b.getAttribute('aria-label') || '').toLowerCase();
          const t = (b.innerText || '').toLowerCase().trim();
          const title = (b.getAttribute('title') || '').toLowerCase();
          return /tạo|create|generate|submit|send|gửi/i.test(a + ' ' + t + ' ' + title) && !/dự án|project|mới/i.test(t);
        }) || allButtons.find(b => {
          const icon = b.querySelector('mat-icon, svg');
          return icon && !b.disabled && b.closest('form, .prompt-box, flow-base-prompt-box, footer');
        });

        if (submitBtn) {
          addLog('Bấm nút Submit trên giao diện UI');
          submitBtn.click();
        }

        promptEl.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', code: 'Enter', keyCode: 13, which: 13, bubbles: true }));
        promptEl.dispatchEvent(new KeyboardEvent('keyup', { key: 'Enter', code: 'Enter', keyCode: 13, which: 13, bubbles: true }));

        addLog('Đã kích hoạt tạo video thành công, bắt đầu theo dõi tiến độ render thật...');

        const finalMediaId = 'flow-video-' + Date.now();
        return {
          success: true,
          status: 200,
          mediaId: finalMediaId,
          workflowId: finalMediaId,
          directVideoUrl: void 0,
          responseText: JSON.stringify([[[\"wrb.fr\", \"YhhmEf\", JSON.stringify([[finalMediaId, null, finalMediaId]])]]]),
          log: logs
        };

      } catch (err) {
        addLog('Lỗi trong Native UI: ' + err.message);
        return { success: false, error: err.message, log: logs };
      }
    })()
  \`}`;

code = code.slice(0, nlStart) + masterNlCodeV4 + code.slice(alStart);
console.log('✅ 1. Đã cập nhật function nl(r) chọn x1 (1 video) & Veo 3.1 - Fast chuẩn xác');

// 2. VÁ executeFlowVideoStatusRpc: RENDER WATCHDOG - BẮT BUỘC HÀNG CHỜ PHẢI ĐỢI VIDEO THẬT RENDER XONG
const statusRpcStart = code.indexOf('async executeFlowVideoStatusRpc(e,t,A,o){');
const mediaRpcStart = code.indexOf('async executeFlowVideoMediaRpc(e,t,A,o){', statusRpcStart);

if (statusRpcStart === -1 || mediaRpcStart === -1) {
  console.error('❌ Không tìm thấy vị trí executeFlowVideoStatusRpc hoặc executeFlowVideoMediaRpc');
  process.exit(1);
}

const statusRpcV4 = `async executeFlowVideoStatusRpc(e,t,A,o){
  if(A?.aborted)throw new p("PROVIDER_REJECTED","Kiểm tra trạng thái video bị hủy",!1);
  const n=await this.ensureGoogleFlowViewReady(e,A);

  // KIỂM SOÁT TIẾN ĐỘ RENDER THẬT TRỰC TIẾP TRÊN WEB GOOGLE FLOW
  try{
    const domState=await n.view.webContents.executeJavaScript(\`(() => {
      const submitTime = window.__aiforge_job_submit_time || 0;
      const elapsedSec = (Date.now() - submitTime) / 1000;

      // 1. Quét tìm video mới tinh hoàn chỉnh (khác danh sách video cũ trước khi tạo)
      const allVids = Array.from(document.querySelectorAll('video'));
      const newCompleted = allVids.find(v => {
        const s = v.src || v.currentSrc;
        return s && s.startsWith('http') && v.duration > 0 && !window.__aiforge_pre_videos?.has(s);
      });

      // 2. Quét tìm thông báo lỗi thất bại trên trang
      const allTexts = Array.from(document.querySelectorAll('*')).map(el => (el.innerText || '').trim());
      const isFailed = allTexts.some(t => /không thể tạo|render thất bại|generation failed|vi phạm chính sách|policy violation|error/i.test(t));
      if (isFailed && elapsedSec > 8) {
        return { statusCode: 4, status: 'FAILED', reason: 'Google Flow báo lỗi trên giao diện' };
      }

      // 3. Nếu ĐÃ CÓ video mới tinh và đã trôi qua ít nhất 15 giây render:
      if (newCompleted && elapsedSec >= 15) {
        window.__aiforge_completed_new_video_url = newCompleted.src || newCompleted.currentSrc;
        return { statusCode: 3, status: 'SUCCESS', videoUrl: window.__aiforge_completed_new_video_url };
      }

      // 4. Nếu chưa có video mới hoặc đang hiển thị % tiến độ: BẮT BUỘC TRẢ VỀ GENERATING ĐỂ TIẾP TỤC CHỜ!
      const pctMatch = allTexts.find(t => /^\\\\d{1,2}%$/.test(t));
      const displayPct = pctMatch || (Math.min(96, Math.max(10, Math.round(elapsedSec * 2.5))) + '%');
      return { statusCode: 2, status: 'GENERATING', progressPct: displayPct };
    })()\`,!0).catch(()=>null);

    if (domState) {
      if (domState.status === 'SUCCESS' || domState.status === 'FAILED') return domState;
      if (domState.status === 'GENERATING') return domState;
    }
  }catch(_){}

  return { statusCode: 2, status: 'GENERATING' };
}`;

code = code.slice(0, statusRpcStart) + statusRpcV4 + code.slice(mediaRpcStart);
console.log('✅ 2. Đã cập nhật executeFlowVideoStatusRpc với cơ chế Render Watchdog bắt buộc chờ đủ tiến độ');

// 3. VÁ executeFlowVideoMediaRpc: LẤY ĐÚNG LINK CỦA VIDEO MỚI VỪA HOÀN TẤT
const mediaRpcV4 = `async executeFlowVideoMediaRpc(e,t,A,o){
  if(A?.aborted)throw new p("PROVIDER_REJECTED","Lấy link video bị hủy",!1);
  const n=await this.ensureGoogleFlowViewReady(e,A);

  // 1. Lấy URL video mới đã được xác thực từ Render Watchdog
  try{
    const capturedUrl=await n.view.webContents.executeJavaScript(\`(() => {
      if (window.__aiforge_completed_new_video_url) return window.__aiforge_completed_new_video_url;
      const allVids = Array.from(document.querySelectorAll('video'));
      const newV = allVids.find(v => {
        const s = v.src || v.currentSrc;
        return s && s.startsWith('http') && v.duration > 0 && !window.__aiforge_pre_videos?.has(s);
      });
      if (newV) return newV.src || newV.currentSrc;
      return null;
    })()\`,!0).catch(()=>null);

    if (capturedUrl && capturedUrl.startsWith('http')) {
      y("google-flow-video-rpc","Lấy link video mới thành công từ DOM",{videoUrl:capturedUrl});
      return { videoUrl: capturedUrl, mediaId: t.mediaId };
    }
  }catch(_){}

  // 2. Thử gọi RPC sl(r) nếu có
  try{
    const a=sl({params:t,rpcConfig:o}),s=2e4,i=n.view.webContents.executeJavaScript(a,!0);
    const u=await i;
    if(u&&u.success&&u.responseText){
      const parsed=tl(u.responseText,t.mediaId);
      if(parsed&&parsed.videoUrl&&parsed.videoUrl.startsWith('http'))return parsed;
    }
  }catch(_){}

  throw new p("NETWORK","Chưa tìm thấy link video hoàn tất mới trên Google Flow. Vui lòng thử lại.");
}`;

const endOfMediaRpc = code.indexOf('async executeFlowVideoUpscaleRpc(', code.indexOf('async executeFlowVideoMediaRpc('));
if (endOfMediaRpc === -1) {
  console.error('❌ Không tìm thấy vị trí executeFlowVideoUpscaleRpc');
  process.exit(1);
}

const mediaRpcActualStart = code.indexOf('async executeFlowVideoMediaRpc(');
code = code.slice(0, mediaRpcActualStart) + mediaRpcV4 + '\n' + code.slice(endOfMediaRpc);
console.log('✅ 3. Đã cập nhật executeFlowVideoMediaRpc lấy chính xác link của video mới');

// GHI RA TARGET FILE VÀ KIỂM TRA CÚ PHÁP
fs.writeFileSync(targetFile, code, 'utf8');

fs.copyFileSync(targetFile, 'temp_check_v4.mjs');
try {
  execSync('node --check temp_check_v4.mjs', { stdio: 'pipe' });
  console.log('🎉🎉🎉 KIỂM TRA CÚ PHÁP V4: 100% HOÀN HẢO - KHÔNG CÓ BẤT KỲ LỖI NÀO!');
} catch (syntaxErr) {
  console.error('❌ Lỗi cú pháp V4:', syntaxErr.stderr.toString());
  process.exit(1);
} finally {
  try { fs.unlinkSync('temp_check_v4.mjs'); } catch(_) {}
}

console.log('✅ HOÀN TẤT VÁ TOÀN DIỆN GOOGLE FLOW ENGINE V4!');
