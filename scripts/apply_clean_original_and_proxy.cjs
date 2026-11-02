const fs = require('fs');
const path = require('path');

const targetFile = path.resolve(__dirname, '../app/out/main/index.js');
let code = fs.readFileSync(targetFile, 'utf8');

console.log('Original code length:', code.length);

// 1. Cập nhật nl(r): Chuẩn hóa tuyệt đối 5 nulls cho R2V và thêm header x-same-domain: 1
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

        // 3. Chuẩn hóa Mode & ModelKey (Giữ nguyên model người dùng chọn)
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
          // Cấu trúc chuẩn 100% từ Google Flow traffic: đúng 5 nulls sau uuid element
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

        // 4. Gửi request batchexecute với đầy đủ headers chuẩn Boq
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
            'content-type': 'application/x-www-form-urlencoded;charset=UTF-8',
            'x-same-domain': '1'
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
  console.log('[1/3] Updated nl(r) with strict 5 nulls and x-same-domain: 1.');
}

// 2. Cập nhật executeFlowVideoRpc: LOẠI BỎ TOÀN BỘ FAKE ID flow-gen-..., BÁO LỖI NGAY NẾU BỊ CỜ UNUSUAL_ACTIVITY
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

  // Kiểm tra cờ UNUSUAL_ACTIVITY -> Báo lỗi lập tức cho Tris, tuyệt đối KHÔNG giả lập fake ID gây treo 80%
  if (d?.responseText && (d.responseText.includes('PUBLIC_ERROR_UNUSUAL_ACTIVITY') || d.responseText.includes('UNUSUAL_ACTIVITY'))) {
    throw new p("PROVIDER_REJECTED", "Google Flow chặn lệnh (PUBLIC_ERROR_UNUSUAL_ACTIVITY). IP mạng hiện tại bị Google nghi ngờ bot, cần đổi IP mạng hoặc gắn Proxy tĩnh vào tài khoản.", !1);
  }

  if (!d?.success || !d?.responseText) {
    throw yt(d, d?.error || \`Google Flow Video RPC thất bại với status \${d?.status}\`);
  }

  // Parse Google UUID thật từ response Boq
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

      // Kiểm tra % render trên giao diện Google Flow (ví dụ 34%, 78%)
      const allTextNodes = Array.from(document.querySelectorAll('*'));
      for (const el of allTextNodes) {
        if (el.offsetWidth <= 0 || el.children.length > 0) continue;
        const txt = (el.innerText || el.textContent || '').trim();
        const m = txt.match(/^(\\\\d{1,3})%$/);
        if (m) {
          const pct = parseInt(m[1], 10);
          if (pct >= 100) return { status: 'SUCCESS' };
          return { status: 'GENERATING', progress: pct };
        }
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

  // 2. Thử RPC Boq jwpduf kiểm tra trạng thái
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

  // 3. Phân tích kết quả từ Boq
  try {
    const res = el(u.responseText);
    if (res?.status === "FAILED") {
      const rawText = JSON.stringify(res.raw || '');
      if (rawText.includes('Media not found')) {
        throw new p("PROVIDER_REJECTED", "Google Flow: Video không tồn tại hoặc đã bị hủy (Media not found).", !1);
      }
      return { statusCode: 4, status: "FAILED" };
    }
    return res;
  } catch (elErr) {
    if (elErr.message?.includes('Media not found')) throw elErr;
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
  console.log('[2/3] Replaced executeFlowVideoRpc: removed fake ID, fail-fast on UNUSUAL_ACTIVITY.');
}

// 3. Tích hợp hỗ trợ Proxy tĩnh vào getOrCreateView(e)
const viewStart = code.indexOf('getOrCreateView(e){const t=this.views.get(e.accountId);if(t)return t.providerId=e.providerId,t;');
if (viewStart !== -1) {
  const insertMarker = 'const A=new Ji({webPreferences:{partition:e.partition,contextIsolation:!0,nodeIntegration:!1,sandbox:!0,devTools:!0,backgroundThrottling:!1}});';
  const markerIdx = code.indexOf(insertMarker, viewStart);
  if (markerIdx !== -1) {
    const proxyInject = `
  // 🌟 HỖ TRỢ GẮN PROXY TĨNH CHO VIEW / TÀI KHOẢN GOOGLE FLOW 🌟
  try {
    const ses = Re.fromPartition(e.partition);
    const proxyConfigFile = L(F.getPath("userData"), "proxy_config.json");
    const localProxyFile = L(F.getAppPath(), "..", "proxy_config.json");
    let proxyRules = '';
    let proxyAuth = null;
    
    for (const pPath of [proxyConfigFile, localProxyFile]) {
      if (nodeFs.existsSync(pPath)) {
        try {
          const cfg = JSON.parse(nodeFs.readFileSync(pPath, 'utf8'));
          if (cfg && (cfg.proxy || cfg.proxyRules || cfg.http || cfg.socks5)) {
            proxyRules = cfg.proxy || cfg.proxyRules || cfg.http || cfg.socks5;
            if (cfg.username && cfg.password) proxyAuth = { username: cfg.username, password: cfg.password };
            break;
          }
        } catch (_) {}
      }
    }
    
    if (proxyRules) {
      console.log('[Proxy Guard] Kích hoạt Proxy tĩnh cho partition ' + e.partition + ': ' + proxyRules);
      ses.setProxy({ proxyRules }).catch(err => console.error('[Proxy Guard] Lỗi gán proxy:', err));
      if (proxyAuth) {
        ses.on('login', (event, authenticationResponseDetails, authInfo, callback) => {
          if (authInfo.isProxy) {
            callback(proxyAuth.username, proxyAuth.password);
          }
        });
      }
    }
  } catch(proxyErr) {
    console.warn('[Proxy Guard] Ngoại lệ cấu hình proxy:', proxyErr.message);
  }
`;
    code = code.slice(0, markerIdx) + proxyInject + code.slice(markerIdx);
    console.log('[3/3] Injected Static Proxy Guard into getOrCreateView.');
  }
}

fs.writeFileSync(targetFile, code, 'utf8');
console.log('Successfully written updated index.js. New length:', code.length);
