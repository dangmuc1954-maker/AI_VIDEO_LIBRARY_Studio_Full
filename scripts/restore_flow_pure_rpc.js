const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const targetFile = path.resolve(__dirname, '../app/out/main/index.js');
let code = fs.readFileSync(targetFile, 'utf8');

console.log('Target file size:', (code.length / 1024).toFixed(1), 'KB');

// 1. Build the new clean, robust function nl(r)
const newNlFunction = `function nl(r){const{params:e,timeoutMs:t=18e4,rpcConfig:A=qe}=r,o=A.recaptcha?.siteKey||Ec,n=A.recaptcha?.videoAction||"VIDEO_GENERATION",a=A.clientContext?.clientVersionNumber??22,s=A.clientContext?.batchExecutePath||"/_/AiSandboxAngularFrontend/data/batchexecute",i=A.rpcIds?.videoT2v||"YhhmEf",c=A.rpcIds?.videoI2v||"eb1hJf",g=A.rpcIds?.videoFrames||"nprQif",u=A.rpcIds?.videoR2v||"MZZa6b",d=JSON.stringify(e);return\`
    (async () => {
      const logs = [];
      function addLog(msg) {
        logs.push(new Date().toISOString().slice(11, 23) + ' ' + msg);
      }

      try {
        addLog('FlowVideoRpc: Khởi chạy in-page submit');
        const siteKey = \${JSON.stringify(o)};
        const params = \${d};

        // 1. Lấy token reCAPTCHA enterprise với action video
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

        // 2. Lấy WIZ_global_data
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

        // 3. Xây dựng innerPayload theo đúng mode
        const clientUuid1 = crypto.randomUUID().toUpperCase();
        const clientUuid2 = crypto.randomUUID().toUpperCase();
        const clientSessionUuid = crypto.randomUUID().toUpperCase();
        const promptStructure = [null, null, [[[params.prompt]]]];
        const ratioEnum = params.ratioEnum || 2; // 1 = 9:16, 2 = 16:9
        let modelKey = params.modelKey;

        // Model key auto-safeguard: Đảm bảo modelKey chuẩn xác tuyệt đối với hạ tầng Google Flow
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
          // Mặc định Text-to-Video (T2V)
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
            params.projectId,
            null,
            null,
            null,
            null,
            [recaptchaToken || '', 1]
          ],
          [clientSessionUuid, 2]
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

        addLog('Gửi batchexecute RPC ' + rpcId + ' (Model: ' + modelKey + ')');
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
  \`}`;

// 2. Build the new clean executeFlowVideoRpc
const newExecuteFlowVideoRpc = `async executeFlowVideoRpc(e,t,A,o){const n=Date.now();if(A?.aborted)throw new p("PROVIDER_REJECTED","Yêu cầu tạo video đã bị hủy",!1);const a=await this.ensureGoogleFlowViewReady(e,A),s=nl({params:t,rpcConfig:o});y("browser-view","flow video rpc: bắt đầu thực thi in-page script",{accountId:e.accountId,projectId:t.projectId,modelKey:t.modelKey,mode:t.mode,ratioEnum:t.ratioEnum,prompt:t.prompt.slice(0,50)});const i=18e4,c=a.view.webContents.executeJavaScript(s,!0);let g;const u=new Promise((l,m)=>{g=setTimeout(()=>{m(new p("NETWORK",\`Google Flow Video RPC quá thời gian chờ (\${Math.round(i/1e3)}s)\`,!0))},i)});let d;try{A?d=await Promise.race([c,u,new Promise((l,m)=>{A.addEventListener("abort",()=>m(new p("PROVIDER_REJECTED","Tác vụ tạo video bị hủy",!1)),{once:!0})})]):d=await Promise.race([c,u])}finally{g&&clearTimeout(g)}if(y("browser-view","flow video rpc: kết quả in-page execution",{accountId:e.accountId,projectId:t.projectId,success:d.success,status:d.status,durationMs:Date.now()-n,error:d.error}),!d.success||!d.responseText)throw yt(d,d.error||\`Google Flow Video RPC thất bại với status \${d.status}\`);return Xu(d.responseText)}`;

// 3. Replace function nl(r)
const nlStart = code.indexOf('function nl(');
const nlEnd = code.indexOf('function al(', nlStart);
if (nlStart === -1 || nlEnd === -1) {
  console.error('❌ Could not locate function nl boundaries!');
  process.exit(1);
}
console.log('Replacing function nl from', nlStart, 'to', nlEnd);
code = code.slice(0, nlStart) + newNlFunction + code.slice(nlEnd);

// 4. Replace executeFlowVideoRpc
const execStart = code.indexOf('async executeFlowVideoRpc(');
const execEnd = code.indexOf('async executeFlowVideoStatusRpc(', execStart);
if (execStart === -1 || execEnd === -1) {
  console.error('❌ Could not locate executeFlowVideoRpc boundaries!');
  process.exit(1);
}
console.log('Replacing executeFlowVideoRpc from', execStart, 'to', execEnd);
code = code.slice(0, execStart) + newExecuteFlowVideoRpc + code.slice(execEnd);

fs.writeFileSync(targetFile, code, 'utf8');
console.log('✅ Updated app/out/main/index.js successfully!');

// Check syntax
try {
  execSync(`node --check "${targetFile}"`);
  console.log('✅ Syntax check passed 100%!');
} catch (e) {
  console.error('❌ Syntax error:', e.message);
  process.exit(1);
}
