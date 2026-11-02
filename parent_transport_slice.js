urn {
          success: response.status === 200,
          status: response.status,
          responseText: responseText,
          log: logs
        };
      } catch (err) {
        return {
          success: false,
          error: err.name === 'AbortError' ? 'Upscale RPC request timeout' : err.message,
          log: logs
        };
      } finally {
        clearTimeout(timeoutId);
        if (operationId && operationRegistry[operationId] === abortController) delete operationRegistry[operationId];
      }
    })()
  `}function Fn(r,e){return r.rpcId?r.rpcId:r.mode==="Edit"?"jIps6":r.mode==="Frames"&&r.startMediaId&&r.endMediaId?e.rpcIds.videoFrames:r.mode==="I2V"&&r.startMediaId?e.rpcIds.videoI2v:r.mode==="R2V"&&r.referenceMediaIds?.length?e.rpcIds.videoR2v:e.rpcIds.videoT2v}function Lm(r,e,t){const o=[null,null,[[[r.prompt]]]],n=r.ratioEnum||2,i=r.resolutionCode||(r.modelKey.toLowerCase().includes("360p")?4:1),a=L().toUpperCase(),s=L().toUpperCase(),A=Fn(r,t);let c;if(r.mode==="Edit"){if(!r.sourceVideoMediaId||!Number.isSafeInteger(r.sourceVideoEndFrame)||r.sourceVideoEndFrame<=0)throw new p("PROVIDER_REJECTED","Video Edit requires a source video and a valid frame range",!1);c=[[null,r.sourceVideoMediaId,0,r.sourceVideoEndFrame],o,r.modelKey,n,[null,null,null,null,a,s],null,null,null,(r.referenceMediaIds||[]).map(l=>[null,l]),null,null,null,[i]]}else r.mode==="Frames"&&r.startMediaId&&r.endMediaId?c=[o,r.modelKey,n,null,[null,r.startMediaId,null,null,null,r.startCrop||null],[null,r.endMediaId,null,null,null,r.endCrop||null],[null,null,null,null,a,s]]:r.mode==="I2V"&&r.startMediaId?c=[o,r.modelKey,n,null,[null,r.startMediaId,null,null,null,r.startCrop||null],[null,null,null,null,a,s],null,null,null,[i]]:r.mode==="R2V"&&r.referenceMediaIds?.length?c=[o,r.referenceMediaIds.map(l=>[null,l]),r.modelKey,n,null,[null,null,null,null,a,s],null,null,null,null,null,[i]]:c=[o,r.modelKey,n,null,[null,null,null,null,a,s],null,null,[i]];const d=[[c],[null,t.clientContext.clientVersionNumber,null,null,null,r.projectId,null,null,null,null,[e,1]],[L().toUpperCase(),2]];return{rpcId:A,envelope:JSON.stringify([[[A,JSON.stringify(d),null,"generic"]]])}}function Fm(r,e){const t=r.rpcId||e.rpcIds.videoStatus;return{rpcId:t,envelope:JSON.stringify([[[t,JSON.stringify([null,null,[[r.mediaId]]]),null,"generic"]]])}}function Qm(r,e){const t=r.rpcId||e.rpcIds.videoMedia;return{rpcId:t,envelope:JSON.stringify([[[t,JSON.stringify([r.mediaId]),null,"generic"]]])}}function jm(r,e,t){const o=r.rpcId||t.rpcIds.videoUpscale,n=r.ratioEnum||2,i=r.targetResolutionCode||_a(r.upsampleModelKey),s=[[[[null,r.originalMediaId],null,n,null,[null,r.workflowId||r.originalMediaId,null,null,L().toUpperCase()],null,i,...new Array(24).fill(null),r.upsampleModelKey]],[null,t.clientContext.clientVersionNumber,null,null,null,r.projectId,null,null,null,null,[e,1]],[L().toUpperCase()]];return{rpcId:o,envelope:JSON.stringify([[[o,JSON.stringify(s),null,"generic"]]])}}function BA(r){if(typeof r=="number")return r===1||r===2?r:2;if(!r)return 2;const e=String(r).trim();return e==="9:16"||e==="VIDEO_ASPECT_RATIO_PORTRAIT"?1:2}function zm(r,e){return e?.toLowerCase().includes("360p")||r?.toLowerCase().includes("360p")?4:1}function _a(r){return r?.toLowerCase().includes("1080p")?2:r?.toLowerCase().includes("4k")?3:1}function Hm(r,e,t){if(!r||!e)return[null,0,1,1];const o=r/e,n=t===1?9/16:16/9;if(Math.abs(o-n)<.01)return[null,0,1,1];if(o>n){const s=(1-e*n/r)/2;return[null,s,1,1-s]}else return[null,0,1-(1-r/n/e)/2,1]}function Bu(r,e=["YhhmEf","eb1hJf","nprQif","MZZa6b"]){const t=si(r,e);let o,n;if(Array.isArray(t)){const i=t[3]?.[0];if(Array.isArray(i)&&typeof i[0]=="string"&&Jo(i[0])&&(o=i[0],typeof i[2]=="string"&&Jo(i[2])&&(n=i[2])),!o){const a=t[2]?.[0];if(Array.isArray(a)){typeof a[0]=="string"&&Jo(a[0])&&(n=a[0]);const s=a[3];Array.isArray(s)&&typeof s[4]=="string"&&Jo(s[4])&&(o=s[4])}}}if(!o){const i=ue(t);throw i?Ye(i,{rpcid:e}):new p("PROVIDER_REJECTED","Không tìm thấy media ID trong phản hồi tạo video Google Flow",!1)}return{mediaId:o,workflowId:n||o}}function vu(r,e="jwpduf",t=!1){const o=si(r,e);let n;if(Array.isArray(o)){const a=o[2]?.[0];if(Array.isArray(a)){const s=a[5];if(Array.isArray(s)){const A=s[8];Array.isArray(A)&&typeof A[0]=="number"&&(n=A[0])}}}if(n===void 0||!Number.isInteger(n)||(n<1||n>4)&&!(t&&[5,6,7].includes(n))){const a=ue(o);throw a?Ye(a,{rpcid:e}):new p("NETWORK","Google Flow returned an unrecognized video status",!0,{stage:"video-status-parse"})}let i="GENERATING";return t&&n===6?i="PENDING":n===3?i="SUCCESS":n===1?i="PENDING":n===2?i="GENERATING":n>=4&&(i="FAILED"),{statusCode:n,status:i,raw:o}}function Cu(r,e,t="as29s"){const o=si(r,t);let n="",i="",a,s,A;if(Array.isArray(o)){const c=o[5];Array.isArray(c)&&(typeof c[11]=="string"&&c[11].startsWith("http")&&(i=$o(c[11])),typeof c[14]=="number"&&(s=c[14]));const d=o[7]?.[0];Array.isArray(d)&&(typeof d[8]=="string"&&d[8].startsWith("http")&&(n=$o(d[8])),typeof d[7]=="string"&&(A=d[7]));const l=o[7]?.[1]?.[2];Array.isArray(l)&&typeof l[0]=="number"&&(a=l[0])}if(!n){const c=JSON.stringify(o)?.match(/https:\/\/flow-content\.google\/video\/[^\s"'\\]+/g);c&&c.length>0&&(n=$o(c[0]))}if(!i){const c=JSON.stringify(o)?.match(/https:\/\/flow-content\.google\/image\/[^\s"'\\]+/g);c&&c.length>0&&(i=$o(c[0]))}if(!n){const c=ue(o);throw c?Ye(c,{rpcid:t}):new p("PROVIDER_REJECTED","Google Flow không trả về link video MP4 hợp lệ",!1)}return{videoUrl:n,thumbnailUrl:i||void 0,durationSeconds:a,sizeBytes:s,title:A,mediaId:e}}function bu(r,e="p0UkFb"){const t=si(r,e);let o,n;if(Array.isArray(t)){const i=t[0]?.[0]?.[0];Array.isArray(i)&&typeof i[0]=="string"&&(o=i[0]);const a=t[3]?.[0];!o&&Array.isArray(a)&&typeof a[0]=="string"&&(o=a[0]);const s=t[2]?.[0];Array.isArray(s)&&typeof s[0]=="string"&&(n=s[0])}if(!o){const i=JSON.stringify(t)?.match(/[a-f0-9-]{36}(?:_[0-9]+p)?_upsampled/i);i&&(o=i[0])}if(!o){const i=ue(t);throw i?Ye(i,{rpcid:e}):new p("PROVIDER_REJECTED","Không tìm thấy media ID của video upscaled trong phản hồi Google Flow",!1)}return{upsampledMediaId:o,workflowId:n}}class $m{constructor(e,t,o,n,i,a){this.referenceMediaLookup=a,this.submitExecutor=e,this.statusExecutor=t,this.mediaExecutor=o,this.upscaleExecutor=n,this.getRpcConfig=i}submitExecutor;statusExecutor;mediaExecutor;upscaleExecutor;getRpcConfig;async submitVideo(e,t,o){B("google-flow-video-rpc","bắt đầu submit tạo video",{accountId:e.accountId,projectId:t.projectId,modelKey:t.modelKey,mode:t.mode,ratioEnum:t.ratioEnum});const n=this.getRpcConfig?.(),i=await this.submitExecutor(e,t,o,n);return B("google-flow-video-rpc","submit tạo video thành công",{accountId:e.accountId,mediaId:i.mediaId,workflowId:i.workflowId}),i}async pollVideo(e,t,o,n,i=300){const a=Date.now(),s=i*1e3;let A=0;for(;Date.now()-a<s;){if(n?.aborted)throw new p("PROVIDER_REJECTED","Tác vụ tạo video đã bị hủy",!1);A+=1;const c=Math.round((Date.now()-a)/1e3),d=Math.min(80,Math.round(45+c/45*35));o?.(d,`Đang xử lý video... (${c}s)`);const l=this.getRpcConfig?.();let u;try{u=await this.statusExecutor(e,t,n,l)}catch(g){throw n?.aborted?g:fe(g,{stage:"video-poll",mediaId:t.mediaId})}if(u.status==="SUCCESS")return B("google-flow-video-rpc","video đã tạo hoàn tất",{mediaId:t.mediaId,pollCount:A,elapsedSeconds:c}),u;if(u.status==="FAILED"){const g=ue(u.raw);throw g?Ye(g,{raw:u.raw}):new p("PROVIDER_REJECTED","Google Flow báo lỗi thất bại khi đang render video",!1)}await new Promise(g=>setTimeout(g,2500))}throw new p("NETWORK",`Tạo video quá thời gian chờ (${i}s). Vui lòng thử lại sau.`,!0,{providerSubmitted:!0,providerSubmissionUncertain:!0,stage:"video-poll",mediaId:t.mediaId})}async fetchVideoMedia(e,t,o){const n=this.getRpcConfig?.();try{return await this.mediaExecutor(e,t,o,n)}catch(i){throw o?.aborted?i:fe(i,{stage:"video-media",mediaId:t.mediaId})}}readVideoStatus(e,t,o){return this.statusExecutor(e,t,o,this.getRpcConfig?.())}async isReferenceMediaMissing(e,t,o){const n=t.rpcId||this.getRpcConfig?.().rpcIds.videoMedia||"as29s";return Iu(e,{...t,rpcId:n},o,this.referenceMediaLookup)}async upscaleVideo(e,t,o,n,i){B("google-flow-video-rpc","bắt đầu upscale video",{originalMediaId:t.originalMediaId,upsampleModelKey:t.upsampleModelKey}),o?.(82,"Đang gửi yêu cầu nâng cấp video (Upscale)...");const a=this.getRpcConfig?.();let s;try{s=await this.upscaleExecutor(e,t,n,a)}catch(A){throw n?.aborted?A:fe(A,{stage:"video-upscale-submit"})}return await i?.(s),B("google-flow-video-rpc","yêu cầu upscale đã gửi, bắt đầu poll",{upsampledMediaId:s.upsampledMediaId}),await this.pollVideo(e,{projectId:t.projectId,mediaId:s.upsampledMediaId,allowScheduled:!0},A=>{const c=Math.round(82+(A-45)/35*10);o?.(c,"Đang nâng cấp chất lượng video...")},n,300),o?.(93,"Đang tải thông tin video chất lượng cao..."),await this.fetchVideoMedia(e,{projectId:t.projectId,mediaId:s.upsampledMediaId},n)}}function si(r,e){Lt(r,e);const t=hr(r,e);if(t){if(typeof t[2]!="string")return t[2];try{return JSON.parse(t[2])}catch{return t[2]}}if(hr(r))throw new p("PROVIDER_REJECTED","Google Flow response did not contain the requested RPC",!1);let o=r.trim();o.startsWith(")]}'")&&(o=o.slice(4).trim());const n=o.split(`
`);for(const i of n){const a=i.trim();if(!(!a||/^\d+$/.test(a)))try{const s=JSON.parse(a);if(Array.isArray(s)&&s.length>0){for(const A of s)if(Array.isArray(A)&&A[0]==="wrb.fr"&&typeof A[2]=="string")try{return JSON.parse(A[2])}catch{return A[2]}}return s}catch{}}try{const i=JSON.parse(o);if(Array.isArray(i)&&i.length>0){for(const a of i)if(Array.isArray(a)&&a[0]==="wrb.fr"&&typeof a[2]=="string")try{return JSON.parse(a[2])}catch{return a[2]}}return i}catch(i){return E("google-flow-video-rpc","Lỗi parse Boq response",{error:R(i)}),r}}function $o(r){return r.replace(/\\u003d/g,"=").replace(/\\u0026/g,"&")}function Jo(r){return/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(r)}const Gu="6LdsFiUsAAAAAIjVDZcuLhaHiDn5nnHVXVRQGeMV";function Jm(r){const{params:e,timeoutMs:t=18e4,rpcConfig:o=Ze,operationId:n=""}=r,i=o.recaptcha?.siteKey||Gu,a=o.recaptcha?.videoAction||"VIDEO_GENERATION",s=o.clientContext?.clientVersionNumber??22,A=o.clientContext?.batchExecutePath||"/_/AiSandboxAngularFrontend/data/batchexecute",c=o.rpcIds?.videoT2v||"YhhmEf",d=o.rpcIds?.videoI2v||"eb1hJf",l=o.rpcIds?.videoFrames||"nprQif",u=o.rpcIds?.videoR2v||"MZZa6b",g=JSON.stringify(e);return`
    (async () => {
      const logs = [];
      const operationId = ${JSON.stringify(n)};
      const operationRegistry = window.__aiforge_flow_rpc_operations || (window.__aiforge_flow_rpc_operations = {});
      const controller = (operationId && operationRegistry[operationId]) || new AbortController();
      if (operationId) operationRegistry[operationId] = controller;
      const timeoutTimer = setTimeout(() => controller.abort(), ${t});
      function addLog(msg) {
        logs.push(new Date().toISOString().slice(11, 23) + ' ' + msg);
      }

      try {
        addLog('FlowVideoRpc: Khởi chạy in-page submit');
        const siteKey = ${JSON.stringify(i)};
        const params = ${g};

        // 1. Lấy token reCAPTCHA enterprise với action video
        let recaptchaToken = '';
        const runRecaptchaExecute = async () => {
          const execPromise = (${mr()})(siteKey, ${JSON.stringify(a)});
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
        const wiz = window.WIZ_global_data || {};
        const at = wiz.SNlM0e || '';
        const fsid = wiz.FdrFJe || '';
        const bl = wiz.cfb2h || 'boq_labs-ai-sandbox-frontend_20260910.13_p0';
        const reqId = Math.floor(Math.random() * 900000 + 1000000);
        addLog('WIZ data: at=' + (at ? 'có' : 'thiếu') + ' fsid=' + (fsid ? 'có' : 'thiếu'));

        // 3. Xây dựng innerPayload theo đúng mode
        const clientUuid1 = crypto.randomUUID().toUpperCase();
        const clientUuid2 = crypto.randomUUID().toUpperCase();
        const clientSessionUuid = crypto.randomUUID().toUpperCase();
        const promptStructure = [null, null, [[[params.prompt]]]];
        const ratioEnum = params.ratioEnum || 2; // 1 = 9:16, 2 = 16:9
        const modelKey = params.modelKey;
        const resolutionCode = params.resolutionCode || (modelKey && modelKey.toLowerCase().includes('360p') ? 4 : 1);

        let rpcId = params.rpcId;
        let modePayload;

        if (params.mode === 'Edit') {
          if (!params.sourceVideoMediaId || !Number.isSafeInteger(params.sourceVideoEndFrame) || params.sourceVideoEndFrame <= 0) {
            return { success: false, error: 'Invalid video edit source' };
          }
          rpcId = rpcId || 'jIps6';
          modePayload = [
            [null, params.sourceVideoMediaId, 0, params.sourceVideoEndFrame],
            promptStructure, modelKey, ratioEnum,
            [null, null, null, null, clientUuid1, clientUuid2],
            null, null, null, (params.referenceMediaIds || []).map(id => [null, id]),
            null, null, null, [resolutionCode]
          ];
        } else if (params.mode === 'Frames' && params.startMediaId && params.endMediaId) {
          rpcId = rpcId || ${JSON.stringify(l)};
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
          rpcId = rpcId || ${JSON.stringify(d)};
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
          rpcId = rpcId || ${JSON.stringify(u)};
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
          rpcId = rpcId || ${JSON.stringify(c)};
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
            ${s},
            null,
            null,
            null,
            params.projectId,
            null,
            null,
            null,
            null,
   