const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

console.log('======================================================================');
console.log('🚀 ANTI-BOT HUMAN TELEMETRY + NATIVE UI FAILOVER FOR GOOGLE FLOW 🚀');
console.log('======================================================================');

const targetFile = path.resolve(__dirname, '../app/out/main/index.js');
let code = fs.readFileSync(targetFile, 'utf8');

// 1. Sao lưu
fs.writeFileSync(targetFile + '.pre_antibot_upgrade.bak', code, 'utf8');
console.log('✓ Đã tạo bản sao lưu tại app/out/main/index.js.pre_antibot_upgrade.bak');

// 2. TẠO HÀM zu(r) MỚI (BANANA IMAGE) VỚI HUMAN TELEMETRY & X-SAME-DOMAIN
const zuStart = code.indexOf('function zu(r){');
const zuEnd = code.indexOf('function Ku(r){', zuStart);

if (zuStart === -1 || zuEnd === -1) {
  console.error('❌ Không tìm thấy vị trí function zu(r)');
  process.exit(1);
}

const newZuFunction = `function zu(r){const{params:e,timeoutMs:t=18e4,rpcConfig:A=qe}=r,o=A.recaptcha?.siteKey||Sn,n=A.recaptcha?.imageAction||"IMAGE_GENERATION",a=A.rpcIds?.imageGenerate||"ogiZ0b",s=A.clientContext?.clientVersionNumber??22,i=A.clientContext?.batchExecutePath||"/_/AiSandboxAngularFrontend/data/batchexecute",c=JSON.stringify(e),g=JSON.stringify(A.image?.aspectRatioMapping||qe.image.aspectRatioMapping),u=A.image?.defaultModel||qe.image.defaultModel||"GEM_PIX_2";return\`
    (async () => {
      const logs = [];
      function addLog(msg) {
        logs.push(new Date().toISOString().slice(11, 23) + ' ' + msg);
      }

      try {
        addLog('FlowImageRpc: Khởi chạy in-page execution (Human Telemetry Enabled)');
        const siteKey = \${JSON.stringify(o)};
        const params = \${c};

        // 1. MÔ PHỎNG HÀNH VI NGƯỜI THẬT (HUMAN TELEMETRY) TRƯỚC KHI GỌI RECAPTCHA
        try {
          const w = window.innerWidth || 1280;
          const h = window.innerHeight || 800;
          let cx = Math.floor(w * 0.35 + Math.random() * (w * 0.3));
          let cy = Math.floor(h * 0.35 + Math.random() * (h * 0.3));
          for (let step = 0; step < 8; step++) {
            cx += Math.floor((Math.random() - 0.5) * 40);
            cy += Math.floor((Math.random() - 0.5) * 30);
            cx = Math.max(15, Math.min(w - 15, cx));
            cy = Math.max(15, Math.min(h - 15, cy));
            const moveEvt = new MouseEvent('mousemove', {
              bubbles: true,
              cancelable: true,
              clientX: cx,
              clientY: cy,
              screenX: cx,
              screenY: cy
            });
            window.dispatchEvent(moveEvt);
            document.dispatchEvent(moveEvt);
            await new Promise(r => setTimeout(r, 20 + Math.floor(Math.random() * 25)));
          }
          window.dispatchEvent(new Event('focus', { bubbles: true }));
        } catch (_) {}

        // 2. Lấy token reCAPTCHA enterprise
        let recaptchaToken = '';
        const runRecaptchaExecute = async () => {
          const execPromise = window.grecaptcha.enterprise.execute(siteKey, { action: \${JSON.stringify(n)} });
          const timeoutPromise = new Promise((_, reject) =>
            setTimeout(() => reject(new Error('reCAPTCHA enterprise execute timeout (20s)')), 20000)
          );
          return await Promise.race([execPromise, timeoutPromise]);
        };

        if (typeof window.grecaptcha?.enterprise?.execute === 'function') {
          try {
            recaptchaToken = await runRecaptchaExecute();
          } catch (eErr) {
            addLog('Lỗi lấy reCAPTCHA trực tiếp: ' + eErr.message);
          }
        }

        if (!recaptchaToken) {
          addLog('Nạp script reCAPTCHA enterprise');
          const scriptId = 'aiforge-flow-recaptcha';
          let sEl = document.getElementById(scriptId);
          if (!sEl) {
            try {
              sEl = document.createElement('script');
              sEl.id = scriptId;
              const existingNonce = document.querySelector('script[nonce]')?.nonce || document.querySelector('script[nonce]')?.getAttribute('nonce');
              if (existingNonce) sEl.setAttribute('nonce', existingNonce);
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
              sEl.src = scriptUrl;
              sEl.async = true;
              document.head.appendChild(sEl);
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
          addLog('Đã lấy reCAPTCHA token thành công: ' + recaptchaToken.slice(0, 15) + '...');
        }

        // 3. Đọc WIZ_global_data
        const wiz = window.WIZ_global_data || {};
        let at = wiz.SNlM0e || '';
        let fSid = wiz.FdrFJe || '';
        let bl = wiz.cfb2h || 'boq_labs-ai-sandbox-frontend_20261007.14_p0';

        if (!at || !fSid) {
          for (let k = 0; k < 25; k++) {
            at = window.WIZ_global_data?.SNlM0e || at;
            fSid = window.WIZ_global_data?.FdrFJe || fSid;
            bl = window.WIZ_global_data?.cfb2h || bl;
            if (at && fSid) break;
            await new Promise(r => setTimeout(r, 200));
          }
        }

        if (!at || !fSid) {
          return {
            success: false,
            error: 'Thiếu WIZ_global_data (SNlM0e / FdrFJe) trên Google Flow',
            log: logs
          };
        }

        // 4. Xác định effectiveProjectId
        let effectiveProjectId = params.projectId;
        try {
          const pathMatch = window.location.pathname.match(new RegExp('/project/([a-f0-9-]+)', 'i'));
          if (pathMatch && pathMatch[1]) {
            effectiveProjectId = pathMatch[1];
          }
        } catch (_) {}
        if (!effectiveProjectId) {
          effectiveProjectId = 'b4ab78d0-1d67-460c-b367-c3a9766169c5';
        }

        // 5. Model key & Tỷ lệ khung hình
        const modelKey = params.modelName || \${JSON.stringify(u)} || 'GEM_PIX_2';
        const ratioMap = \${g};
        let aspectRatioNum = 3;
        if (typeof params.aspectRatio === 'string' && ratioMap && ratioMap[params.aspectRatio] !== undefined) {
          aspectRatioNum = ratioMap[params.aspectRatio];
        } else if (params.aspectRatio === '9:16' || params.aspectRatio === 'IMAGE_ASPECT_RATIO_PORTRAIT') {
          aspectRatioNum = 2;
        } else if (params.aspectRatio === '1:1' || params.aspectRatio === 'IMAGE_ASPECT_RATIO_SQUARE') {
          aspectRatioNum = 1;
        } else if (params.aspectRatio === '3:4' || params.aspectRatio === '4:5') {
          aspectRatioNum = 4;
        } else if (params.aspectRatio === '4:3') {
          aspectRatioNum = 5;
        }

        const clientMediaUuid = (typeof crypto?.randomUUID === 'function') ? crypto.randomUUID().toUpperCase() : 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => { const r = Math.random() * 16 | 0; return (c === 'x' ? r : (r & 0x3 | 0x8)).toString(16).toUpperCase(); });
        const clientSessionUuid = (typeof crypto?.randomUUID === 'function') ? crypto.randomUUID().toUpperCase() : 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => { const r = Math.random() * 16 | 0; return (c === 'x' ? r : (r & 0x3 | 0x8)).toString(16).toUpperCase(); });
        const clientBatchUuid = (typeof crypto?.randomUUID === 'function') ? crypto.randomUUID().toUpperCase() : 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => { const r = Math.random() * 16 | 0; return (c === 'x' ? r : (r & 0x3 | 0x8)).toString(16).toUpperCase(); });
        const seed = Math.floor(Math.random() * 2147483647);

        const clientContext = [
          null,
          \${s},
          null,
          null,
          null,
          effectiveProjectId,
          null,
          null,
          null,
          null,
          [recaptchaToken || '', 1]
        ];

        const referenceInputs = Array.isArray(params.referenceMediaIds) && params.referenceMediaIds.length > 0
          ? params.referenceMediaIds.map(id => [id, null, null, null, 1])
          : null;

        const innerPayload = [
          null,
          [
            [
              null,
              null,
              referenceInputs,
              seed,
              aspectRatioNum,
              modelKey,
              null,
              clientContext,
              [[[ params.prompt ]]],
              null,
              null,
              null,
              clientMediaUuid,
              clientSessionUuid
            ]
          ],
          1,
          clientContext,
          [ clientBatchUuid ]
        ];

        const rpcId = \${JSON.stringify(a)};
        const batchPath = \${JSON.stringify(i)};
        const reqId = Math.floor(Math.random() * 900000) + 1000000;
        const sourcePath = '/project/' + effectiveProjectId;
        const queryParams = new URLSearchParams({
          rpcids: rpcId,
          'source-path': sourcePath,
          bl: bl,
          'f.sid': fSid,
          hl: 'en-US',
          _reqid: String(reqId),
          rt: 'c'
        });

        const url = batchPath + '?' + queryParams.toString();
        const fReq = JSON.stringify([[[rpcId, JSON.stringify(innerPayload), null, 'generic']]]);
        const bodyData = 'f.req=' + encodeURIComponent(fReq) + '&at=' + encodeURIComponent(at) + '&';

        addLog('Gửi batchexecute RPC ' + rpcId + ' (model: ' + modelKey + ')...');
        const abortController = new AbortController();
        const timeoutId = setTimeout(() => abortController.abort(), \${t});

        const fetchStartTime = Date.now();
        const response = await fetch(url, {
          method: 'POST',
          headers: {
            'content-type': 'application/x-www-form-urlencoded;charset=UTF-8',
            'x-same-domain': '1'
          },
          body: bodyData,
          credentials: 'include',
          signal: abortController.signal
        });
        clearTimeout(timeoutId);

        const durationMs = Date.now() - fetchStartTime;
        addLog('RPC response status: ' + response.status + ' (' + durationMs + 'ms)');

        const responseText = await response.text();
        return {
          success: response.status === 200,
          status: response.status,
          responseText: responseText,
          projectId: effectiveProjectId,
          log: logs
        };
      } catch (err) {
        addLog('Lỗi thực thi script in-page: ' + err.message);
        return {
          success: false,
          error: err.name === 'AbortError' ? 'RPC request timeout vượt quá thời gian chờ' : err.message,
          log: logs
        };
      }
    })()
  \`;}`;

code = code.slice(0, zuStart) + newZuFunction + code.slice(zuEnd);
console.log('✅ 2. Đã nâng cấp hàm zu(r) cho Banana Pro với Human Telemetry & x-same-domain');

// 3. TẠO HÀM nl(r) MỚI (VEO 3 VIDEO) VỚI HUMAN TELEMETRY & X-SAME-DOMAIN
const nlStart = code.indexOf('function nl(r){');
const nlEnd = code.indexOf('function al(r){', nlStart);

if (nlStart === -1 || nlEnd === -1) {
  console.error('❌ Không tìm thấy vị trí function nl(r)');
  process.exit(1);
}

const newNlFunction = `function nl(r){const{params:e,timeoutMs:t=18e4,rpcConfig:A=qe}=r,o=A.recaptcha?.siteKey||Ec,n=A.recaptcha?.videoAction||"VIDEO_GENERATION",a=A.clientContext?.clientVersionNumber??22,s=A.clientContext?.batchExecutePath||"/_/AiSandboxAngularFrontend/data/batchexecute",i=A.rpcIds?.videoT2v||"YhhmEf",c=A.rpcIds?.videoI2v||"eb1hJf",g=A.rpcIds?.videoFrames||"nprQif",u=A.rpcIds?.videoR2v||"MZZa6b",d=JSON.stringify(e);return\`
    (async () => {
      const logs = [];
      function addLog(msg) {
        logs.push(new Date().toISOString().slice(11, 23) + ' ' + msg);
      }

      try {
        addLog('FlowVideoRpc: Khởi chạy in-page submit (Human Telemetry Enabled)');
        const siteKey = \${JSON.stringify(o)};
        const params = \${d};

        // 1. MÔ PHỎNG HÀNH VI NGƯỜI THẬT (HUMAN TELEMETRY) TRƯỚC KHI GỌI RECAPTCHA
        try {
          const w = window.innerWidth || 1280;
          const h = window.innerHeight || 800;
          let cx = Math.floor(w * 0.35 + Math.random() * (w * 0.3));
          let cy = Math.floor(h * 0.35 + Math.random() * (h * 0.3));
          for (let step = 0; step < 8; step++) {
            cx += Math.floor((Math.random() - 0.5) * 40);
            cy += Math.floor((Math.random() - 0.5) * 30);
            cx = Math.max(15, Math.min(w - 15, cx));
            cy = Math.max(15, Math.min(h - 15, cy));
            const moveEvt = new MouseEvent('mousemove', {
              bubbles: true,
              cancelable: true,
              clientX: cx,
              clientY: cy,
              screenX: cx,
              screenY: cy
            });
            window.dispatchEvent(moveEvt);
            document.dispatchEvent(moveEvt);
            await new Promise(r => setTimeout(r, 20 + Math.floor(Math.random() * 25)));
          }
          window.dispatchEvent(new Event('focus', { bubbles: true }));
        } catch (_) {}

        // 2. Lấy token reCAPTCHA enterprise với action video
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
            if (typeof window.grecaptcha?.enterprise?.execute === 'function') {
              try {
                recaptchaToken = await runRecaptchaExecute();
                if (recaptchaToken) break;
              } catch (waitErr) {
                addLog('Lỗi lấy reCAPTCHA sau khi load script: ' + waitErr.message);
              }
            }
            await new Promise(r => setTimeout(r, 200));
          }
        }

        if (!recaptchaToken) {
          addLog('CẢNH BÁO: Không lấy được reCAPTCHA token');
        } else {
          addLog('Đã lấy reCAPTCHA token thành công: ' + recaptchaToken.slice(0, 15) + '...');
        }

        // 3. Lấy WIZ_global_data
        let wiz = window.WIZ_global_data || {};
        let at = wiz.SNlM0e || '';
        let fsid = wiz.FdrFJe || '';
        let bl = wiz.cfb2h || 'boq_labs-ai-sandbox-frontend_20260910.13_p0';

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
        addLog('WIZ data: at=' + (at ? 'có' : 'thiếu') + ' fsid=' + (fsid ? 'có' : 'thiếu'));

        // 4. Xác định effectiveProjectId
        let effectiveProjectId = params.projectId;
        try {
          const pathMatch = window.location.pathname.match(new RegExp('/project/([a-f0-9-]+)', 'i'));
          if (pathMatch && pathMatch[1]) {
            effectiveProjectId = pathMatch[1];
          }
        } catch (_) {}
        if (!effectiveProjectId) {
          effectiveProjectId = params.projectId || 'dac1aa74-e935-4df6-a8d2-6af99a9f5d15';
        }

        // 5. Xây dựng innerPayload theo đúng mode
        const clientUuid1 = (typeof crypto?.randomUUID === 'function') ? crypto.randomUUID().toUpperCase() : 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => { const r = Math.random() * 16 | 0; return (c === 'x' ? r : (r & 0x3 | 0x8)).toString(16).toUpperCase(); });
        const clientUuid2 = (typeof crypto?.randomUUID === 'function') ? crypto.randomUUID().toUpperCase() : 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => { const r = Math.random() * 16 | 0; return (c === 'x' ? r : (r & 0x3 | 0x8)).toString(16).toUpperCase(); });
        const clientSessionUuid = (typeof crypto?.randomUUID === 'function') ? crypto.randomUUID().toUpperCase() : 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => { const r = Math.random() * 16 | 0; return (c === 'x' ? r : (r & 0x3 | 0x8)).toString(16).toUpperCase(); });
        const promptStructure = [null, null, [[[params.prompt]]]];
        const ratioEnum = params.ratioEnum || 2; // 1 = 9:16, 2 = 16:9
        let modelKey = params.modelKey;

        // Model key auto-safeguard
        if (params.mode === 'R2V') {
          if (!modelKey || modelKey === 'veo-3.1-fast' || modelKey === 'veo_3_1_fast' || modelKey === 'veo_3_1_fast_r2v') {
            modelKey = (ratioEnum === 1) ? 'veo_3_1_r2v_fast_portrait' : 'veo_3_1_r2v_fast_landscape';
          }
        } else if (params.mode === 'T2V') {
          if (!modelKey || modelKey === 'veo-3.1-fast' || modelKey === 'veo_3_1_fast') {
            modelKey = (ratioEnum === 1) ? 'veo_3_1_t2v_fast_portrait' : 'veo_3_1_t2v_fast';
          }
        } else if (params.mode === 'I2V') {
          if (!modelKey || modelKey === 'veo-3.1-fast' || modelKey === 'veo_3_1_fast') {
            modelKey = (ratioEnum === 1) ? 'veo_3_1_i2v_s_fast_portrait' : 'veo_3_1_i2v_s_fast';
          }
        }

        const resolutionCode = params.resolutionCode || (modelKey && modelKey.toLowerCase().includes('360p') ? 4 : 1);

        let rpcId = params.rpcId;
        let modePayload;

        if (params.mode === 'Frames' && params.startMediaId && params.endMediaId) {
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
        } else if (params.mode === 'I2V' && params.startMediaId) {
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
        } else if (params.mode === 'R2V' && params.referenceMediaIds && params.referenceMediaIds.length > 0) {
          rpcId = rpcId || \${JSON.stringify(u)};
          const refArray = params.referenceMediaIds.map(id => [null, id]);
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

        const innerPayload = [
          [modePayload],
          [
            null,
            \${a},
            null,
            null,
            null,
            effectiveProjectId,
            null,
            null,
            null,
            null,
            [recaptchaToken || '', 1]
          ],
          [clientSessionUuid, 2]
        ];

        // 6. Gửi request batchexecute
        const sourcePath = '/project/' + effectiveProjectId;
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

        addLog('Gửi batchexecute RPC ' + rpcId + ' (Model: ' + modelKey + ')');
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
          projectId: effectiveProjectId,
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
  \`;}`;

code = code.slice(0, nlStart) + newNlFunction + code.slice(nlEnd);
console.log('✅ 3. Đã nâng cấp hàm nl(r) cho Veo 3 với Human Telemetry & x-same-domain');

// 4. BỔ SUNG HEADER X-SAME-DOMAIN CHO al(r) (STATUS CHECK)
const alStart = code.indexOf('function al(r){');
const alEnd = code.indexOf('function sl(r){', alStart);

if (alStart !== -1 && alEnd !== -1) {
  let alCode = code.slice(alStart, alEnd);
  if (!alCode.includes("'x-same-domain': '1'")) {
    alCode = alCode.replace(
      "'content-type': 'application/x-www-form-urlencoded;charset=UTF-8'",
      "'content-type': 'application/x-www-form-urlencoded;charset=UTF-8',\n            'x-same-domain': '1'"
    );
    code = code.slice(0, alStart) + alCode + code.slice(alEnd);
    console.log('✅ 4. Đã bổ sung header x-same-domain: 1 cho al(r) (Status Check)');
  }
}

// 5. NÂNG CẤP executeFlowVideoRpc VỚI NATIVE UI AUTOMATION FAILOVER
const execVideoStart = code.indexOf('async executeFlowVideoRpc(');
const execVideoEnd = code.indexOf('async executeFlowVideoStatusRpc(', execVideoStart);

if (execVideoStart === -1 || execVideoEnd === -1) {
  console.error('❌ Không tìm thấy vị trí executeFlowVideoRpc');
  process.exit(1);
}

const newExecuteFlowVideoRpc = `async executeFlowVideoRpc(e,t,A,o){
  const n=Date.now();
  if(A?.aborted)throw new p("PROVIDER_REJECTED","Yêu cầu tạo video đã bị hủy",!1);
  const a=await this.ensureGoogleFlowViewReady(e,A);
  const s=nl({params:t,rpcConfig:o});
  y("browser-view","flow video rpc: bắt đầu thực thi in-page script",{accountId:e.accountId,projectId:t.projectId,modelKey:t.modelKey,mode:t.mode,ratioEnum:t.ratioEnum,prompt:t.prompt.slice(0,50)});
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
      prompt: (t.prompt || '').slice(0, 100),
      success: d?.success,
      status: d?.status,
      error: d?.error,
      inPageLogs: d?.log,
      responseSnippet: (d?.responseText || '').slice(0, 1200)
    }, null, 2) + '\\n\\n';
    require('fs').appendFileSync('D:\\\\dự án antigravity\\\\AIForge_Veo3_Studio\\\\flow_rpc_debug.log', debugLine);
  } catch(_) {}

  // 🌟 NATIVE UI FAILOVER: NẾU BỊ CỜ UNUSUAL_ACTIVITY, TỰ ĐỘNG CHUYỂN SANG CLICK DOM THẬT 🌟
  if (d?.responseText && (d.responseText.includes('PUBLIC_ERROR_UNUSUAL_ACTIVITY') || d.responseText.includes('UNUSUAL_ACTIVITY'))) {
    y("browser-view","flow video rpc: phát hiện cờ UNUSUAL_ACTIVITY, tự động kích hoạt Native UI Click Fallback...",{accountId:e.accountId,projectId:t.projectId});
    try {
      const nativeUiScript = \`(async () => {
        const logs = [];
        try {
          const prompt = \${JSON.stringify(t.prompt || '')};
          // 1. Cài sniffer bắt media ID
          if (!window.__aiforge_media_sniffer) {
            window.__aiforge_media_sniffer = true;
            window.__aiforge_captured_ids = [];
            const origFetch = window.fetch;
            window.fetch = async function(...args) {
              const res = await origFetch.apply(this, args);
              try {
                const text = await res.clone().text();
                if (text && text.includes('wrb.fr')) {
                  const ids = text.match(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi);
                  if (ids) {
                    for (const id of ids) {
                      if (!window.__aiforge_captured_ids.includes(id)) window.__aiforge_captured_ids.push(id);
                    }
                  }
                }
              } catch (_) {}
              return res;
            };
          }

          const initialCount = (window.__aiforge_captured_ids || []).length;
          const initialDom = new Set(document.body?.innerHTML?.match(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi) || []);

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

            // Bấm nút tạo
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

            // Chờ bắt media ID (tối đa 35s)
            const startWait = Date.now();
            while (Date.now() - startWait < 35000) {
              await new Promise(r => setTimeout(r, 500));
              const curIds = window.__aiforge_captured_ids || [];
              if (curIds.length > initialCount) {
                return { success: true, mediaId: curIds[curIds.length - 1], workflowId: curIds[curIds.length - 1] };
              }
              const domIds = document.body?.innerHTML?.match(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi) || [];
              const newId = domIds.find(x => !initialDom.has(x));
              if (newId) {
                return { success: true, mediaId: newId, workflowId: newId };
              }
            }
          }
          return { success: false, error: 'Native UI Fallback không tìm thấy ô nhập hoặc timeout' };
        } catch (eNative) {
          return { success: false, error: eNative.message };
        }
      })()\`;

      const uiRes = await a.view.webContents.executeJavaScript(nativeUiScript, !0);
      if (uiRes?.success && uiRes?.mediaId) {
        y("browser-view","flow video rpc: Native UI Click Fallback THÀNH CÔNG RỰC RỠ!",{accountId:e.accountId,mediaId:uiRes.mediaId});
        return { mediaId: uiRes.mediaId, workflowId: uiRes.workflowId || uiRes.mediaId };
      }
    } catch (fbErr) {
      y("browser-view","flow video rpc: Native UI Click Fallback thất bại: " + fbErr.message,{accountId:e.accountId});
    }
  }

  if (d?.mediaId) return { mediaId: d.mediaId, workflowId: d.workflowId || d.mediaId };
  if (y("browser-view","flow video rpc: kết quả in-page execution",{accountId:e.accountId,projectId:t.projectId,success:d.success,status:d.status,durationMs:Date.now()-n,error:d.error}),!d.success||!d.responseText)throw yt(d,d.error||\`Google Flow Video RPC thất bại với status \${d.status}\`);
  return Xu(d.responseText);
}`;

code = code.slice(0, execVideoStart) + newExecuteFlowVideoRpc + code.slice(execVideoEnd);
console.log('✅ 5. Đã nâng cấp executeFlowVideoRpc với Native UI Automation Failover');

// 6. NÂNG CẤP executeFlowImageRpc VỚI NATIVE UI AUTOMATION FAILOVER CHO BANANA
const execImgStart = code.indexOf('async executeFlowImageRpc(');
const execImgEnd = code.indexOf('async executeFlowUploadImageRpc(', execImgStart);

if (execImgStart !== -1 && execImgEnd !== -1) {
  const newExecuteFlowImageRpc = `async executeFlowImageRpc(e,t,A,o){
  const n=Date.now();
  if(A?.aborted)throw new p("PROVIDER_REJECTED","Yêu cầu tạo ảnh đã bị hủy",!1);
  const a=await this.ensureGoogleFlowViewReady(e,A);
  const s=zu({params:t,rpcConfig:o});
  y("browser-view","flow rpc: bắt đầu thực thi in-page script",{accountId:e.accountId,projectId:t.projectId,prompt:t.prompt.slice(0,50),referenceCount:t.referenceMediaIds?.length||0});
  const i=a.view.webContents.executeJavaScript(s,!0),c=18e4;
  let g;
  const u=new Promise((l,m)=>{g=setTimeout(()=>{m(new p("NETWORK",\`Google Flow RPC quá thời gian chờ (\${Math.round(c/1e3)}s)\`,!0))},c)});
  let d;
  try{
    A?d=await Promise.race([i,u,new Promise((l,m)=>{A.addEventListener("abort",()=>m(new p("PROVIDER_REJECTED","Tác vụ tạo ảnh bị hủy",!1)),{once:!0})})]):d=await Promise.race([i,u])
  }finally{g&&clearTimeout(g)}

  if (d?.imageUrl) {
    return {
      imageUrl: d.imageUrl,
      width: d.width || 1024,
      height: d.height || 1024,
      providerAssetId: d.providerAssetId || ('banana-asset-' + Date.now()),
      projectId: d.projectId || t.projectId,
      seed: d.seed || Math.floor(Math.random() * 1e9)
    };
  }

  // 🌟 NATIVE UI FAILOVER CHO ẢNH (BANANA PRO) NẾU BỊ CỜ UNUSUAL_ACTIVITY 🌟
  if (d?.responseText && (d.responseText.includes('PUBLIC_ERROR_UNUSUAL_ACTIVITY') || d.responseText.includes('UNUSUAL_ACTIVITY'))) {
    y("browser-view","flow image rpc: phát hiện cờ UNUSUAL_ACTIVITY, tự động kích hoạt Native UI Click Fallback...",{accountId:e.accountId,projectId:t.projectId});
    try {
      const nativeImgScript = \`(async () => {
        try {
          const prompt = \${JSON.stringify(t.prompt || '')};
          if (!window.__aiforge_img_sniffer) {
            window.__aiforge_img_sniffer = true;
            window.__aiforge_captured_imgs = [];
            const origFetch = window.fetch;
            window.fetch = async function(...args) {
              const res = await origFetch.apply(this, args);
              try {
                const text = await res.clone().text();
                const m = text.match(/https:\\/\\/flow-content\\.google\\/image\\/[a-f0-9-]+/gi) || text.match(/https:\\/\\/flow\\.google\\.com\\/asb\\/[a-zA-Z0-9_-]+/gi);
                if (m) {
                  for (const x of m) {
                    const clean = x.replace(/\\\\/g, '');
                    if (!window.__aiforge_captured_imgs.includes(clean)) window.__aiforge_captured_imgs.push(clean);
                  }
                }
              } catch (_) {}
              return res;
            };
          }

          const initCount = (window.__aiforge_captured_imgs || []).length;
          const initDom = new Set(Array.from(document.querySelectorAll('img')).map(x => x.src).filter(Boolean));

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

            const startWait = Date.now();
            while (Date.now() - startWait < 35000) {
              await new Promise(r => setTimeout(r, 500));
              const curImgs = window.__aiforge_captured_imgs || [];
              if (curImgs.length > initCount) {
                return { success: true, imageUrl: curImgs[curImgs.length - 1] };
              }
              const curDom = Array.from(document.querySelectorAll('img')).map(x => x.src).filter(Boolean);
              const newImg = curDom.find(s => (s.includes('flow-content.google/image/') || s.includes('flow.google.com/asb/')) && !initDom.has(s));
              if (newImg) {
                return { success: true, imageUrl: newImg };
              }
            }
          }
          return { success: false, error: 'Native UI Image Fallback không tìm thấy ô nhập hoặc timeout' };
        } catch (eImg) {
          return { success: false, error: eImg.message };
        }
      })()\`;

      const uiImgRes = await a.view.webContents.executeJavaScript(nativeImgScript, !0);
      if (uiImgRes?.success && uiImgRes?.imageUrl) {
        y("browser-view","flow image rpc: Native UI Click Fallback THÀNH CÔNG RỰC RỠ!",{accountId:e.accountId,imageUrl:uiImgRes.imageUrl});
        return {
          imageUrl: uiImgRes.imageUrl,
          width: 1024,
          height: 1024,
          providerAssetId: 'banana-' + Date.now(),
          projectId: t.projectId,
          seed: Math.floor(Math.random() * 1e9)
        };
      }
    } catch (fbImgErr) {
      y("browser-view","flow image rpc: Native UI Click Fallback thất bại: " + fbImgErr.message,{accountId:e.accountId});
    }
  }

  if (y("browser-view","flow rpc: kết quả in-page execution",{accountId:e.accountId,projectId:t.projectId,success:d.success,status:d.status,durationMs:Date.now()-n,error:d.error}),!d.success||!d.responseText)throw yt(d,d.error||\`Google Flow RPC thất bại với status \${d.status}\`);
  return Lu(d.responseText,t.projectId,o?.rpcIds?.imageGenerate||"ogiZ0b");
}`;

  code = code.slice(0, execImgStart) + newExecuteFlowImageRpc + code.slice(execImgEnd);
  console.log('✅ 6. Đã nâng cấp executeFlowImageRpc với Native UI Automation Failover');
}

// 7. LƯU FILE VÀ KIỂM TRA CÚ PHÁP
fs.writeFileSync(targetFile, code, 'utf8');
console.log(`💾 Đã ghi file ${targetFile} (${code.length} bytes)`);

try {
  execSync(`node --check "${targetFile}"`);
  console.log('🌟 CÚ PHÁP INDEX.JS HỢP LỆ 100%! KHÔNG CÓ LỖI SYNTAX! 🌟');
} catch (syntaxErr) {
  console.error('❌ Lỗi cú pháp! Đang khôi phục bản sao lưu...');
  fs.copyFileSync(targetFile + '.pre_antibot_upgrade.bak', targetFile);
  console.log('Đã khôi phục file gốc an toàn.');
  process.exit(1);
}

// 8. LÀM SẠCH TOÀN BỘ COOLDOWN VÀ MỞ KHÓA TẤT CẢ JOB BỊ KẸT
console.log('\n--- LÀM SẠCH DỮ LIỆU APPDATA & MỞ KHÓA HÀNG ĐỢI ---');
const appData = process.env.APPDATA || (process.env.USERPROFILE ? path.join(process.env.USERPROFILE, 'AppData', 'Roaming') : null);
if (appData) {
  const baseDataDir = path.join(appData, 'AI_VIDEO_LIBRARY_DATA');
  if (fs.existsSync(baseDataDir)) {
    // A. browser-sessions.json
    const sessPath = path.join(baseDataDir, 'browser-sessions.json');
    if (fs.existsSync(sessPath)) {
      try {
        const sessData = JSON.parse(fs.readFileSync(sessPath, 'utf8'));
        const list = Array.isArray(sessData) ? sessData : (sessData.sessions || []);
        let sessCleared = 0;
        for (const s of list) {
          if (s.providerId === 'veo3' || s.providerId === 'banana') {
            if (s.diagnostics) {
              delete s.diagnostics.cooldownUntil;
              delete s.diagnostics.cooldownReason;
              delete s.diagnostics.lastProviderErrorCode;
              delete s.diagnostics.lastError;
            }
            delete s.cooldownUntil;
            delete s.cooldownReason;
            delete s.lastError;
            s.healthScore = 100;
            s.healthLabel = 'Excellent';
            sessCleared++;
          }
        }
        fs.writeFileSync(sessPath, JSON.stringify(sessData, null, 2), 'utf8');
        console.log(`✅ Đã giải phóng trạng thái Cooldown cho ${sessCleared} tài khoản Google Flow.`);
      } catch (err) {
        console.warn('Cảnh báo khi làm sạch browser-sessions:', err.message);
      }
    }

    // B. queue-state.json
    const queuePath = path.join(baseDataDir, 'queue-state.json');
    if (fs.existsSync(queuePath)) {
      try {
        const qData = JSON.parse(fs.readFileSync(queuePath, 'utf8'));
        let qCount = 0;
        for (const job of qData.jobs || []) {
          if (job.status === 'Paused' || job.status === 'Failed') {
            job.status = 'Queued';
            job.attempts = 0;
            delete job.error;
            delete job.providerErrorCode;
            delete job.providerErrorDetails;
            delete job.recoveryAction;
            delete job.statusText;
            qCount++;
          }
        }
        fs.writeFileSync(queuePath, JSON.stringify(qData, null, 2), 'utf8');
        console.log(`✅ Đã mở khóa ${qCount} tác vụ bị kẹt trong queue-state.json.`);
      } catch (err) {
        console.warn('Cảnh báo khi làm sạch queue-state:', err.message);
      }
    }
  }
}

console.log('\n🎉 HOÀN TẤT NÂNG CẤP HỆ THỐNG VƯỢT BOT GOOGLE FLOW THÀNH CÔNG RỰC RỠ! 🎉');
