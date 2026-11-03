const fs = require('fs');
const path = require('path');
const cp = require('child_process');

console.log('=== BẮT ĐẦU NÂNG CẤP TÍNH NĂNG CHỌN TÀI KHOẢN VÀ BẢN QUYỀN ELEVENLABS ===');

// =========================================================================
// 1. PATCH WaveSurferPlayer-Tk3eqMz7.js
// =========================================================================
const wavePath = path.resolve(__dirname, '../app/out/renderer/assets/WaveSurferPlayer-Tk3eqMz7.js');
let waveContent = fs.readFileSync(wavePath, 'utf8');

// Target 1: $(n,e,t) default account
const oldDollar = 'count:1,account:"Anonymous ElevenLabs",status:"Pending"';
const newDollar = 'count:1,account:t?.account||"Auto",status:"Pending"';
if (waveContent.includes(oldDollar)) {
  waveContent = waveContent.replaceAll(oldDollar, newDollar);
  console.log('✓ Updated $(n,e,t) default account from Anonymous ElevenLabs to Auto');
}

// Target 2: applySelectedPromptSettings copying account
const oldApplySettings = 'o={provider:s.provider,voiceName:s.voiceName,voiceId:s.voiceId,modelId:s.modelId,language:s.language,count:1,stability:s.stability';
const newApplySettings = 'o={provider:s.provider,account:s.account,voiceName:s.voiceName,voiceId:s.voiceId,modelId:s.modelId,language:s.language,count:1,stability:s.stability';
if (waveContent.includes(oldApplySettings)) {
  waveContent = waveContent.replace(oldApplySettings, newApplySettings);
  console.log('✓ Updated applySelectedPromptSettings to copy account');
}

// Target 3: gt fallback
const oldGt = 'account:n.account||"Anonymous ElevenLabs"';
const newGt = 'account:n.account||"Auto"';
if (waveContent.includes(oldGt)) {
  waveContent = waveContent.replaceAll(oldGt, newGt);
  console.log('✓ Updated gt fallback account to Auto');
}

fs.writeFileSync(wavePath, waveContent, 'utf8');
console.log('✓ Saved WaveSurferPlayer-Tk3eqMz7.js');

// =========================================================================
// 2. PATCH TTSStudio-DfUKIn_N.js
// =========================================================================
const ttsPath = path.resolve(__dirname, '../app/out/renderer/assets/TTSStudio-DfUKIn_N.js');
let ttsContent = fs.readFileSync(ttsPath, 'utf8');

// Ensure accountOptions in Xs has friendly labels
const oldAccOpt = 'const accountOptions=m.useMemo(()=>[{value:"Auto",label:"Tự động phân bổ"},...elevenSessions.map(st=>({value:st.accountDisplayName||st.accountName||st.accountId,label:st.accountDisplayName||st.accountName||st.accountId}))],[elevenSessions]);';
const newAccOpt = 'const accountOptions=m.useMemo(()=>[{value:"Auto",label:"Tự động phân bổ (Load-balancing)"},...elevenSessions.map(st=>({value:st.accountDisplayName||st.accountName||st.accountId,label:(st.accountDisplayName||st.accountName||st.accountId)+(st.authStatus==="Logged In"?" (Đã đăng nhập)":"")}))],[elevenSessions]);';
if (ttsContent.includes(oldAccOpt)) {
  ttsContent = ttsContent.replace(oldAccOpt, newAccOpt);
  console.log('✓ Updated accountOptions in Xs with friendly status');
}

// In Drawer hs: add Account Selector section right above voice settings
const targetDrawerAnchor = 'e.jsxs("section",{className:"rounded-xl border border-[#2e2956] bg-[#1c1836] p-3.5 space-y-3 shadow-sm",children:[e.jsx("label",{className:"block text-[10px] font-bold text-slate-300 uppercase tracking-wider select-none",children:i("ttsStudio.voiceSettings")})';
const replacementDrawerAnchor = `e.jsxs("section",{className:"rounded-xl border border-[#2e2956] bg-[#1c1836] p-3.5 space-y-3 shadow-sm",children:[e.jsx("label",{className:"block text-[10px] font-bold text-slate-300 uppercase tracking-wider select-none",children:"Tài khoản Browser Hub"}),e.jsxs("div",{className:"flex items-center justify-between gap-3",children:[e.jsxs("div",{className:"flex items-center gap-2.5 min-w-0",children:[e.jsx("div",{className:"w-8 h-8 rounded-lg bg-[#271e4d] border border-[#443880] text-[#c084fc] flex items-center justify-center shrink-0 shadow-inner",children:e.jsx(De,{size:14})}),e.jsxs("div",{className:"min-w-0",children:[e.jsx("span",{className:"block text-xs font-bold text-white leading-tight truncate",children:r.account||"Tự động phân bổ"}),e.jsx("span",{className:"block text-[10px] text-slate-400 mt-0.5 select-none font-medium",children:"Tài khoản phát âm thanh"})]})]}),e.jsx(Be,{value:r.account||"Auto",options:accountOptions||[{value:"Auto",label:"Tự động phân bổ"}],onChange:o=>c(r.id,{account:o}),className:"min-w-[150px] max-w-[210px] h-8 justify-between"})]})]}),e.jsxs("section",{className:"rounded-xl border border-[#2e2956] bg-[#1c1836] p-3.5 space-y-3 shadow-sm",children:[e.jsx("label",{className:"block text-[10px] font-bold text-slate-300 uppercase tracking-wider select-none",children:i("ttsStudio.voiceSettings")})`;

if (!ttsContent.includes('children:"Tài khoản phát âm thanh"')) {
  if (ttsContent.includes(targetDrawerAnchor)) {
    ttsContent = ttsContent.replace(targetDrawerAnchor, replacementDrawerAnchor);
    console.log('✓ Injected Account Selector section into Drawer hs');
  } else {
    console.warn('! targetDrawerAnchor not found in TTSStudio-DfUKIn_N.js');
  }
}

fs.writeFileSync(ttsPath, ttsContent, 'utf8');
console.log('✓ Saved TTSStudio-DfUKIn_N.js');

// =========================================================================
// 3. PATCH app/out/main/index.js
// =========================================================================
const mainPath = path.resolve(__dirname, '../app/out/main/index.js');
let mainContent = fs.readFileSync(mainPath, 'utf8');

// 3.1. Add IPC handlers for getElevenLabsKey and setElevenLabsKey
const listSessionsTarget = 'E.handle("browser:listSessions",A=>(C(A),T.listSessions())),';
const elevenIpcHandlers = `E.handle("browser:getElevenLabsKey",(A,o)=>{C(A);try{const p=nodePath.join(F.getPath("userData"),"elevenlabs-keys.json");if(nodeFs.existsSync(p)){const d=JSON.parse(nodeFs.readFileSync(p,"utf8"));if(o&&d[o])return d[o];return d.default||d.apiKey||Object.values(d)[0]||""}}catch(_){}return""}),E.handle("browser:setElevenLabsKey",(A,o)=>{C(A);try{const p=nodePath.join(F.getPath("userData"),"elevenlabs-keys.json");let d={};if(nodeFs.existsSync(p)){try{d=JSON.parse(nodeFs.readFileSync(p,"utf8"))}catch(_){}}const k=typeof o=="string"?o.trim():typeof o?.key=="string"?o.key.trim():"";if(o?.accountId){d[o.accountId]=k}d.default=k,d.apiKey=k,nodeFs.writeFileSync(p,JSON.stringify(d,null,2),"utf8");return true}catch(_){return false}}),`;

if (!mainContent.includes('browser:getElevenLabsKey')) {
  if (mainContent.includes(listSessionsTarget)) {
    mainContent = mainContent.replace(listSessionsTarget, listSessionsTarget + elevenIpcHandlers);
    console.log('✓ Added browser:getElevenLabsKey and browser:setElevenLabsKey IPC handlers');
  } else {
    console.error('! listSessionsTarget not found in main/index.js');
  }
}

// 3.2. Update function Xn(r,e) to intelligently pick logged-in ElevenLabs account
const targetXn = 'function Xn(r,e){if(r.providerId==="elevenlabs")return{...r,accountId:"anonymous",account:"Anonymous ElevenLabs",payload:{...r.payload,accountSelection:"auto"}};if(r.accountId)return r;';
const replacementXn = `function Xn(r,e){if(r.providerId==="elevenlabs"){const allEleven=T.listSessions().filter(s=>(s.providerId==="elevenlabs"||s.providerId==="elevenlabs-tts"||(s.provider&&s.provider.toLowerCase().includes("elevenlabs")))&&!s.disabled&&(s.authStatus==="Logged In"||(s.cookieCount&&s.cookieCount>0)));if(r.accountId&&r.accountId!=="anonymous"&&r.accountId!=="Auto"&&allEleven.some(u=>u.accountId===r.accountId||u.accountDisplayName===r.accountId||u.accountName===r.accountId)){const m=allEleven.find(u=>u.accountId===r.accountId||u.accountDisplayName===r.accountId||u.accountName===r.accountId);return{...r,accountId:m.accountId,account:m.accountDisplayName||m.accountEmail||m.accountName||"ElevenLabs",payload:{...r.payload,accountSelection:"manual"}};}if(allEleven.length>0){const sorted=allEleven.map(u=>({candidate:u,activeJobs:U.countOpenJobsForAccount(u.accountId)+(e?.get(u.accountId)||0)})).sort((u,d)=>{const diff=u.activeJobs-d.activeJobs;return diff!==0?diff:u.candidate.accountName.localeCompare(d.candidate.accountName)});const minActive=sorted[0].activeJobs;const lowest=sorted.filter(u=>u.activeJobs===minActive);const key=\`elevenlabs:\${r.type}\`;const seq=En.get(key)||0;const picked=lowest[seq%lowest.length].candidate;En.set(key,seq+1);return{...r,accountId:picked.accountId,account:picked.accountDisplayName||picked.accountEmail||picked.accountName||"ElevenLabs",payload:{...r.payload,accountSelection:"auto"}};}try{const kp=nodePath.join(F.getPath("userData"),"elevenlabs-keys.json");if(nodeFs.existsSync(kp)){const kd=JSON.parse(nodeFs.readFileSync(kp,"utf8"));const k=kd.default||kd.apiKey||Object.values(kd)[0];if(k&&k.trim().length>10)return{...r,accountId:"api-key",account:"ElevenLabs API Key",payload:{...r.payload,accountSelection:"auto"}};}}catch(_){}return{...r,accountId:"anonymous",account:"Anonymous ElevenLabs",payload:{...r.payload,accountSelection:"auto"}};}if(r.accountId)return r;`;

if (mainContent.includes(targetXn)) {
  mainContent = mainContent.replace(targetXn, replacementXn);
  console.log('✓ Updated function Xn with ElevenLabs account round-robin load balancer');
} else {
  console.log('function Xn target already updated or not matched');
}

// 3.3. Update function _B(r,e) for ElevenLabs
const targetB = 'function _B(r,e){if((r.type==="Video"||r.type==="Image"||r.type==="image")&&(r.providerId==="muse"';
const replacementB = `function _B(r,e){if(r.providerId==="elevenlabs"||r.provider==="ElevenLabs"||r.type==="TTS"){const allEleven=T.listSessions().filter(s=>(s.providerId==="elevenlabs"||s.providerId==="elevenlabs-tts"||(s.provider&&s.provider.toLowerCase().includes("elevenlabs")))&&!s.disabled);const loggedEleven=allEleven.filter(s=>s.authStatus==="Logged In"||(s.cookieCount&&s.cookieCount>0));const pool=loggedEleven.length>0?loggedEleven:allEleven;if(r.accountId&&r.accountId!=="anonymous"&&r.accountId!=="Auto"&&pool.some(p=>p.accountId===r.accountId||p.accountDisplayName===r.accountId||p.accountName===r.accountId)){const matched=pool.find(p=>p.accountId===r.accountId||p.accountDisplayName===r.accountId||p.accountName===r.accountId);return{accountId:matched.accountId,account:matched.accountDisplayName||matched.accountEmail||matched.accountName||"ElevenLabs"};}if(pool.length>0){global.__elevenlabs_dispatch_counter=(global.__elevenlabs_dispatch_counter||0)+1;const picked=pool[(global.__elevenlabs_dispatch_counter-1)%pool.length];return{accountId:picked.accountId,account:picked.accountDisplayName||picked.accountEmail||picked.accountName||"ElevenLabs"};}try{const kp=nodePath.join(F.getPath("userData"),"elevenlabs-keys.json");if(nodeFs.existsSync(kp)){const kd=JSON.parse(nodeFs.readFileSync(kp,"utf8"));const k=kd.default||kd.apiKey||Object.values(kd)[0];if(k&&k.trim().length>10)return{accountId:"api-key",account:"ElevenLabs API Key"};}}catch(_){}return{accountId:r.accountId||"anonymous",account:r.account||"Anonymous ElevenLabs"};}if((r.type==="Video"||r.type==="Image"||r.type==="image")&&(r.providerId==="muse"`;

if (mainContent.includes(targetB)) {
  mainContent = mainContent.replace(targetB, replacementB);
  console.log('✓ Updated function _B with ElevenLabs queue account resolver');
} else {
  console.log('function _B target already updated or not matched');
}

// 3.4. Token extractor helper function placed right before class Ip
const beforeIpTarget = 'function Pp(r){return/authentication_error|unauthorized request|invalid hcaptcha|captcha|hcaptcha/.test(r)}class Ip{';
const tokenExtractorFn = `async function extractElevenLabsToken(session){let tok=null;if(session?.accountId&&W){try{let viewObj=W.views.get(session.accountId);if(!viewObj||viewObj.view.webContents.isDestroyed())viewObj=W.getOrCreateView(session);const curUrl=viewObj.view.webContents.getURL();if(!curUrl||curUrl==="about:blank"){await W.loadUrl(viewObj,session.startUrl||"https://elevenlabs.io/app",{timeoutMs:12e3}).catch(()=>{});}tok=await viewObj.view.webContents.executeJavaScript(\`(async()=>{try{const tok=await new Promise(res=>{try{const req=indexedDB.open("firebaseLocalStorageDb");req.onsuccess=()=>{try{const db=req.result,tx=db.transaction(["firebaseLocalStorage"],"readonly"),st=tx.objectStore("firebaseLocalStorage"),all=st.getAll();all.onsuccess=()=>{for(const item of(all.result||[])){const t=item?.value?.stsTokenManager?.accessToken;if(t)return res(t)}res(null)};all.onerror=()=>res(null)}catch(_){res(null)}};req.onerror=()=>res(null)}catch(_){res(null)}});if(tok)return tok;for(let i=0;i<localStorage.length;i++){const k=localStorage.key(i)||"",v=localStorage.getItem(k)||"";if(v.includes("stsTokenManager")){try{const p=JSON.parse(v);if(p?.stsTokenManager?.accessToken)return p.stsTokenManager.accessToken}catch(_){}}}return null}catch(_){return null}})()\`,!0).catch(()=>null);}catch(_){}}if(!tok&&session?.partition){try{const idbBase=nodePath.join(F.getPath("userData"),"Partitions",encodeURIComponent(session.partition).replace(/%3A/g,"%3A"),"IndexedDB","https_elevenlabs.io_0.indexeddb.leveldb");if(nodeFs.existsSync(idbBase)){const files=nodeFs.readdirSync(idbBase);for(const f of files){if(f.endsWith(".log")||f.endsWith(".ldb")){const content=nodeFs.readFileSync(nodePath.join(idbBase,f)).toString("latin1");const m=content.match(/eyJhbGciOiJ[a-zA-Z0-9_\\-\\.]+/g);if(m){const valid=m.find(t=>t.length>300);if(valid){tok=valid;break;}}if(tok)break;}}}}catch(_){}}return tok;}function Pp(r){return/authentication_error|unauthorized request|invalid hcaptcha|captcha|hcaptcha/.test(r)}class Ip{`;

if (mainContent.includes(beforeIpTarget)) {
  mainContent = mainContent.replace(beforeIpTarget, tokenExtractorFn);
  console.log('✓ Injected extractElevenLabsToken helper before class Ip');
} else {
  console.log('beforeIpTarget already updated or not matched');
}

// 3.5. Replace class mp completely with safe concatenation
const mpStart = mainContent.indexOf('class mp{async generateAudio(e){const{text:t,voiceId:A,modelId:o,voiceSettings:n,hcaptchaToken:a,signal:s}=e');
const mpEnd = mainContent.indexOf('async function pp(r){', mpStart);

if (mpStart !== -1 && mpEnd !== -1) {
  const newMpClass = `class mp{async generateAudio(e){const{text:t,voiceId:A,modelId:o,voiceSettings:n,hcaptchaToken:a,authToken:at,apiKey:ak,cookieHeader:ch,signal:s}=e;const isAuth=Boolean(at||ak);const i=isAuth?(dp+"/"+A):(dp+"/"+A+"/stream/with-timestamps/anonymous");const c=new AbortController();let g=!1;const u=setTimeout(()=>{g=!0,c.abort()},za),d=()=>c.abort();s&&(s.aborted?c.abort():s.addEventListener("abort",d,{once:!0}));const l=performance.now(),m={method:"POST",url:wp(i),timeoutMs:za,textLength:t.length,isAuth};y("elevenlabs-tts","request started",m);try{const reqHeaders={"Content-Type":"application/json",Accept:isAuth?"*/*":"text/event-stream",...(at?{authorization:"Bearer "+at}:{}) ,...(ak?{"xi-api-key":ak}:{}) ,...(ch?{Cookie:ch}:{})};const reqBody={text:t,model_id:o||"eleven_multilingual_v2",voice_settings:n||{stability:0.5,similarity_boost:0.75}};if(!isAuth&&a){reqBody.hcaptcha_token=a;}const h=await fetch(i,{method:"POST",signal:c.signal,headers:reqHeaders,body:JSON.stringify(reqBody)});if(!h.ok){const P=await h.text(),w=fp(h.status,P);throw B("elevenlabs-tts","request rejected",{...m,durationMs:Math.round(performance.now()-l),status:h.status,mappedCode:w.code,body:rn(P)}),w}const cType=h.headers.get("content-type")||"";if(cType.includes("audio")||isAuth){const arrBuf=await h.arrayBuffer();const b64=Buffer.from(arrBuf).toString("base64");y("elevenlabs-tts","authenticated request completed",{...m,durationMs:Math.round(performance.now()-l),status:h.status,bytes:arrBuf.byteLength});return{audioBase64:b64,alignment:[],normalizedAlignment:[]};}const f=await pp(h);return y("elevenlabs-tts","request completed",{...m,durationMs:Math.round(performance.now()-l),status:h.status,chunks:f.alignment.length,audioBase64Length:f.audioBase64.length}),f}catch(h){throw h instanceof p?h:h instanceof Error&&h.name==="AbortError"?s?.aborted&&!g?(B("elevenlabs-tts","request cancelled",{...m,durationMs:Math.round(performance.now()-l)}),new p("UNKNOWN","ElevenLabs TTS request was cancelled",!1)):(B("elevenlabs-tts","request timed out",{...m,durationMs:Math.round(performance.now()-l)}),new p("NETWORK","ElevenLabs TTS request timed out",!0)):(B("elevenlabs-tts","request failed before provider response",{...m,durationMs:Math.round(performance.now()-l),error:v(h)}),new p("NETWORK",h instanceof Error?h.message:"ElevenLabs TTS request failed",!0))}finally{clearTimeout(u),s?.removeEventListener("abort",d)}}}`;
  mainContent = mainContent.slice(0, mpStart) + newMpClass + mainContent.slice(mpEnd);
  console.log('✓ Successfully replaced class mp with safe audio synthesis');
} else {
  console.error('! mpStart or mpEnd not found');
}

// 3.6. Replace class Ip.runJob cleanly
const ipStart = mainContent.indexOf('class Ip{');
const rjStart = mainContent.indexOf('async runJob(e,t){', ipStart);
const rjEnd = mainContent.indexOf('readText(e){', rjStart);

if (rjStart !== -1 && rjEnd !== -1) {
  const newRunJobCode = `async runJob(e,t){await this.validateJob(e);const A=this.readText(e),o=this.readVoiceId(e),n=this.readModelId(e),a=this.readVoiceSettings(e);let accountSession=e.accountId&&e.accountId!=="anonymous"&&e.accountId!=="api-key"?T.findSession(e.accountId):null;if(!accountSession){const allEleven=T.listSessions().filter(s=>(s.providerId==="elevenlabs"||s.providerId==="elevenlabs-tts"||(s.provider&&s.provider.toLowerCase().includes("elevenlabs")))&&!s.disabled&&(s.authStatus==="Logged In"||(s.cookieCount&&s.cookieCount>0)));if(allEleven.length>0)accountSession=allEleven[0];}let apiKey=null;try{const kp=nodePath.join(F.getPath("userData"),"elevenlabs-keys.json");if(nodeFs.existsSync(kp)){const kd=JSON.parse(nodeFs.readFileSync(kp,"utf8"));apiKey=kd[accountSession?.accountId]||kd.default||kd.apiKey||null;}}catch(_){}let authToken=null;if(accountSession){t.updateProgress(10,"Đang chuẩn bị xác thực "+(accountSession.accountDisplayName||accountSession.accountName||"ElevenLabs")+"...");try{authToken=await extractElevenLabsToken(accountSession);}catch(_){}}let cookieHeader="";if(accountSession?.partition){try{const ses=Re.fromPartition(accountSession.partition);const cookies=await ses.cookies.get({domain:"elevenlabs.io"});if(cookies&&cookies.length>0)cookieHeader=cookies.map(ck=>ck.name+"="+ck.value).join("; ");}catch(_){}}const accName=accountSession?(accountSession.accountDisplayName||accountSession.accountName||"ElevenLabs"):(apiKey?"API Key":"Anonymous");y("elevenlabs-tts","tts job started",{jobId:e.id,textLength:A.length,voiceId:o,modelId:n,account:accName,hasAuthToken:Boolean(authToken),hasApiKey:Boolean(apiKey)});const s=Date.now();let i,c,g;if(authToken||apiKey){t.updateProgress(30,"Đang tạo giọng đọc với "+accName+"...");try{const genRes=await this.ttsClient.generateAudio({text:A,voiceId:o,modelId:n,voiceSettings:a,authToken,apiKey,cookieHeader,signal:t.signal});c=genRes.audioBase64;}catch(authErr){g=authErr;B("elevenlabs-tts","authenticated generation error, checking fallback",{error:v(authErr)});if(authErr instanceof p&&authErr.code==="RATE_LIMITED")throw authErr;}}if(!c&&!authToken&&!apiKey){if(accountSession){throw new p("AUTH_REQUIRED","Tài khoản "+accName+" cần được mở lại trong Browser Hub để làm mới phiên đăng nhập.",!1,{providerReason:"ELEVENLABS_SESSION_EXPIRED"});}for(let d=1;d<=VA;d+=1){t.updateProgress(15,"Requesting captcha token");try{i=await this.captchaService.requestToken(t.signal,d===VA?{forceReinitialize:!0}:void 0)}catch(l){throw B("elevenlabs-tts","captcha token request failed",{jobId:e.id,attempt:d,error:v(l)}),l}t.updateProgress(35,"Generating audio");try{c=(await this.ttsClient.generateAudio({text:A,voiceId:o,modelId:n,voiceSettings:a,hcaptchaToken:i,signal:t.signal})).audioBase64;break}catch(l){if(g=l,l instanceof p){if(l.code==="RATE_LIMITED")throw B("elevenlabs-tts","rate limited; propagating to queue",{jobId:e.id,attempt:d}),l;if(l.code==="CHALLENGE_REQUIRED"){if(d<VA){B("elevenlabs-tts","challenge required; retrying with fresh captcha",{jobId:e.id,attempt:d,maxAttempts:VA,error:v(l)}),await this.delay(800*d,t.signal);continue}throw new p("CAPTCHA_FAILED","ElevenLabs captcha verification failed after all retry attempts",!1,{...l.details,providerReason:"ELEVENLABS_CAPTCHA_REJECTED"})}}throw l}}}if(!c)throw g??new p("UNKNOWN","ElevenLabs TTS failed after all captcha retry attempts");t.updateProgress(85,"Saving audio asset");const u=Date.now()-s;return y("elevenlabs-tts","tts job completed",{jobId:e.id,durationMs:u,audioSizeBytes:Math.round(c.length*3/4)}),{assets:[{type:"audio",url:"data:audio/mpeg;base64,"+c,mimeType:"audio/mpeg"}],provider:{raw:{voiceId:o,modelId:n,textLength:A.length,durationMs:u}}}}`;
  mainContent = mainContent.slice(0, rjStart) + newRunJobCode + mainContent.slice(rjEnd);
  console.log('✓ Successfully replaced class Ip.runJob with clean, non-duplicated execution');
} else {
  console.error('! rjStart or rjEnd not found');
}

fs.writeFileSync(mainPath, mainContent, 'utf8');
console.log('✓ Saved app/out/main/index.js');

// Verify syntax
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
