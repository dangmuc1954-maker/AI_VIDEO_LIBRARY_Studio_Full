const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

console.log('=== KHỞI CHẠY BẢN VÁ TOÀN DIỆN VEO 3 VIDEO MASTER FIX V5 ===');

const targetFile = path.resolve(__dirname, '../app/out/main/index.js');
let code = fs.readFileSync(targetFile, 'utf8');

// 1. SAO LƯU FILE
fs.writeFileSync(targetFile + '.v5_backup.bak', code, 'utf8');
console.log('✓ Đã tạo bản sao lưu an toàn tại index.js.v5_backup.bak');

// 2. KHẮC PHỤC executeFlowVideoStatusRpc & executeFlowVideoMediaRpc
// Khôi phục 100% nguyên bản cơ chế RPC jwpduf & as29s, triệt tiêu hoàn toàn DOM scraper false-error!
const statusRpcStart = code.indexOf('async executeFlowVideoStatusRpc(');
const upscaleRpcStart = code.indexOf('async executeFlowVideoUpscaleRpc(', statusRpcStart);

if (statusRpcStart === -1 || upscaleRpcStart === -1) {
  console.error('❌ Không tìm thấy vị trí executeFlowVideoStatusRpc hoặc executeFlowVideoUpscaleRpc');
  process.exit(1);
}

const cleanStatusAndMediaCode = `async executeFlowVideoStatusRpc(e,t,A,o){
  if(A?.aborted)throw new p("PROVIDER_REJECTED","Kiểm tra trạng thái video bị hủy",!1);
  const n=await this.ensureGoogleFlowViewReady(e,A),
        a=al({params:t,rpcConfig:o}),
        s=3e4,
        i=n.view.webContents.executeJavaScript(a,!0);
  let c;
  const g=new Promise((d,l)=>{c=setTimeout(()=>{l(new p("NETWORK","Kiểm tra trạng thái video timeout (30s)",!0))},s)});
  let u;
  try{u=await Promise.race([i,g])}finally{c&&clearTimeout(c)}
  if(!u||!u.success||!u.responseText){
    if(u?.status===401||u?.status===403)throw yt(u,"Google Flow kiểm tra trạng thái video thất bại");
    return{statusCode:2,status:"GENERATING"}
  }
  return el(u.responseText)
}
async executeFlowVideoMediaRpc(e,t,A,o){
  if(A?.aborted)throw new p("PROVIDER_REJECTED","Lấy link video bị hủy",!1);
  const n=await this.ensureGoogleFlowViewReady(e,A),
        a=sl({params:t,rpcConfig:o}),
        s=3e4,
        i=n.view.webContents.executeJavaScript(a,!0);
  let c;
  const g=new Promise((d,l)=>{c=setTimeout(()=>{l(new p("NETWORK","Lấy link video timeout (30s)",!0))},s)});
  let u;
  try{u=await Promise.race([i,g])}finally{c&&clearTimeout(c)}
  if(!u||!u.success||!u.responseText)throw yt(u,u?.error||"Không thể lấy thông tin video từ Google Flow");
  return tl(u.responseText,t.mediaId)
}
`;

code = code.slice(0, statusRpcStart) + cleanStatusAndMediaCode + code.slice(upscaleRpcStart);
console.log('✓ 1. Đã khôi phục hoàn hảo executeFlowVideoStatusRpc & executeFlowVideoMediaRpc chuẩn Boq RPC');

// 3. SỬA HÀM nl(r): LOẠI BỎ SYNTHETIC MOUSE EVENT GÂY TRIGGER BOT DETECTION
// VÀ TỰ ĐỘNG CHUẨN HÓA MODE/MODEL NẾU KHÔNG CÓ ẢNH THAM CHIẾU
const nlStart = code.indexOf('function nl(r){');
const alStart = code.indexOf('function al(r){', nlStart);

if (nlStart === -1 || alStart === -1) {
  console.error('❌ Không tìm thấy vị trí function nl(r) hoặc al(r)');
  process.exit(1);
}

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

        // 1. Lấy token reCAPTCHA enterprise tự nhiên, không inject synthetic events
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

        // 3. Chuẩn hóa Mode & ModelKey chống gửi nhầm sang model không tương thích
        const ratioEnum = params.ratioEnum || 2; // 1 = 9:16, 2 = 16:9
        let actualMode = params.mode;
        const hasRefs = Array.isArray(params.referenceMediaIds) && params.referenceMediaIds.length > 0;
        if (actualMode === 'R2V' && !hasRefs) {
          actualMode = 'T2V';
        }
        if (actualMode === 'I2V' && !params.startMediaId) {
          actualMode = 'T2V';
        }
        if (actualMode === 'Frames' && (!params.startMediaId || !params.endMediaId)) {
          actualMode = 'T2V';
        }

        let modelKey = params.modelKey;
        if (actualMode === 'T2V') {
          if (!modelKey || modelKey.includes('r2v') || modelKey.includes('i2v') || modelKey === 'veo-3.1-fast' || modelKey === 'veo_3_1_fast') {
            modelKey = (ratioEnum === 1) ? 'veo_3_1_t2v_fast_portrait' : 'veo_3_1_t2v_fast';
          }
        } else if (actualMode === 'R2V') {
          if (!modelKey || modelKey === 'veo-3.1-fast' || modelKey === 'veo_3_1_fast' || modelKey === 'veo_3_1_fast_r2v') {
            modelKey = (ratioEnum === 1) ? 'veo_3_1_r2v_fast_portrait' : 'veo_3_1_r2v_fast_landscape';
          }
        } else if (actualMode === 'I2V') {
          if (!modelKey || modelKey === 'veo-3.1-fast' || modelKey === 'veo_3_1_fast') {
            modelKey = (ratioEnum === 1) ? 'veo_3_1_i2v_s_fast_portrait' : 'veo_3_1_i2v_s_fast';
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
            params.projectId,
            null,
            null,
            null,
            null,
            [recaptchaToken || '', 1]
          ],
          [clientSessionUuid, 2]
        ];

        // 4. Gửi request batchexecute với x-same-domain
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
  \`}`;

code = code.slice(0, nlStart) + newNlFunction + code.slice(alStart);
console.log('✓ 2. Đã thay thế nl(r) sạch sẽ, an toàn reCAPTCHA và tự động fall back T2V');

// 4. BỔ SUNG HEADER X-SAME-DOMAIN VÀO sl(r) (VIDEO MEDIA)
const slStart = code.indexOf('function sl(r){');
if (slStart !== -1) {
  const slEnd = code.indexOf('function il(r){', slStart);
  if (slEnd !== -1) {
    let slCode = code.slice(slStart, slEnd);
    if (!slCode.includes("'x-same-domain': '1'")) {
      slCode = slCode.replace(
        "'content-type': 'application/x-www-form-urlencoded;charset=UTF-8'",
        "'content-type': 'application/x-www-form-urlencoded;charset=UTF-8',\n            'x-same-domain': '1'"
      );
      code = code.slice(0, slStart) + slCode + code.slice(slEnd);
      console.log('✓ 3. Đã bổ sung header x-same-domain vào sl(r)');
    }
  }
}

// 5. CHUẨN HÓA HÀM Jm(r, e): NẾU KHÔNG CÓ REFERENCE ASSETS THÌ BẮT BUỘC TRẢ VỀ T2V
const jmStart = code.indexOf('function Jm(r,e){');
if (jmStart !== -1) {
  const jmEnd = code.indexOf('class $m{', jmStart);
  if (jmEnd !== -1) {
    const cleanJm = `function Jm(r,e){
  const refs = Array.isArray(e?.referenceAssetIds) ? e.referenceAssetIds : (Array.isArray(e?.referenceIds) ? e.referenceIds : []);
  if (!refs || refs.length === 0) return "T2V";
  if (r === "Frames") return refs.length >= 2 ? "Frames" : "I2V";
  if (r === "I2V") return refs.length >= 1 ? "I2V" : "T2V";
  if (r === "R2V") return refs.length >= 1 ? "R2V" : "T2V";
  if (r === "Components") return refs.length > 0 ? "R2V" : "T2V";
  return refs.length >= 2 ? "Frames" : refs.length === 1 ? "I2V" : "T2V";
}`;
    code = code.slice(0, jmStart) + cleanJm + code.slice(jmEnd);
    console.log('✓ 4. Đã chuẩn hóa hàm Jm(r,e) chống lệch mode R2V khi không có ảnh');
  }
}

// 6. THÊM SUBMISSION QUEUE LOCK GIÃN CÁCH TỐI THIỂU 2.2S GIỮA CÁC LẦN SUBMIT TRÊN CÙNG TÀI KHOẢN
const targetSubmitBlock = 'let k;try{k=await this.measureStep(n,"rpc-video-submit",()=>this.videoRpcClient.submitVideo(A,{projectId:i,prompt:c,modelKey:g.modelKey,ratioEnum:d,mode:u,resolutionCode:_,startMediaId:P,startCrop:w,endMediaId:I,endCrop:D,referenceMediaIds:b},t.signal))}catch(H){';
const endCatchBlock = 'else throw H}';

const submitPos = code.indexOf(targetSubmitBlock);
if (submitPos !== -1) {
  const endCatchPos = code.indexOf(endCatchBlock, submitPos);
  if (endCatchPos !== -1) {
    const originalTryCatch = code.slice(submitPos + 'let k;'.length, endCatchPos + endCatchBlock.length);
    const lockedBlock = `let k;
    if (!global.__aiforge_flow_video_locks) global.__aiforge_flow_video_locks = new Map();
    const _prevLock = global.__aiforge_flow_video_locks.get(A.accountId) || Promise.resolve();
    let _releaseLock;
    const _myLock = new Promise(res => { _releaseLock = res; });
    global.__aiforge_flow_video_locks.set(A.accountId, _myLock);
    await _prevLock;
    await new Promise(res => setTimeout(res, 2200));
    try {
      ${originalTryCatch}
    } finally {
      setTimeout(() => _releaseLock?.(), 1000);
    }`;

    code = code.slice(0, submitPos) + lockedBlock + code.slice(endCatchPos + endCatchBlock.length);
    console.log('✓ 5. Đã kích hoạt cơ chế tuần tự hóa giãn cách submit chống cờ UNUSUAL_ACTIVITY chuẩn xác');
  }
}

// GHI FILE MAIN/INDEX.JS VÀ KIỂM TRA CÚ PHÁP
fs.writeFileSync(targetFile, code, 'utf8');

fs.copyFileSync(targetFile, 'temp_check_v5.mjs');
try {
  execSync('node --check temp_check_v5.mjs', { stdio: 'pipe' });
  console.log('🎉 KIỂM TRA CÚ PHÁP FILE index.js: 100% HOÀN HẢO!');
} catch (e) {
  console.error('❌ Lỗi cú pháp:', e.stderr?.toString() || e.message);
  // Khôi phục
  fs.copyFileSync(targetFile + '.v5_backup.bak', targetFile);
  process.exit(1);
} finally {
  try { fs.unlinkSync('temp_check_v5.mjs'); } catch (_) {}
}

// 7. CẬP NHẬT CONCURRENCY SETTINGS: ĐẶT veo3Video = 1 TRÊN MỖI LƯỢT ĐỂ TRÁNH BURST RATE
const concurrencyPath = path.join(process.env.APPDATA, 'AI_VIDEO_LIBRARY_DATA', 'concurrency-settings.json');
if (fs.existsSync(concurrencyPath)) {
  try {
    const cc = JSON.parse(fs.readFileSync(concurrencyPath, 'utf8'));
    cc.limits = cc.limits || {};
    cc.limits.veo3Video = 1;
    fs.writeFileSync(concurrencyPath, JSON.stringify(cc, null, 2), 'utf8');
    console.log('✓ 6. Đã đặt concurrency-settings.json veo3Video = 1');
  } catch (_) {}
}

// 8. LÀM SẠCH VÀ MỞ KHÓA TẤT CẢ CÁC JOB BỊ LỖI THÀNH QUEUED ĐỂ CHẠY NGAY
const queuePath = path.join(process.env.APPDATA, 'AI_VIDEO_LIBRARY_DATA', 'queue-state.json');
if (fs.existsSync(queuePath)) {
  try {
    const q = JSON.parse(fs.readFileSync(queuePath, 'utf8'));
    let unblocked = 0;
    if (Array.isArray(q.jobs)) {
      q.jobs.forEach(j => {
        if ((j.status === 'Failed' || j.status === 'Paused') && (j.error || '').includes('Google Flow')) {
          j.status = 'Queued';
          j.error = undefined;
          j.statusText = 'Queued';
          unblocked++;
        }
      });
    }
    fs.writeFileSync(queuePath, JSON.stringify(q, null, 2), 'utf8');
    console.log(`✓ 7. Đã mở khóa ${unblocked} tác vụ Google Flow bị kẹt thành Queued để tự động chạy lại!`);
  } catch (_) {}
}

console.log('🌟 BẢN VÁ MASTER FIX V5 ĐÃ HOÀN TẤT THÀNH CÔNG RỰC RỠ! 🌟');
