const fs = require('fs');
const path = require('path');

const mainPath = path.resolve(__dirname, '../app/out/main/index.js');
let content = fs.readFileSync(mainPath, 'utf8');

// Target the start of runJob in Ip
const ipMarker = 'class Ip{constructor(e,t){this.captchaService=e,this.ttsClient=t}';
const rjMarker = 'async runJob(e,t){await this.validateJob(e);';

if (!content.includes(ipMarker)) {
  console.error('Target ipMarker not found!');
  process.exit(1);
}

const ipPos = content.indexOf(ipMarker);
const rjPos = content.indexOf(rjMarker, ipPos);

const loopStartMarker = 'for(let d=1;d<=VA;d+=1){';
const loopPos = content.indexOf(loopStartMarker, rjPos);

// The block between rjMarker and loopStartMarker
const currentPrepBlock = content.slice(rjPos, loopPos);
console.log('Current prep block length:', currentPrepBlock.length);

const newPrepBlock = `async runJob(e,t){await this.validateJob(e);const A=this.readText(e),o=this.readVoiceId(e),n=this.readModelId(e),a=this.readVoiceSettings(e);let accountSession=e.accountId&&e.accountId!=="anonymous"?T.findSession(e.accountId):null;if(!accountSession){const allEleven=T.listSessions().filter(s=>(s.providerId==="elevenlabs"||s.providerId==="elevenlabs-tts")&&!s.disabled&&(s.authStatus==="Logged In"||(s.cookieCount&&s.cookieCount>0)));if(allEleven.length===0)throw new p("AUTH_REQUIRED","Chưa có tài khoản ElevenLabs nào trong Browser Hub. Vui lòng thêm và đăng nhập tài khoản ElevenLabs để tạo giọng đọc.",!1,{providerReason:"ELEVENLABS_ACCOUNT_REQUIRED"});accountSession=allEleven[0];}const accName=accountSession.accountDisplayName||accountSession.accountEmail||accountSession.accountName||"ElevenLabs";t.updateProgress(10,\`Đang kết nối tài khoản ElevenLabs: \${accName}...\`);let cookieHeader="";if(accountSession?.partition){try{const ses=Re.fromPartition(accountSession.partition);const cookies=await ses.cookies.get({});if(cookies&&cookies.length>0)cookieHeader=cookies.map(c=>\`\${c.name}=\${c.value}\`).join("; ");}catch(_){}}let authToken=null,apiKey=null;try{let viewObj=W.views.get(accountSession.accountId);if(!viewObj||viewObj.view.webContents.isDestroyed())viewObj=W.getOrCreateView(accountSession);const curUrl=viewObj.view.webContents.getURL();if(!curUrl||curUrl==="about:blank"){await W.loadUrl(viewObj,accountSession.startUrl||"https://elevenlabs.io/app",{timeoutMs:15e3}).catch(()=>{});}const ext=await viewObj.view.webContents.executeJavaScript(\`(async()=>{try{const tok=await new Promise(r=>{try{const req=indexedDB.open("firebaseLocalStorageDb");req.onsuccess=()=>{try{const db=req.result,tx=db.transaction(["firebaseLocalStorage"],"readonly"),st=tx.objectStore("firebaseLocalStorage"),all=st.getAll();all.onsuccess=()=>{for(const it of all.result||[]){const t=it?.value?.stsTokenManager?.accessToken;if(t)return r(t)}r(null)};all.onerror=()=>r(null)}catch(_){r(null)}};req.onerror=()=>r(null)}catch(_){r(null)}});if(tok)return{token:tok};for(let i=0;i<localStorage.length;i++){const k=localStorage.key(i)||"",v=localStorage.getItem(k)||"";if(v.startsWith("sk_"))return{apiKey:v};if(k.toLowerCase().includes("token")&&v.length>50)return{token:v}}return null}catch(_){return null}})()\`,!0).catch(()=>null);if(ext?.token)authToken=ext.token;if(ext?.apiKey)apiKey=ext.apiKey;}catch(_){}y("elevenlabs-tts","tts job started",{jobId:e.id,textLength:A.length,voiceId:o,modelId:n,accountId:accountSession.accountId,accountName:accName,hasAuthToken:Boolean(authToken),hasApiKey:Boolean(apiKey)});const s=Date.now();let i,c,g;if(authToken||apiKey){t.updateProgress(35,\`Đang tạo giọng đọc với tài khoản \${accName}...\`);try{c=(await this.ttsClient.generateAudio({text:A,voiceId:o,modelId:n,voiceSettings:a,cookieHeader,authToken,apiKey,signal:t.signal})).audioBase64;}catch(l){g=l;y("elevenlabs-tts","authenticated request failed, falling back to captcha",{error:v(l)});}}if(!c)`;

content = content.slice(0, rjPos) + newPrepBlock + content.slice(loopPos);
console.log('✓ Successfully spliced new account token extraction & authenticated call into Ip.runJob');

fs.writeFileSync(mainPath, content, 'utf8');
console.log('✓ Saved app/out/main/index.js successfully!');
