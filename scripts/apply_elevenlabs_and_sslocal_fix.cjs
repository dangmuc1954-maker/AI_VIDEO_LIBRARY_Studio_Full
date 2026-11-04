const fs = require('fs');
const path = require('path');
const cp = require('child_process');

console.log('=== BẮT ĐẦU VÁ TOÀN DIỆN LỖI ELEVENLABS & CHẶN POPUP SSLOCAL / MICROSOFT STORE ===');

// =========================================================================
// 1. PATCH app/out/main/index.js
// =========================================================================
const mainPath = path.resolve(__dirname, '../app/out/main/index.js');
let mainContent = fs.readFileSync(mainPath, 'utf8');

// 1.1. Patch mB() for global web-contents protocol blocking
const oldMb = 'function mB(){F.isPackaged&&F.on("web-contents-created",(r,e)=>{e.on("before-input-event",(t,A)=>{pB(A)&&t.preventDefault()}),e.on("devtools-opened",()=>{e.closeDevTools()})})}';
const newMb = `function mB(){F.on("web-contents-created",(r,e)=>{try{e.setWindowOpenHandler(d=>{const u=d.url||"";if(!u.startsWith("http://")&&!u.startsWith("https://")&&!u.startsWith("about:")){return{action:"deny"}}return{action:"allow"}});const _bn=(ev,url)=>{if(!url)return;if(!url.startsWith("http://")&&!url.startsWith("https://")&&!url.startsWith("about:")&&!url.startsWith("data:")&&!url.startsWith("blob:")){try{ev.preventDefault()}catch(_){}}};e.on("will-navigate",_bn);e.on("will-redirect",_bn);e.on("will-frame-navigate",_bn)}catch(_){}if(F.isPackaged){e.on("before-input-event",(t,A)=>{pB(A)&&t.preventDefault()}),e.on("devtools-opened",()=>{e.closeDevTools()})}})}`;

if (mainContent.includes(oldMb)) {
  mainContent = mainContent.replace(oldMb, newMb);
  console.log('✓ Updated mB() with global custom protocol blocking (kills sslocal/store)');
} else {
  console.log('mB() already patched or different');
}

// 1.2. Patch getOrCreateView for local WebContentsView protocol blocking
const oldViewCreate = 'const A=new Ji({webPreferences:{partition:e.partition,contextIsolation:!0,nodeIntegration:!1,sandbox:!0,devTools:!F.isPackaged}});A.webContents.on("did-start-navigation"';
const newViewCreate = 'const A=new Ji({webPreferences:{partition:e.partition,contextIsolation:!0,nodeIntegration:!1,sandbox:!0,devTools:!F.isPackaged}});try{A.webContents.setWindowOpenHandler(d=>{const u=d.url||"";if(!u.startsWith("http://")&&!u.startsWith("https://")&&!u.startsWith("about:")){return{action:"deny"}}return{action:"allow"}});const _bn=(ev,url)=>{if(url&&!url.startsWith("http://")&&!url.startsWith("https://")&&!url.startsWith("about:")&&!url.startsWith("data:")&&!url.startsWith("blob:")){try{ev.preventDefault()}catch(_){}}};A.webContents.on("will-navigate",_bn);A.webContents.on("will-redirect",_bn);A.webContents.on("will-frame-navigate",_bn)}catch(_){}A.webContents.on("did-start-navigation"';

if (mainContent.includes(oldViewCreate)) {
  mainContent = mainContent.replace(oldViewCreate, newViewCreate);
  console.log('✓ Added custom protocol guard to getOrCreateView WebContentsView');
} else {
  console.log('getOrCreateView already patched or different');
}

// 1.3. Inject extractElevenLabsToken helper right before class Ip
const beforeIpAnchor = 'function Pp(r){return/authentication_error|unauthorized request|invalid hcaptcha|captcha|hcaptcha/.test(r)}class Ip{';
const tokenExtractorFn = `async function extractElevenLabsToken(session,forceRefresh=!1){let tok=null;const now=Date.now();if(!forceRefresh&&session?.partition){try{const cleanPart=(session.partition||"").replace(/^persist:/,"");const encoded=encodeURIComponent(cleanPart);const baseDir=L(F.getPath("userData"),"Partitions",encoded);const dirs=[L(baseDir,"IndexedDB","https_elevenlabs.io_0.indexeddb.leveldb"),L(baseDir,"Local Storage","leveldb")];let newestExp=0;for(const d of dirs){if(!nodeFs.existsSync(d))continue;const files=nodeFs.readdirSync(d);for(const f of files){if(!f.endsWith(".log")&&!f.endsWith(".ldb"))continue;try{const content=nodeFs.readFileSync(L(d,f)).toString("latin1");const matches=content.match(/eyJhbGciOiJ[a-zA-Z0-9_\\-\\.]+/g)||[];for(const candidate of matches){if(candidate.length<300)continue;try{const parts=candidate.split(".");if(parts.length===3){const payload=JSON.parse(Buffer.from(parts[1],"base64").toString("utf8"));if(payload.iss&&payload.iss.includes("xi-labs")){const exp=(payload.exp||0)*1e3;if(exp>newestExp){newestExp=exp;tok=candidate;}}}}catch(_){}}}catch(_){}}}if(tok&&newestExp>now+3e4)return tok;}catch(_){}}if(session?.accountId&&W){try{let viewObj=W.views.get(session.accountId);if(!viewObj||viewObj.view.webContents.isDestroyed())viewObj=W.getOrCreateView(session);const curUrl=viewObj.view.webContents.getURL()||"";if(!curUrl||curUrl==="about:blank"||!curUrl.includes("elevenlabs.io")){await W.loadUrl(viewObj,session.startUrl||"https://elevenlabs.io/app",{timeoutMs:12e3}).catch(()=>{});}else if(forceRefresh){viewObj.view.webContents.reload();await new Promise(r=>setTimeout(r,2e3));}const viewToken=await viewObj.view.webContents.executeJavaScript(\`(async()=>{try{const tok=await new Promise(res=>{try{const req=indexedDB.open("firebaseLocalStorageDb");req.onsuccess=()=>{try{const db=req.result,tx=db.transaction(["firebaseLocalStorage"],"readonly"),st=tx.objectStore("firebaseLocalStorage"),all=st.getAll();all.onsuccess=()=>{for(const item of(all.result||[])){const t=item?.value?.stsTokenManager?.accessToken;if(t)return res(t)}res(null)};all.onerror=()=>res(null)}catch(_){res(null)}};req.onerror=()=>res(null)}catch(_){res(null)}});if(tok)return tok;for(let i=0;i<localStorage.length;i++){const k=localStorage.key(i)||"",v=localStorage.getItem(k)||"";if(v.includes("stsTokenManager")){try{const p=JSON.parse(v);if(p?.stsTokenManager?.accessToken)return p.stsTokenManager.accessToken}catch(_){}}}return null}catch(_){return null}})()\`,!0).catch(()=>null);if(viewToken)return viewToken;}catch(_){}}if(tok)return tok;return null;}function Pp(r){return/authentication_error|unauthorized request|invalid hcaptcha|captcha|hcaptcha/.test(r)}class Ip{`;

if (!mainContent.includes('async function extractElevenLabsToken')) {
  if (mainContent.includes(beforeIpAnchor)) {
    mainContent = mainContent.replace(beforeIpAnchor, tokenExtractorFn);
    console.log('✓ Successfully injected extractElevenLabsToken helper before class Ip');
  } else {
    console.error('! beforeIpAnchor not found');
  }
} else {
  console.log('extractElevenLabsToken already present in main/index.js');
}

// 1.4. Update class Ip.runJob with robust account resolution and self-healing token refresh
const ipStart = mainContent.indexOf('class Ip{');
const rjStart = mainContent.indexOf('async runJob(e,t){', ipStart);
const rjEnd = mainContent.indexOf('readText(e){', rjStart);

if (rjStart !== -1 && rjEnd !== -1) {
  const newRunJobCode = `async runJob(e,t){await this.validateJob(e);const A=this.readText(e),o=this.readVoiceId(e),n=this.readModelId(e),a=this.readVoiceSettings(e);let accountSession=e.accountId&&e.accountId!=="anonymous"&&e.accountId!=="api-key"&&e.accountId!=="Auto"?T.findSession(e.accountId):null;if(!accountSession&&e.account&&e.account!=="Auto"&&e.account!=="Anonymous ElevenLabs"){const allEleven=T.listSessions().filter(s=>(s.providerId==="elevenlabs"||s.providerId==="elevenlabs-tts"||(s.provider&&s.provider.toLowerCase().includes("elevenlabs")))&&!s.disabled);accountSession=allEleven.find(s=>s.accountDisplayName===e.account||s.accountName===e.account||s.accountId===e.account)||null;}if(!accountSession){const allEleven=T.listSessions().filter(s=>(s.providerId==="elevenlabs"||s.providerId==="elevenlabs-tts"||(s.provider&&s.provider.toLowerCase().includes("elevenlabs")))&&!s.disabled&&(s.authStatus==="Logged In"||(s.cookieCount&&s.cookieCount>0)));if(allEleven.length>0)accountSession=allEleven[0];}let apiKey=null;try{const kp=L(F.getPath("userData"),"elevenlabs-keys.json");if(nodeFs.existsSync(kp)){const kd=JSON.parse(nodeFs.readFileSync(kp,"utf8"));apiKey=kd[accountSession?.accountId]||kd.default||kd.apiKey||null;}}catch(_){}let authToken=null;if(accountSession){t.updateProgress(10,"Đang chuẩn bị xác thực "+(accountSession.accountDisplayName||accountSession.accountName||"ElevenLabs")+"...");try{authToken=await extractElevenLabsToken(accountSession);}catch(_){}}let cookieHeader="";if(accountSession?.partition){try{const ses=Re.fromPartition(accountSession.partition);const cookies=await ses.cookies.get({domain:"elevenlabs.io"});if(cookies&&cookies.length>0)cookieHeader=cookies.map(ck=>ck.name+"="+ck.value).join("; ");}catch(_){}}const accName=accountSession?(accountSession.accountDisplayName||accountSession.accountName||"ElevenLabs"):(apiKey?"API Key":"Anonymous");y("elevenlabs-tts","tts job started",{jobId:e.id,textLength:A.length,voiceId:o,modelId:n,account:accName,hasAuthToken:Boolean(authToken),hasApiKey:Boolean(apiKey)});const s=Date.now();let i,c,g;if(authToken||apiKey){t.updateProgress(30,"Đang tạo giọng đọc với "+accName+"...");try{const genRes=await this.ttsClient.generateAudio({text:A,voiceId:o,modelId:n,voiceSettings:a,authToken,apiKey,cookieHeader,signal:t.signal});c=genRes.audioBase64;}catch(authErr){g=authErr;B("elevenlabs-tts","authenticated generation error",{error:v(authErr)});if(authErr instanceof p&&authErr.code==="RATE_LIMITED")throw authErr;if(accountSession&&!apiKey){try{const freshTok=await extractElevenLabsToken(accountSession,!0);if(freshTok&&freshTok!==authToken){authToken=freshTok;t.updateProgress(32,"Đang làm mới phiên và thử lại...");const retryRes=await this.ttsClient.generateAudio({text:A,voiceId:o,modelId:n,voiceSettings:a,authToken,apiKey,cookieHeader,signal:t.signal});c=retryRes.audioBase64;g=null;}}catch(_){}}}}if(!c&&!authToken&&!apiKey){if(accountSession){throw new p("AUTH_REQUIRED","Tài khoản "+accName+" cần được mở lại trong Browser Hub để làm mới phiên đăng nhập.",!1,{providerReason:"ELEVENLABS_SESSION_EXPIRED"});}for(let d=1;d<=VA;d+=1){t.updateProgress(15,"Đang yêu cầu mã bảo mật (Thử lần "+d+"/"+VA+")...");try{i=await this.captchaService.requestToken(t.signal,d===VA?{forceReinitialize:!0}:void 0)}catch(l){throw B("elevenlabs-tts","captcha token request failed",{jobId:e.id,attempt:d,error:v(l)}),l}t.updateProgress(35,"Đang tạo âm thanh...");try{c=(await this.ttsClient.generateAudio({text:A,voiceId:o,modelId:n,voiceSettings:a,hcaptchaToken:i,signal:t.signal})).audioBase64;break}catch(l){if(g=l,l instanceof p){if(l.code==="RATE_LIMITED")throw B("elevenlabs-tts","rate limited; propagating to queue",{jobId:e.id,attempt:d}),l;if(l.code==="CHALLENGE_REQUIRED"){if(d<VA){B("elevenlabs-tts","challenge required; retrying with fresh captcha",{jobId:e.id,attempt:d,maxAttempts:VA,error:v(l)}),await this.delay(800*d,t.signal);continue}throw new p("CAPTCHA_FAILED","ElevenLabs captcha verification failed after all retry attempts",!1,{...l.details,providerReason:"ELEVENLABS_CAPTCHA_REJECTED"})}}throw l}}}if(!c)throw g??new p("UNKNOWN","ElevenLabs TTS thất bại sau các lần thử bảo mật");t.updateProgress(85,"Lưu tệp âm thanh");const u=Date.now()-s;return y("elevenlabs-tts","tts job completed",{jobId:e.id,durationMs:u,audioSizeBytes:Math.round(c.length*3/4)}),{assets:[{type:"audio",url:"data:audio/mpeg;base64,"+c,mimeType:"audio/mpeg"}],provider:{raw:{voiceId:o,modelId:n,textLength:A.length,durationMs:u}}}}`;
  mainContent = mainContent.slice(0, rjStart) + newRunJobCode + mainContent.slice(rjEnd);
  console.log('✓ Successfully updated Ip.runJob with auto-recovery and fallback');
} else {
  console.error('! rjStart or rjEnd not found');
}

fs.writeFileSync(mainPath, mainContent, 'utf8');
console.log('✓ Saved app/out/main/index.js');

// =========================================================================
// 2. PATCH WaveSurferPlayer-Tk3eqMz7.js
// =========================================================================
const wavePath = path.resolve(__dirname, '../app/out/renderer/assets/WaveSurferPlayer-Tk3eqMz7.js');
let waveContent = fs.readFileSync(wavePath, 'utf8');

const oldAnon = 'account:i.account||"Anonymous ElevenLabs"';
const newAnon = 'account:i.account||"Auto"';
if (waveContent.includes(oldAnon)) {
  waveContent = waveContent.replaceAll(oldAnon, newAnon);
  console.log('✓ Updated WaveSurferPlayer remaining fallback to Auto');
  fs.writeFileSync(wavePath, waveContent, 'utf8');
}

// =========================================================================
// 3. PATCH TTSStudio-DfUKIn_N.js (Gracefully handle stale/deleted account)
// =========================================================================
const ttsPath = path.resolve(__dirname, '../app/out/renderer/assets/TTSStudio-DfUKIn_N.js');
let ttsContent = fs.readFileSync(ttsPath, 'utf8');

const oldTableRowVal = 'e.jsx(Be,{value:a.account||"Auto",options:accountOptions||[{value:"Auto",label:"Tự động phân bổ"}]';
const newTableRowVal = 'e.jsx(Be,{value:(a.account&&a.account!=="Auto"&&elevenSessions.some(st=>(st.accountDisplayName||st.accountName||st.accountId)===a.account))?a.account:"Auto",options:accountOptions||[{value:"Auto",label:"Tự động phân bổ"}]';

if (ttsContent.includes(oldTableRowVal)) {
  ttsContent = ttsContent.replace(oldTableRowVal, newTableRowVal);
  console.log('✓ Added safe account resolver in TTSStudio table row');
}

const oldDrawerVal = 'e.jsx(Be,{value:r.account||"Auto",options:accountOptions||[{value:"Auto",label:"Tự động phân bổ"}]';
const newDrawerVal = 'e.jsx(Be,{value:(r.account&&r.account!=="Auto"&&elevenSessions.some(st=>(st.accountDisplayName||st.accountName||st.accountId)===r.account))?r.account:"Auto",options:accountOptions||[{value:"Auto",label:"Tự động phân bổ"}]';

if (ttsContent.includes(oldDrawerVal)) {
  ttsContent = ttsContent.replace(oldDrawerVal, newDrawerVal);
  console.log('✓ Added safe account resolver in TTSStudio drawer');
}

fs.writeFileSync(ttsPath, ttsContent, 'utf8');
console.log('✓ Saved TTSStudio-DfUKIn_N.js');

// =========================================================================
// 4. Verify Syntax
// =========================================================================
console.log('--- Kiểm tra cú pháp app/out/main/index.js ---');
const check = cp.spawnSync('node', ['-c', 'app/out/main/index.js'], { encoding: 'utf8' });
if (check.status === 0) {
  console.log('🎉 CÚ PHÁP MAIN/INDEX.JS HOÀN TOÀN CHÍNH XÁC (Exit Code 0)!');
} else {
  console.error('❌ LỖI CÚ PHÁP:');
  console.error(check.stderr.slice(0, 500));
  process.exit(1);
}

console.log('=== TOÀN BỘ BẢN VÁ HOÀN TẤT THÀNH CÔNG ===');

