const fs = require('fs');
const path = require('path');

const targetFile = path.resolve(__dirname, '../app/out/main/index.js');
let code = fs.readFileSync(targetFile, 'utf8');

console.log('Original code length:', code.length);

// 1. Remove Extension Bridge Server Init block
const bridgeInitStart = code.indexOf('/*__AIFORGE_FLOW_BRIDGE_SERVER_INIT__*/');
if (bridgeInitStart !== -1) {
  const fWhenReady = code.indexOf('F.whenReady().then(', bridgeInitStart);
  if (fWhenReady !== -1) {
    code = code.slice(0, bridgeInitStart) + '\n' + code.slice(fWhenReady);
    console.log('[1/5] Removed Extension Bridge Server Init block successfully.');
  } else {
    console.error('Could not find F.whenReady after bridge init');
  }
} else {
  console.log('[1/5] Bridge Server Init block not found (already removed).');
}

// 2. Remove loadExtension in getOrCreateView
const loadExtIdx = code.indexOf('loadExtension(extDir');
if (loadExtIdx !== -1) {
  const tryStart = code.lastIndexOf('try {', loadExtIdx);
  const catchEnd = code.indexOf('} catch(_) {}', loadExtIdx);
  if (tryStart !== -1 && catchEnd !== -1) {
    code = code.slice(0, tryStart) + code.slice(catchEnd + '} catch(_) {}'.length);
    console.log('[2/5] Removed loadExtension in getOrCreateView successfully.');
  }
} else {
  console.log('[2/5] loadExtension not found (already removed).');
}

// 3. Remove Bridge dispatchJob in executeFlowImageRpc
const imageBridgeIdx = code.indexOf('flow image: phát hiện Extension Bridge hoạt động');
if (imageBridgeIdx !== -1) {
  const ifStart = code.lastIndexOf('if (global.__aiforge_bridge_server', imageBridgeIdx);
  const ifEnd = code.indexOf('const s=zu({params:t,rpcConfig:o});', imageBridgeIdx);
  if (ifStart !== -1 && ifEnd !== -1) {
    code = code.slice(0, ifStart) + code.slice(ifEnd);
    console.log('[3/5] Removed Bridge dispatchJob in executeFlowImageRpc successfully.');
  }
} else {
  console.log('[3/5] Bridge in executeFlowImageRpc not found (already removed).');
}

// 4. Update function nl(r)
const nlStart = code.indexOf('function nl(r){');
const alStart = code.indexOf('function al(r){', nlStart);
if (nlStart !== -1 && alStart !== -1) {
  const cleanNl = `function nl(r){const{params:e,timeoutMs:t=18e4,rpcConfig:A=qe}=r,o=A.recaptcha?.siteKey||Ec,n=A.recaptcha?.videoAction||"VIDEO_GENERATION",a=A.clientContext?.clientVersionNumber??22,s=A.clientContext?.batchExecutePath||"/_/AiSandboxAngularFrontend/data/batchexecute",i=A.rpcIds?.videoT2v||"YhhmEf",c=A.rpcIds?.videoI2v||"eb1hJf",g=A.rpcIds?.videoFrames||"nprQif",u=A.rpcIds?.videoR2v||"MZZa6b",d=JSON.stringify(e);return\`
    (async () => {
      const logs = [];
      function addLog(msg) {
        logs.push(new Date().toISOString().slice(11, 23) + ' ' + msg);
      }

      try {
        addLog('FlowVideoRpc: Khởi chạy in-page submit');
        const siteKey = \${JSON.stringify(o)};
        const params = \${d};

        // 1. Lấy token reCAPTCHA enterprise
        let recaptchaToken = '';
        const runRecaptchaExecute = async () => {
          const execPromise = window.grecaptcha.enterprise.execute(siteKey, { action: \${JSON.stringify(n)} });
          const timeoutPromise = new Promise((_, reject) =>
            setTimeout(() => reject(new Error('reCAPTCHA enterprise execute timeout (20s)')), 20000)
          );
          return await Promise.race([execPromise, timeoutPromise]);
        };

        if (typeof window.grecaptcha?.enterprise?.execute === 'function') {
          addLog('grecaptcha.enterprise sẵn sàng');
          try {
            recaptchaToken = await runRecaptchaExecute();
          } catch (eErr) {
            addLog('Lỗi lấy reCAPTCHA trực tiếp: ' + eErr.message);
          }
        }

        if (!recaptchaToken) {
          addLog('Nạp script reCAPTCHA enterprise');
          const scriptId = 'aiforge-flow-recaptcha';
          let s = document.getElementById(scriptId);
          if (!s) {
            try {
              s = document.createElement('script');
              s.id = scriptId;
              const existingNonce = document.querySelector('script[nonce]')?.nonce || document.querySelector('script[nonce]')?.getAttribute('nonce');
              if (existingNonce) s.setAttribute('nonce', existingNonce);
              let scriptUrl = 'https://www.google.com/recaptcha/enterprise.js?render=' + siteKey;
              if (typeof window.trustedTypes !== 'undefined' && window.trustedTypes.createPolicy) {
                try {
                  const p = window.trustedTypes.defaultPolicy || window.trustedTypes.createPolicy('recaptcha-loader', { createScriptURL: u => u });
                  if (p) scriptUrl = p.createScriptURL(scriptUrl);
                } catch {
                  try {
                    const existing = window.trustedTypes.getPolicy('recaptcha-loader');
                    if (existing) scriptUrl = existing.createScriptURL(scriptUrl);
                  } catch {}
                }
              }
              s.src = scriptUrl;
              s.async = true;
              document.head.appendChild(s);
            } catch (injectErr) {
              addLog('Không thể inject script reCAPTCHA: ' + injectErr.message);
            }
          }

          const startWait = Date.now();
          while (Date.now() - startWait < 15000) {
            if (typeof window.grecaptcha?.enterprise?.execute === 'function') break;
            await new Promise(r => setTimeout(r, 200));
          }

          if (typeof window.grecaptcha?.enterprise?.execute === 'function') {
            try {
              recaptchaToken = await runRecaptchaExecute();
            } catch (waitErr) {
              addLog('Lỗi lấy reCAPTCHA sau khi load script: ' + waitErr.message);
            }
          }
        }

        if (!recaptchaToken) {
          addLog('CẢNH BÁO: Không lấy được reCAPTCHA token');
        } else {
          addLog('Đã lấy reCAPTCHA token thành công');
        }

        // 2. Lấy WIZ_global_data
        let wiz = window.WIZ_global_data || {};
        let at = wiz.SNlM0e || '';
        let fsid = wiz.FdrFJe || '';
        let bl = wiz.cfb2h || 'boq_labs-ai-sandbox-frontend_20261028.00_p0';

        if (!at || !fsid) {
          for (let i = 0; i < 20; i++) {
            wiz = window.WIZ_global_data || {};
            at = wiz.SNlM0e || at;
            fsid = wiz.FdrFJe || fsid;
            bl = wiz.cfb2h || bl;
            if (at && fsid) break;
            await new Promise(r => setTimeout(r, 200));
          }
        }

        const reqId = Math.floor(Math.random() * 900000 + 1000000);

        // 3. Chuẩn hóa Mode & ModelKey (Giữ nguyên model người dùng chọn, chỉ fallback nếu thiếu)
        const ratioEnum = params.ratioEnum || 2; // 1 = 9:16, 2 = 16:9
        let actualMode = params.mode;
        const hasRefs = Array.isArray(params.referenceMediaIds) && params.referenceMediaIds.length > 0;
        if (actualMode === 'R2V' && !hasRefs) actualMode = 'T2V';
        if (actualMode === 'I2V' && !params.startMediaId) actualMode = 'T2V';
        if (actualMode === 'Frames' && (!params.startMediaId || !params.endMediaId)) actualMode = 'T2V';

        let modelKey = params.modelKey;
        if (!modelKey) {
          if (actualMode === 'R2V') {
            modelKey = 'abra_r2v_8s';
          } else if (actualMode === 'I2V') {
            modelKey = (ratioEnum === 1) ? 'veo_3_1_i2v_s_fast_portrait' : 'veo_3_1_i2v_s_fast';
          } else if (actualMode === 'Frames') {
            modelKey = (ratioEnum === 1) ? 'veo_3_1_i2v_s_fast_portrait_fl' : 'veo_3_1_i2v_s_fast_fl';
          } else {
            modelKey = (ratioEnum === 1) ? 'veo_3_1_t2v_fast_portrait' : 'veo_3_1_t2v_fast';
          }
        }

        const resolutionCode = params.resolutionCode || (modelKey && modelKey.toLowerCase().includes('360p') ? 4 : 1);
        const clientUuid1 = (typeof crypto?.randomUUID === 'function') ? crypto.randomUUID().toUpperCase() : 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => { const r = Math.random() * 16 | 0; return (c === 'x' ? r : (r & 0x3 | 0x8)).toString(16).toUpperCase(); });
        const clientUuid2 = (typeof crypto?.randomUUID === 'function') ? crypto.randomUUID().toUpperCase() : 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => { const r = Math.random() * 16 | 0; return (c === 'x' ? r : (r & 0x3 | 0x8)).toString(16).toUpperCase(); });
        const clientSessionUuid = (typeof crypto?.randomUUID === 'function') ? crypto.randomUUID().toUpperCase() : 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => { const r = Math.random() * 16 | 0; return (c === 'x' ? r : (r & 0x3 | 0x8)).toString(16).toUpperCase(); });
        const promptStructure = [null, null, [[[params.prompt]]]];

        let rpcId = params.rpcId;
        let modePayload;

        if (actualMode === 'Frames' && params.startMediaId && params.endMediaId) {
          rpcId = rpcId || \${JSON.stringify(g)};
          modePayload = [
            promptStructure,
            modelKey,
            ratioEnum,
            null,
            [null, params.startMediaId, null, null, null, params.startCrop || null],
            [null, params.endMediaId, null, null, null, params.endCrop || null],
            [null, null, null, null, clientUuid1, clientUuid2]
          ];
        } else if (actualMode === 'I2V' && params.startMediaId) {
          rpcId = rpcId || \${JSON.stringify(c)};
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
        } else if (actualMode === 'R2V' && hasRefs) {
          rpcId = rpcId || \${JSON.stringify(u)};
          const refArray = params.referenceMediaIds.map(id => [null, id]);
          const nullCount = (modelKey && modelKey.startsWith('abra')) ? 5 : 6;
          const trailingNulls = new Array(nullCount).fill(null);
          modePayload = [
            promptStructure,
            refArray,
            modelKey,
            ratioEnum,
            null,
            [null, null, null, null, clientUuid1, clientUuid2],
            ...trailingNulls,
            [resolutionCode]
          ];
        } else {
          rpcId = rpcId || \${JSON.stringify(i)};
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

        const candidateCount = Math.max(1, Math.min(4, Number(params.candidateCount || params.count || 1)));
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
          [clientSessionUuid, candidateCount]
        ];

        // 4. Gửi request batchexecute
        const sourcePath = '/project/' + params.projectId;
        const queryParams = new URLSearchParams({
          rpcids: rpcId,
          'source-path': sourcePath,
          bl: bl,
          'f.sid': fsid,
          hl: 'en-US',
          _reqid: String(reqId),
          rt: 'c'
        });

        const batchPath = \${JSON.stringify(s)};
        const url = batchPath + '?' + queryParams.toString();
        const fReq = JSON.stringify([[[rpcId, JSON.stringify(innerPayload), null, 'generic']]]);
        const bodyData = 'f.req=' + encodeURIComponent(fReq) + '&at=' + encodeURIComponent(at) + '&';

        addLog('Gửi batchexecute RPC ' + rpcId + ' (Model: ' + modelKey + ', candidates: ' + candidateCount + ')');
        const controller = new AbortController();
        const timeoutTimer = setTimeout(() => controller.abort(), \${t});

        const res = await fetch(url, {
          method: 'POST',
          headers: {
            'content-type': 'application/x-www-form-urlencoded;charset=UTF-8'
          },
          body: bodyData,
          credentials: 'include',
          signal: controller.signal
        });

        clearTimeout(timeoutTimer);
        addLog('Nhận HTTP response status: ' + res.status);
        const text = await res.text();

        return {
          success: res.ok,
          status: res.status,
          responseText: text,
          projectId: params.projectId,
          log: logs
        };
      } catch (err) {
        addLog('Lỗi thực thi script in-page: ' + err.message);
        return {
          success: false,
          error: err.message,
          log: logs
        };
      }
    })()
  \`}
`;
  code = code.slice(0, nlStart) + cleanNl + code.slice(alStart);
  console.log('[4/5] Updated function nl(r) with exact native Boq payload and candidateCount control.');
}

// 5. Update executeFlowVideoRpc, executeFlowVideoStatusRpc, executeFlowVideoMediaRpc
const execRpcStart = code.indexOf('async executeFlowVideoRpc(e,t,A,o){');
const execUpscaleStart = code.indexOf('async executeFlowVideoUpscaleRpc(e,t,A,o){', execRpcStart);

if (execRpcStart !== -1 && execUpscaleStart !== -1) {
  const cleanVideoMethods = `async executeFlowVideoRpc(e,t,A,o){
  const n=Date.now();
  if(A?.aborted)throw new p("PROVIDER_REJECTED","Yêu cầu tạo video đã bị hủy",!1);
  const a=await this.ensureGoogleFlowViewReady(e,A);

  // Tự động đồng bộ live projectId từ Google Flow tab nếu đang mở project
  try {
    const curUrl = a.view.webContents.getURL() || '';
    const projMatch = curUrl.match(/\\/project\\/([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})/i);
    if (projMatch && projMatch[1]) {
      t.projectId = projMatch[1];
      y("browser-view", "Tự động đồng bộ live projectId từ Google Flow tab:", { projectId: t.projectId });
    }
  } catch(pErr) {}

  // Thực thi lệnh In-Page Native RPC trực tiếp trong session
  const s=nl({params:t,rpcConfig:o});
  y("browser-view","flow video rpc: bắt đầu thực thi in-page script",{
    accountId:e.accountId,
    projectId:t.projectId,
    modelKey:t.modelKey,
    mode:t.mode,
    ratioEnum:t.ratioEnum,
    candidateCount:t.candidateCount||1,
    prompt:(t.prompt||'').slice(0,50)
  });

  const i=18e4,c=a.view.webContents.executeJavaScript(s,!0);
  let g;
  const u=new Promise((l,m)=>{g=setTimeout(()=>{m(new p("NETWORK",\`Google Flow Video RPC quá thời gian chờ (\${Math.round(i/1e3)}s)\`,!0))},i)});
  let d;
  try{
    A?d=await Promise.race([c,u,new Promise((l,m)=>{A.addEventListener("abort",()=>m(new p("PROVIDER_REJECTED","Tác vụ tạo video bị hủy",!1)),{once:!0})})]):d=await Promise.race([c,u])
  }finally{g&&clearTimeout(g)}

  // Ghi log chẩn đoán
  try {
    const debugLine = JSON.stringify({
      time: new Date().toISOString(),
      event: 'flow-video-rpc-submit',
      accountId: e.accountId,
      projectId: t.projectId,
      modelKey: t.modelKey,
      mode: t.mode,
      ratioEnum: t.ratioEnum,
      candidateCount: t.candidateCount || 1,
      prompt: (t.prompt || '').slice(0, 100),
      success: d?.success,
      status: d?.status,
      error: d?.error,
      inPageLogs: d?.log,
      responseSnippet: (d?.responseText || '').slice(0, 1200)
    }, null, 2) + '\\n\\n';
    require('fs').appendFileSync('D:\\\\dự án antigravity\\\\AIForge_Veo3_Studio\\\\flow_rpc_debug.log', debugLine);
  } catch(_) {}

  // Nếu In-Page RPC thành công và không bị flag UNUSUAL_ACTIVITY
  if (d?.success && d?.responseText && !d.responseText.includes('PUBLIC_ERROR_UNUSUAL_ACTIVITY') && !d.responseText.includes('UNUSUAL_ACTIVITY')) {
    try {
      const parsed = Xu(d.responseText);
      if (parsed && parsed.mediaId) return parsed;
    } catch (parseErr) {
      y("browser-view", "Lỗi parse Xu response: " + parseErr.message);
    }
  }

  // NATIVE UI FALLBACK: Nếu Boq RPC bị UNUSUAL_ACTIVITY hoặc trả về lỗi, tự động nhập prompt & click tạo trực tiếp trên DOM
  y("browser-view", "flow video rpc: kích hoạt Native UI Fallback trực tiếp trên giao diện Google Flow...", { accountId: e.accountId, projectId: t.projectId });
  try {
    const nativeUiScript = \`(async () => {
      try {
        const prompt = \${JSON.stringify(t.prompt || '')};
        const targetCount = \${JSON.stringify(t.candidateCount || 1)};

        // 1. Cài đặt số lượng video (chọn x1 nếu targetCount=1)
        const targetTag = 'x' + targetCount;
        const allCapsules = Array.from(document.querySelectorAll('button, [role="button"], [class*="pill"], [class*="badge"], [class*="capsule"], [class*="chip"], div, span'));
        const optPill = allCapsules.find(b => {
          if (b.offsetWidth <= 0 || b.offsetHeight <= 0 || b.children.length > 3) return false;
          const txt = (b.innerText || '').trim();
          return /x[1-4]/i.test(txt) && (/(?:video|giây|s\\\\b|720p|1080p|360p)/i.test(txt) || /^x[1-4]$/i.test(txt) || txt.length < 35);
        });
        if (optPill && !optPill.innerText.includes(targetTag)) {
          optPill.click();
          await new Promise(r => setTimeout(r, 450));
          const popBtns = Array.from(document.querySelectorAll('button, [role="button"], [role="option"], [role="menuitem"], div, span')).filter(el => {
            if (el.offsetWidth <= 0 || el.offsetHeight <= 0 || el.children.length > 2) return false;
            const text = (el.innerText || '').trim().toLowerCase();
            return text === targetTag.toLowerCase() || text === String(targetCount) || text.includes(targetTag.toLowerCase());
          });
          if (popBtns.length > 0) {
            popBtns[0].click();
            await new Promise(r => setTimeout(r, 350));
          }
          document.body.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', code: 'Escape', bubbles: true }));
          document.body.dispatchEvent(new KeyboardEvent('keyup', { key: 'Escape', code: 'Escape', bubbles: true }));
          await new Promise(r => setTimeout(r, 200));
        }

        // 2. Tìm ô prompt
        let promptEl = document.querySelector('.ProseMirror, textarea, [contenteditable="true"], [role="textbox"], div[data-placeholder]');
        for (let i = 0; i < 15 && !promptEl; i++) {
          await new Promise(r => setTimeout(r, 200));
          promptEl = document.querySelector('.ProseMirror, textarea, [contenteditable="true"], [role="textbox"], div[data-placeholder]');
        }

        if (promptEl) {
          promptEl.focus();
          promptEl.click();
          if (promptEl.isContentEditable) {
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
          await new Promise(r => setTimeout(r, 300));

          // 3. Bấm nút tạo
          const allButtons = Array.from(document.querySelectorAll('button, [role="button"]'));
          const submitBtn = allButtons.find(b => {
            if (b.disabled || b.offsetWidth <= 0 || b.offsetHeight <= 0) return false;
            const aria = (b.getAttribute('aria-label') || '').toLowerCase();
            const text = (b.innerText || '').toLowerCase().trim();
            const title = (b.getAttribute('title') || '').toLowerCase();
            return /submit|create|generate|tạo|send|gửi/i.test(aria + ' ' + text + ' ' + title) && !/new project|project|tạo mới/i.test(text);
          }) || allButtons.find(b => {
            const icon = b.querySelector('mat-icon, svg');
            return icon && !b.disabled && b.closest('form, .prompt-box, [class*="prompt"], [class*="input"], footer, [class*="bottom"]');
          });

          if (submitBtn) {
            submitBtn.click();
          }
          promptEl.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', code: 'Enter', keyCode: 13, which: 13, bubbles: true }));
          promptEl.dispatchEvent(new KeyboardEvent('keyup', { key: 'Enter', code: 'Enter', keyCode: 13, which: 13, bubbles: true }));

          // Đợi nhận diện card đang render trên DOM
          await new Promise(r => setTimeout(r, 2000));
          return { success: true, mediaId: 'flow-gen-' + Date.now(), workflowId: 'flow-gen-' + Date.now() };
        }
        return { success: false, error: 'Không tìm thấy ô nhập prompt' };
      } catch (eNative) {
        return { success: false, error: eNative.message };
      }
    })()\`;

    const uiRes = await a.view.webContents.executeJavaScript(nativeUiScript, !0);
    if (uiRes?.success && uiRes?.mediaId) {
      y("browser-view", "flow video rpc: Native UI Click Fallback thành công!", { accountId: e.accountId, mediaId: uiRes.mediaId });
      return { mediaId: uiRes.mediaId, workflowId: uiRes.workflowId || uiRes.mediaId };
    }
  } catch (fbErr) {
    y("browser-view", "flow video rpc: Native UI Fallback lỗi: " + fbErr.message, { accountId: e.accountId });
  }

  if (d?.mediaId) return { mediaId: d.mediaId, workflowId: d.workflowId || d.mediaId };
  if (!d?.success || !d?.responseText) {
    throw yt(d, d?.error || \`Google Flow Video RPC thất bại với status \${d?.status}\`);
  }
  return Xu(d.responseText);
}
async executeFlowVideoStatusRpc(e,t,A,o){
  if(A?.aborted)throw new p("PROVIDER_REJECTED","Kiểm tra trạng thái video bị hủy",!1);
  const n=await this.ensureGoogleFlowViewReady(e,A);

  // 1. Kiểm tra DOM xem có video hoàn thành hoặc tiến độ % không
  try {
    const domCheck = await n.view.webContents.executeJavaScript(\`(() => {
      const vids = window.__aiforge_captured_video_urls || [];
      if (vids.length > 0) return { status: 'SUCCESS', videoUrl: vids[vids.length - 1] };

      const domVideos = Array.from(document.querySelectorAll('video, [data-video-url]'));
      for (const v of domVideos) {
        const src = v.src || v.currentSrc || v.getAttribute('data-video-url');
        if (src && src.includes('flow-content.google/video/')) return { status: 'SUCCESS', videoUrl: src };
      }

      // Kiểm tra % render trên giao diện Google Flow
      const allTextNodes = Array.from(document.querySelectorAll('[class*="card"], [class*="item"], div, span'));
      const pctEl = allTextNodes.find(el => {
        if (el.offsetWidth <= 0) return false;
        const txt = (el.innerText || '').trim();
        return /^\\\\d{1,3}%$/.test(txt);
      });
      if (pctEl) {
        const pct = parseInt(pctEl.innerText.trim().replace('%', ''), 10);
        return { status: 'GENERATING', progress: pct };
      }

      // Kiểm tra card đầu tiên đã hoàn thành (không có % và không có spinner)
      const cards = Array.from(document.querySelectorAll('[data-id], [class*="thumbnail"], [class*="card"], [class*="item"]')).filter(c => c.offsetWidth > 100 && c.offsetHeight > 80);
      if (cards.length > 0 && !cards[0].innerText.includes('%')) {
        const v = cards[0].querySelector('video');
        const src = v?.src || v?.currentSrc;
        if (src && src.includes('flow-content.google/video/')) return { status: 'SUCCESS', videoUrl: src };
      }

      return null;
    })()\`, !0);

    if (domCheck?.status === 'SUCCESS' && domCheck?.videoUrl) {
      global.__aiforge_last_video_url = domCheck.videoUrl;
      return { statusCode: 3, status: "SUCCESS" };
    }
    if (domCheck?.status === 'GENERATING') {
      return { statusCode: 2, status: "GENERATING", progress: domCheck.progress };
    }
  } catch (_) {}

  // 2. Thử RPC Boq kiểm tra trạng thái
  const a=al({params:t,rpcConfig:o}),
        s=3e4,
        i=n.view.webContents.executeJavaScript(a,!0);
  let c;
  const g=new Promise((d,l)=>{c=setTimeout(()=>{l(new p("NETWORK","Kiểm tra trạng thái video timeout (30s)",!0))},s)});
  let u;
  try{u=await Promise.race([i,g])}finally{c&&clearTimeout(c)}
  if(!u||!u.success||!u.responseText){
    if(u?.status===401||u?.status===403)throw yt(u,"Google Flow kiểm tra trạng thái video thất bại");
    return{statusCode:2,status:"GENERATING"};
  }

  // 3. Nếu RPC bị cờ UNUSUAL_ACTIVITY, duy trì trạng thái GENERATING, KHÔNG THROW LỖI làm gãy quá trình render
  if (u.responseText.includes('PUBLIC_ERROR_UNUSUAL_ACTIVITY') || u.responseText.includes('UNUSUAL_ACTIVITY')) {
    return { statusCode: 2, status: "GENERATING" };
  }

  try {
    const res = el(u.responseText);
    if (res?.status === "FAILED") {
      return { statusCode: 2, status: "GENERATING" };
    }
    return res;
  } catch (elErr) {
    return { statusCode: 2, status: "GENERATING" };
  }
}
async executeFlowVideoMediaRpc(e,t,A,o){
  if(A?.aborted)throw new p("PROVIDER_REJECTED","Lấy link video bị hủy",!1);
  const n=await this.ensureGoogleFlowViewReady(e,A);

  // 1. Kiểm tra cache
  if (global.__aiforge_last_video_url) {
    const cachedUrl = global.__aiforge_last_video_url;
    global.__aiforge_last_video_url = null;
    return { videoUrl: cachedUrl, mediaId: t.mediaId };
  }

  // 2. Kiểm tra DOM xem video URL có sẵn không
  try {
    const domVid = await n.view.webContents.executeJavaScript(\`(() => {
      const vids = window.__aiforge_captured_video_urls || [];
      if (vids.length > 0) return vids[vids.length - 1];
      const domVideos = Array.from(document.querySelectorAll('video, [data-video-url]'));
      for (const v of domVideos) {
        const src = v.src || v.currentSrc || v.getAttribute('data-video-url');
        if (src && src.includes('flow-content.google/video/')) return src;
      }
      const dlLink = document.querySelector('a[href*="flow-content.google/video/"], a[download*=".mp4"]');
      if (dlLink && dlLink.href && dlLink.href.includes('flow-content.google/video/')) return dlLink.href;
      return null;
    })()\`, !0);
    if (domVid) return { videoUrl: domVid, mediaId: t.mediaId };
  } catch (_) {}

  // 3. Fallback qua RPC Boq (sl - as29s)
  try {
    const a=sl({params:t,rpcConfig:o}),
          s=3e4,
          i=n.view.webContents.executeJavaScript(a,!0);
    let c;
    const g=new Promise((d,l)=>{c=setTimeout(()=>{l(new p("NETWORK","Lấy link video timeout (30s)",!0))},s)});
    let u;
    try{u=await Promise.race([i,g])}finally{c&&clearTimeout(c)}
    if(u?.success&&u?.responseText&&!u.responseText.includes('UNUSUAL_ACTIVITY')){
      const mediaRes = tl(u.responseText,t.mediaId);
      if (mediaRes && mediaRes.videoUrl) return mediaRes;
    }
  } catch (_) {}

  // 4. Fallback click video card đầu tiên để mở modal player
  try {
    await n.view.webContents.executeJavaScript(\`(() => {
      const cards = Array.from(document.querySelectorAll('[data-id], [class*="thumbnail"], [class*="card"], [class*="item"]')).filter(c => c.offsetWidth > 100);
      if (cards.length > 0) cards[0].click();
    })()\`, !0);
    await new Promise(r => setTimeout(r, 1500));

    const modalVid = await n.view.webContents.executeJavaScript(\`(() => {
      const v = document.querySelector('video, [class*="modal"] video, [role="dialog"] video');
      return v?.src || v?.currentSrc || null;
    })()\`, !0);
    if (modalVid && modalVid.includes('flow-content.google/video/')) {
      return { videoUrl: modalVid, mediaId: t.mediaId };
    }
  } catch (_) {}

  throw new p("PROVIDER_REJECTED","Không thể lấy thông tin video từ Google Flow",!1);
}
`;
  code = code.slice(0, execRpcStart) + cleanVideoMethods + code.slice(execUpscaleStart);
  console.log('[5/5] Replaced executeFlowVideoRpc/Status/Media with pristine in-page flow + progress protection.');
}

fs.writeFileSync(targetFile, code, 'utf8');
console.log('Successfully wrote updated index.js. New length:', code.length);
