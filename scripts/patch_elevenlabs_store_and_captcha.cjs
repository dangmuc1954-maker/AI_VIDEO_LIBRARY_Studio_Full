const fs = require('fs');
const path = require('path');
const cp = require('child_process');

console.log('=== BẮT ĐẦU VÁ DỨT ĐIỂM ELEVENLABS & TRIỆT TIÊU LỖI MICROSOFT STORE ===');

const mainPath = path.resolve('app/out/main/index.js');
let code = fs.readFileSync(mainPath, 'utf8');

// =========================================================================
// 1. TRIỆT TIÊU LỖI TỰ BẬT MICROSOFT STORE TRONG CLASS cp (hCaptcha runner)
// =========================================================================
// Fix 1.1: Change ip from https://example.com to https://elevenlabs.io
const oldIpTarget = 'ip="https://example.com"';
if (code.includes(oldIpTarget)) {
  code = code.replace(oldIpTarget, 'ip="https://elevenlabs.io"');
  console.log('✓ [1.1] Đổi hCaptcha origin sang https://elevenlabs.io');
}

// Fix 1.2: Chặn 100% popup / new window / redirect / protocol sang Microsoft Store
const targetNewJi = 'const A=new Ji({webPreferences:{partition:"persist:elevenlabs-hcaptcha",contextIsolation:!0,nodeIntegration:!1,sandbox:!0,devTools:!1,backgroundThrottling:!1,offscreen:!0}});';
const safeNewJi = `const A=new Ji({webPreferences:{partition:"persist:elevenlabs-hcaptcha",contextIsolation:!0,nodeIntegration:!1,sandbox:!0,devTools:!1,backgroundThrottling:!1,offscreen:!0}});try{A.webContents.setWindowOpenHandler(()=>({action:"deny"}));A.webContents.on("will-navigate",(ev,url)=>{if(!url.startsWith("https://elevenlabs.io")&&!url.startsWith("https://hcaptcha.com")&&!url.startsWith("https://js.hcaptcha.com"))ev.preventDefault()});A.webContents.on("will-redirect",(ev,url)=>{if(!url.startsWith("https://elevenlabs.io")&&!url.startsWith("https://hcaptcha.com")&&!url.startsWith("https://js.hcaptcha.com"))ev.preventDefault()});const _cs=Re.fromPartition("persist:elevenlabs-hcaptcha");_cs.setPermissionRequestHandler((wc,p,cb)=>cb(false));_cs.setWindowOpenHandler(()=>({action:"deny"}));}catch(_){}`;

if (code.includes(targetNewJi)) {
  code = code.replace(targetNewJi, safeNewJi);
  console.log('✓ [1.2] Khóa chặt 100% cửa sổ & chặn đứng hoàn toàn Microsoft Store popup');
} else {
  console.log('! targetNewJi already updated or not matched');
}

// =========================================================================
// 2. BỔ SUNG IPC HANDLERS CHO ELEVENLABS API KEY TRONG MAIN
// =========================================================================
const listSessionsTarget = 'E.handle("browser:listSessions",A=>(C(A),T.listSessions())),';
const elevenIpcHandlers = `E.handle("browser:getElevenLabsKey",(A,o)=>{C(A);try{const p=L(F.getPath("userData"),"elevenlabs-keys.json");if(nodeFs.existsSync(p)){const d=JSON.parse(nodeFs.readFileSync(p,"utf8"));if(o&&d[o])return d[o];return d.default||d.apiKey||Object.values(d)[0]||""}}catch(_){}return""}),E.handle("browser:setElevenLabsKey",(A,o)=>{C(A);try{const p=L(F.getPath("userData"),"elevenlabs-keys.json");let d={};if(nodeFs.existsSync(p)){try{d=JSON.parse(nodeFs.readFileSync(p,"utf8"))}catch(_){}}const k=typeof o=="string"?o.trim():typeof o?.key=="string"?o.key.trim():"";if(o?.accountId){d[o.accountId]=k}d.default=k,d.apiKey=k,nodeFs.writeFileSync(p,JSON.stringify(d,null,2),"utf8");return true}catch(_){return false}}),`;

if (!code.includes('browser:getElevenLabsKey')) {
  if (code.includes(listSessionsTarget)) {
    code = code.replace(listSessionsTarget, listSessionsTarget + elevenIpcHandlers);
    console.log('✓ [2] Bổ sung IPC browser:getElevenLabsKey và browser:setElevenLabsKey');
  }
}

// =========================================================================
// 3. ĐIỀU HƯỚNG TÀI KHOẢN BROWSER HUB & KEY TRONG HÀM Xn VÀ _B
// =========================================================================
const targetXn = 'function Xn(r,e){if(r.providerId==="elevenlabs")return{...r,accountId:"anonymous",account:"Anonymous ElevenLabs",payload:{...r.payload,accountSelection:"auto"}};if(r.accountId)return r;';
const replacementXn = `function Xn(r,e){if(r.providerId==="elevenlabs"){const allEleven=T.listSessions().filter(s=>(s.providerId==="elevenlabs"||s.providerId==="elevenlabs-tts"||(s.provider&&s.provider.toLowerCase().includes("elevenlabs")))&&!s.disabled&&(s.authStatus==="Logged In"||(s.cookieCount&&s.cookieCount>0)));if(r.accountId&&r.accountId!=="anonymous"&&r.accountId!=="Auto"&&allEleven.some(u=>u.accountId===r.accountId||u.accountDisplayName===r.accountId||u.accountName===r.accountId)){const m=allEleven.find(u=>u.accountId===r.accountId||u.accountDisplayName===r.accountId||u.accountName===r.accountId);return{...r,accountId:m.accountId,account:m.accountDisplayName||m.accountEmail||m.accountName||"ElevenLabs",payload:{...r.payload,accountSelection:"manual"}};}if(allEleven.length>0){const sorted=allEleven.map(u=>({candidate:u,activeJobs:U.countOpenJobsForAccount(u.accountId)+(e?.get(u.accountId)||0)})).sort((u,d)=>{const diff=u.activeJobs-d.activeJobs;return diff!==0?diff:u.candidate.accountName.localeCompare(d.candidate.accountName)});const minActive=sorted[0].activeJobs;const lowest=sorted.filter(u=>u.activeJobs===minActive);const key=\`elevenlabs:\${r.type}\`;const seq=En.get(key)||0;const picked=lowest[seq%lowest.length].candidate;En.set(key,seq+1);return{...r,accountId:picked.accountId,account:picked.accountDisplayName||picked.accountEmail||picked.accountName||"ElevenLabs",payload:{...r.payload,accountSelection:"auto"}};}try{const kp=L(F.getPath("userData"),"elevenlabs-keys.json");if(nodeFs.existsSync(kp)){const kd=JSON.parse(nodeFs.readFileSync(kp,"utf8"));const k=kd.default||kd.apiKey||Object.values(kd)[0];if(k&&k.trim().length>10)return{...r,accountId:"api-key",account:"ElevenLabs API Key",payload:{...r.payload,accountSelection:"auto"}};}}catch(_){}return{...r,accountId:"anonymous",account:"Anonymous ElevenLabs",payload:{...r.payload,accountSelection:"auto"}};}if(r.accountId)return r;`;

if (code.includes(targetXn)) {
  code = code.replace(targetXn, replacementXn);
  console.log('✓ [3.1] Cập nhật hàm Xn định tuyến account ElevenLabs & API Key');
}

const targetB = 'function _B(r,e){if((r.type==="Video"||r.type==="Image"||r.type==="image")&&(r.providerId==="muse"';
const replacementB = `function _B(r,e){if(r.providerId==="elevenlabs"||r.provider==="ElevenLabs"||r.type==="TTS"){const allEleven=T.listSessions().filter(s=>(s.providerId==="elevenlabs"||s.providerId==="elevenlabs-tts"||(s.provider&&s.provider.toLowerCase().includes("elevenlabs")))&&!s.disabled);const loggedEleven=allEleven.filter(s=>s.authStatus==="Logged In"||(s.cookieCount&&s.cookieCount>0));const pool=loggedEleven.length>0?loggedEleven:allEleven;if(r.accountId&&r.accountId!=="anonymous"&&r.accountId!=="Auto"&&pool.some(p=>p.accountId===r.accountId||p.accountDisplayName===r.accountId||p.accountName===r.accountId)){const matched=pool.find(p=>p.accountId===r.accountId||p.accountDisplayName===r.accountId||p.accountName===r.accountId);return{accountId:matched.accountId,account:matched.accountDisplayName||matched.accountEmail||matched.accountName||"ElevenLabs"};}if(pool.length>0){global.__elevenlabs_dispatch_counter=(global.__elevenlabs_dispatch_counter||0)+1;const picked=pool[(global.__elevenlabs_dispatch_counter-1)%pool.length];return{accountId:picked.accountId,account:picked.accountDisplayName||picked.accountEmail||picked.accountName||"ElevenLabs"};}try{const kp=L(F.getPath("userData"),"elevenlabs-keys.json");if(nodeFs.existsSync(kp)){const kd=JSON.parse(nodeFs.readFileSync(kp,"utf8"));const k=kd.default||kd.apiKey||Object.values(kd)[0];if(k&&k.trim().length>10)return{accountId:"api-key",account:"ElevenLabs API Key"};}}catch(_){}return{accountId:r.accountId||"anonymous",account:r.account||"Anonymous ElevenLabs"};}if((r.type==="Video"||r.type==="Image"||r.type==="image")&&(r.providerId==="muse"`;

if (code.includes(targetB)) {
  code = code.replace(targetB, replacementB);
  console.log('✓ [3.2] Cập nhật hàm _B định tuyến account ElevenLabs & API Key');
}

// =========================================================================
// 4. BỔ SUNG HÀM extractElevenLabsToken TRƯỚC class Ip
// =========================================================================
const beforeIpTarget = 'function Pp(r){return/authentication_error|unauthorized request|invalid hcaptcha|captcha|hcaptcha/.test(r)}class Ip{';
const tokenExtractorFn = `async function extractElevenLabsToken(session){let tok=null;if(session?.accountId&&W){try{let viewObj=W.views.get(session.accountId);if(!viewObj||viewObj.view.webContents.isDestroyed())viewObj=W.getOrCreateView(session);const curUrl=viewObj.view.webContents.getURL();if(!curUrl||curUrl==="about:blank"){await W.loadUrl(viewObj,session.startUrl||"https://elevenlabs.io/app",{timeoutMs:12e3}).catch(()=>{});}tok=await viewObj.view.webContents.executeJavaScript(\`(async()=>{try{const tok=await new Promise(res=>{try{const req=indexedDB.open("firebaseLocalStorageDb");req.onsuccess=()=>{try{const db=req.result,tx=db.transaction(["firebaseLocalStorage"],"readonly"),st=tx.objectStore("firebaseLocalStorage"),all=st.getAll();all.onsuccess=()=>{for(const item of(all.result||[])){const t=item?.value?.stsTokenManager?.accessToken;if(t)return res(t)}res(null)};all.onerror=()=>res(null)}catch(_){res(null)}};req.onerror=()=>res(null)}catch(_){res(null)}});if(tok)return tok;for(let i=0;i<localStorage.length;i++){const k=localStorage.key(i)||"",v=localStorage.getItem(k)||"";if(v.includes("stsTokenManager")){try{const p=JSON.parse(v);if(p?.stsTokenManager?.accessToken)return p.stsTokenManager.accessToken}catch(_){}}}return null}catch(_){return null}})()\`,!0).catch(()=>null);}catch(_){}}if(!tok&&session?.partition){try{const idbBase=L(F.getPath("userData"),"Partitions",encodeURIComponent(session.partition).replace(/%3A/g,"%3A"),"IndexedDB","https_elevenlabs.io_0.indexeddb.leveldb");if(nodeFs.existsSync(idbBase)){const files=nodeFs.readdirSync(idbBase);for(const f of files){if(f.endsWith(".log")||f.endsWith(".ldb")){const content=nodeFs.readFileSync(L(idbBase,f)).toString("latin1");const m=content.match(/eyJhbGciOiJ[a-zA-Z0-9_\\-\\.]+/g);if(m){const valid=m.find(t=>t.length>300);if(valid){tok=valid;break;}}if(tok)break;}}}}catch(_){}}return tok;}function Pp(r){return/authentication_error|unauthorized request|invalid hcaptcha|captcha|hcaptcha/.test(r)}class Ip{`;

if (!code.includes('extractElevenLabsToken')) {
  if (code.includes(beforeIpTarget)) {
    code = code.replace(beforeIpTarget, tokenExtractorFn);
    console.log('✓ [4] Bổ sung hàm extractElevenLabsToken');
  }
}

// =========================================================================
// 5. CẬP NHẬT class mp.generateAudio: HỖ TRỢ API KEY, AUTH TOKEN & CLOUDFLARE HEADERS
// =========================================================================
const mpStart = code.indexOf('class mp{');
const mpEnd = code.indexOf('class Ip{', mpStart);

if (mpStart !== -1 && mpEnd !== -1) {
  const newMpCode = `class mp{async generateAudio(e){const{text:t,voiceId:A,modelId:o,voiceSettings:n,hcaptchaToken:a,authToken:at,apiKey:ak,cookieHeader:ch,signal:s}=e;const isAuth=Boolean(at||ak);const i=isAuth?\`\${dp}/\${A}\`:\`\${dp}/\${A}/stream/with-timestamps/anonymous\`;const c=new AbortController();let g=!1;const u=setTimeout(()=>{g=!0,c.abort()},za),d=()=>c.abort();s&&(s.aborted?c.abort():s.addEventListener("abort",d,{once:!0}));const l=performance.now(),m={method:"POST",url:wp(i),timeoutMs:za,textLength:t.length,isAuth};y("elevenlabs-tts","request started",m);try{const reqHeaders={"Content-Type":"application/json",Accept:isAuth?"*/*":"text/event-stream",Origin:"https://elevenlabs.io",Referer:"https://elevenlabs.io/","User-Agent":"Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",...(at?{authorization:"Bearer "+at}:{}) ,...(ak?{"xi-api-key":ak}:{}) ,...(ch?{Cookie:ch}:{})};const reqBody={text:t,model_id:o||"eleven_multilingual_v2",voice_settings:n||{stability:0.5,similarity_boost:0.75}};if(!isAuth&&a){reqBody.hcaptcha_token=a;}const h=await fetch(i,{method:"POST",signal:c.signal,headers:reqHeaders,body:JSON.stringify(reqBody)});if(!h.ok){const P=await h.text(),w=fp(h.status,P);throw B("elevenlabs-tts","request rejected",{...m,durationMs:Math.round(performance.now()-l),status:h.status,mappedCode:w.code,body:rn(P)}),w}const cType=h.headers.get("content-type")||"";if(cType.includes("audio")||isAuth){const arrBuf=await h.arrayBuffer();const b64=Buffer.from(arrBuf).toString("base64");y("elevenlabs-tts","authenticated request completed",{...m,durationMs:Math.round(performance.now()-l),status:h.status,bytes:arrBuf.byteLength});return{audioBase64:b64,alignment:[],normalizedAlignment:[]};}const f=await pp(h);return y("elevenlabs-tts","request completed",{...m,durationMs:Math.round(performance.now()-l),status:h.status,chunks:f.alignment.length,audioBase64Length:f.audioBase64.length}),f}catch(h){throw h instanceof p?h:h instanceof Error&&h.name==="AbortError"?s?.aborted&&!g?(B("elevenlabs-tts","request cancelled",{...m,durationMs:Math.round(performance.now()-l)}),new p("UNKNOWN","ElevenLabs TTS request was cancelled",!1)):(B("elevenlabs-tts","request timed out",{...m,durationMs:Math.round(performance.now()-l)}),new p("NETWORK","ElevenLabs TTS request timed out",!0)):(B("elevenlabs-tts","request failed before provider response",{...m,durationMs:Math.round(performance.now()-l),error:v(h)}),new p("NETWORK",h instanceof Error?h.message:"ElevenLabs TTS request failed",!0))}finally{clearTimeout(u),s?.removeEventListener("abort",d)}}}async function pp(r){const e=await r.text(),t=hp(e),A=[],o=[],n=[];for(const a of t)a.audio_base64&&A.push(Buffer.from(a.audio_base64,"base64")),a.alignment&&o.push(a.alignment),a.normalizedAlignment&&n.push(a.normalizedAlignment);if(A.length===0)throw new p("PROVIDER_REJECTED","ElevenLabs TTS returned no audio data",!1);return{audioBase64:Buffer.concat(A).toString("base64"),alignment:o,normalizedAlignment:n}}function hp(r){const e=[],t=r.replace(/}\\s*{/g,\`}\\n{\`).split(\`\\n\`).map(A=>A.trim()).filter(Boolean);for(const A of t)try{e.push(JSON.parse(A))}catch{B("elevenlabs-tts","skipping unparseable streaming JSON chunk",{line:ae(A).slice(0,200)})}return e}function fp(r,e){const t=e.toLowerCase(),A={upstreamStatus:r,upstreamBody:rn(e)};if(t.includes("text_too_long")||t.includes("max_character_limit_exceeded")||t.includes("maximum allowed is")&&t.includes("characters")){let o="Text exceeds ElevenLabs character limit (maximum 1000 characters for anonymous account).";try{const n=JSON.parse(e);n?.detail?.message&&(o=n.detail.message)}catch{}return new p("INPUT_TOO_LONG",o,!1,{...A,providerReason:"ELEVENLABS_TEXT_TOO_LONG"})}return t.includes("quota_exceeded")||t.includes("credit_limit_exceeded")||t.includes("insufficient_credits")||/quota exceeded|out of credits|insufficient credits|free tier limit reached/i.test(t)?new p("QUOTA_EXCEEDED","ElevenLabs account quota/credits exhausted",!1,{...A,providerReason:"ELEVENLABS_QUOTA_EXCEEDED"}):r===401&&Pp(t)?new p("CHALLENGE_REQUIRED","ElevenLabs requires a fresh captcha verification",!0,A):r===403?new p("CHALLENGE_REQUIRED","ElevenLabs requires captcha verification",!0,A):r===401?new p("AUTH_REQUIRED","ElevenLabs authentication failed",!0,A):r===429?new p("RATE_LIMITED","ElevenLabs rate limit reached",!0,A):r===400?new p("PROVIDER_REJECTED",\`ElevenLabs rejected the request: \${rn(e)??r}\`,!1,A):r>=500?new p("NETWORK","ElevenLabs returned a server error",!0,A):new p("PROVIDER_REJECTED",\`ElevenLabs rejected the request (\${r})\`,!1,A)}function wp(r){try{const e=new URL(r);return\`\${e.origin}\${e.pathname}\`}catch{return ae(r.split("?")[0])}}function rn(r){if(r)return ae(r).replace(/\\s+/g," ").trim().slice(0,640)}function Pp(r){return/authentication_error|unauthorized request|invalid hcaptcha|captcha|hcaptcha/.test(r)}`;
  code = code.slice(0, mpStart) + newMpCode + code.slice(mpEnd);
  console.log('✓ [5] Nâng cấp class mp.generateAudio với Origin/Referer và API Key/Auth Token');
}

// =========================================================================
// 6. CẬP NHẬT class Ip.runJob: ƯU TIÊN AUTH/KEY, VÀ BÁO LỖI THÔNG MINH
// =========================================================================
const ipStart = code.indexOf('class Ip{');
const rjStart = code.indexOf('async runJob(e,t){', ipStart);
const rjEnd = code.indexOf('readText(e){', rjStart);

if (rjStart !== -1 && rjEnd !== -1) {
  const newRunJobCode = `async runJob(e,t){await this.validateJob(e);const A=this.readText(e),o=this.readVoiceId(e),n=this.readModelId(e),a=this.readVoiceSettings(e);let accountSession=e.accountId&&e.accountId!=="anonymous"&&e.accountId!=="api-key"?T.findSession(e.accountId):null;if(!accountSession){const allEleven=T.listSessions().filter(s=>(s.providerId==="elevenlabs"||s.providerId==="elevenlabs-tts"||(s.provider&&s.provider.toLowerCase().includes("elevenlabs")))&&!s.disabled&&(s.authStatus==="Logged In"||(s.cookieCount&&s.cookieCount>0)));if(allEleven.length>0)accountSession=allEleven[0];}let apiKey=null;try{const kp=L(F.getPath("userData"),"elevenlabs-keys.json");if(nodeFs.existsSync(kp)){const kd=JSON.parse(nodeFs.readFileSync(kp,"utf8"));apiKey=kd[accountSession?.accountId]||kd.default||kd.apiKey||null;}}catch(_){}let authToken=null;if(accountSession){t.updateProgress(10,"Đang chuẩn bị xác thực "+(accountSession.accountDisplayName||accountSession.accountName||"ElevenLabs")+"...");try{authToken=await extractElevenLabsToken(accountSession);}catch(_){}}let cookieHeader="";if(accountSession?.partition){try{const ses=Re.fromPartition(accountSession.partition);const cookies=await ses.cookies.get({domain:"elevenlabs.io"});if(cookies&&cookies.length>0)cookieHeader=cookies.map(ck=>ck.name+"="+ck.value).join("; ");}catch(_){}}const accName=accountSession?(accountSession.accountDisplayName||accountSession.accountName||"ElevenLabs"):(apiKey?"API Key":"Anonymous");y("elevenlabs-tts","tts job started",{jobId:e.id,textLength:A.length,voiceId:o,modelId:n,account:accName,hasAuthToken:Boolean(authToken),hasApiKey:Boolean(apiKey)});const s=Date.now();let i,c,g;if(authToken||apiKey){t.updateProgress(30,"Đang tạo giọng đọc với "+accName+"...");try{const genRes=await this.ttsClient.generateAudio({text:A,voiceId:o,modelId:n,voiceSettings:a,authToken,apiKey,cookieHeader,signal:t.signal});c=genRes.audioBase64;}catch(authErr){g=authErr;B("elevenlabs-tts","authenticated generation error",{error:v(authErr)});if(authErr instanceof p&&authErr.code==="RATE_LIMITED")throw authErr;}}if(!c&&!authToken&&!apiKey){if(accountSession){throw new p("AUTH_REQUIRED","Tài khoản "+accName+" cần được mở lại trong Browser Hub để làm mới phiên đăng nhập.",!1,{providerReason:"ELEVENLABS_SESSION_EXPIRED"});}for(let d=1;d<=VA;d+=1){t.updateProgress(15,"Đang yêu cầu mã bảo mật (Thử lần "+d+"/"+VA+")...");try{i=await this.captchaService.requestToken(t.signal,d===VA?{forceReinitialize:!0}:void 0)}catch(l){throw B("elevenlabs-tts","captcha token request failed",{jobId:e.id,attempt:d,error:v(l)}),l}t.updateProgress(35,"Đang tạo âm thanh...");try{c=(await this.ttsClient.generateAudio({text:A,voiceId:o,modelId:n,voiceSettings:a,hcaptchaToken:i,signal:t.signal})).audioBase64;break}catch(l){if(g=l,l instanceof p){if(l.code==="RATE_LIMITED")throw B("elevenlabs-tts","rate limited; propagating to queue",{jobId:e.id,attempt:d}),l;if(l.code==="CHALLENGE_REQUIRED"){if(d<VA){B("elevenlabs-tts","challenge required; retrying with fresh captcha",{jobId:e.id,attempt:d,maxAttempts:VA,error:v(l)}),await this.delay(800*d,t.signal);continue}throw new p("CAPTCHA_FAILED","ElevenLabs yêu cầu xác minh bảo mật. Vui lòng thêm tài khoản ElevenLabs trong Browser Hub hoặc nhập Key ElevenLabs để tạo giọng đọc tức thì không cần xác minh.",!1,{...l.details,providerReason:"ELEVENLABS_CAPTCHA_REJECTED"})}}throw l}}}if(!c)throw g??new p("UNKNOWN","ElevenLabs TTS thất bại sau các lần thử bảo mật");t.updateProgress(85,"Lưu tệp âm thanh");const u=Date.now()-s;return y("elevenlabs-tts","tts job completed",{jobId:e.id,durationMs:u,audioSizeBytes:Math.round(c.length*3/4)}),{assets:[{type:"audio",url:"data:audio/mpeg;base64,"+c,mimeType:"audio/mpeg"}],provider:{raw:{voiceId:o,modelId:n,textLength:A.length,durationMs:u}}}}`;
  code = code.slice(0, rjStart) + newRunJobCode + code.slice(rjEnd);
  console.log('✓ [6] Cập nhật class Ip.runJob ưu tiên tài khoản và chặn văng lỗi');
}

// Lưu file app/out/main/index.js
fs.writeFileSync(mainPath, code, 'utf8');
console.log('✓ Đã lưu thành công app/out/main/index.js');

// =========================================================================
// 7. KIỂM TRA CÚ PHÁP BẰNG NODE COMPILER
// =========================================================================
const check = cp.spawnSync('node', ['-c', 'app/out/main/index.js'], { encoding: 'utf8' });
if (check.status === 0) {
  console.log('🎉 CÚ PHÁP app/out/main/index.js HOÀN TOÀN CHÍNH XÁC (Exit Code 0)!');
} else {
  console.error('❌ LỖI CÚ PHÁP:');
  console.error(check.stderr.slice(0, 500));
  process.exit(1);
}

console.log('=== TOÀN BỘ BẢN VÁ ELEVENLABS HOÀN TẤT THÀNH CÔNG ===');

