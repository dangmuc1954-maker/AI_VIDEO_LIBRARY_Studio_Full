const fs = require('fs');
const path = require('path');

const mainPath = path.resolve(__dirname, '../app/out/main/index.js');
let content = fs.readFileSync(mainPath, 'utf8');

// 1. In function Xn(r,e):
// Replace anonymous elevenlabs bypass with account check and round-robin load balancer
const targetXn = 'function Xn(r,e){if(r.providerId==="elevenlabs")return{...r,accountId:"anonymous",account:"Anonymous ElevenLabs",payload:{...r.payload,accountSelection:"auto"}};if(r.accountId)return r;';

const replacementXn = `function Xn(r,e){if(r.providerId==="elevenlabs"){const allEleven=T.listSessions().filter(s=>(s.providerId==="elevenlabs"||s.providerId==="elevenlabs-tts")&&!s.disabled&&(s.authStatus==="Logged In"||(s.cookieCount&&s.cookieCount>0)));if(allEleven.length===0)return null;if(r.accountId&&allEleven.some(u=>u.accountId===r.accountId)){const m=allEleven.find(u=>u.accountId===r.accountId);return{...r,accountId:m.accountId,account:m.accountDisplayName||m.accountEmail||m.accountName||"ElevenLabs",payload:{...r.payload,accountSelection:"auto"}};}const sorted=allEleven.map(u=>({candidate:u,activeJobs:U.countOpenJobsForAccount(u.accountId)+(e?.get(u.accountId)||0)})).sort((u,d)=>{const diff=u.activeJobs-d.activeJobs;return diff!==0?diff:u.candidate.accountName.localeCompare(d.candidate.accountName)});const minActive=sorted[0].activeJobs;const lowest=sorted.filter(u=>u.activeJobs===minActive);const key=\`elevenlabs:\${r.type}\`;const seq=En.get(key)||0;const picked=lowest[seq%lowest.length].candidate;En.set(key,seq+1);return{...r,accountId:picked.accountId,account:picked.accountDisplayName||picked.accountEmail||picked.accountName||"ElevenLabs",payload:{...r.payload,accountSelection:"auto"}};}if(r.accountId)return r;`;

if (!content.includes(targetXn)) {
  console.error('Target targetXn not found!');
  process.exit(1);
}
content = content.replace(targetXn, replacementXn);
console.log('✓ Updated Xn to enforce ElevenLabs accounts & round-robin load-balancing');

// 2. In function _B(r,e):
// Prepend ElevenLabs queue dispatcher block with round-robin and failure when 0 accounts
const targetB = 'function _B(r,e){if((r.type==="Video"||r.type==="Image")&&(r.providerId==="muse"';

const replacementB = `function _B(r,e){if(r.providerId==="elevenlabs"&&r.type==="TTS"){const allEleven=T.listSessions().filter(s=>(s.providerId==="elevenlabs"||s.providerId==="elevenlabs-tts")&&!s.disabled);const loggedEleven=allEleven.filter(s=>s.authStatus==="Logged In"||(s.cookieCount&&s.cookieCount>0));const pool=loggedEleven.length>0?loggedEleven:allEleven;if(pool.length===0||loggedEleven.length===0){U.failJob(r.id,"Chưa có tài khoản ElevenLabs nào trong Browser Hub. Vui lòng thêm và đăng nhập tài khoản ElevenLabs để tạo giọng đọc.","ELEVENLABS_ACCOUNT_REQUIRED");return null;}if(r.accountId&&pool.some(p=>p.accountId===r.accountId)){const matched=pool.find(p=>p.accountId===r.accountId);return{accountId:matched.accountId,account:matched.accountDisplayName||matched.accountEmail||matched.accountName||"ElevenLabs"};}global.__elevenlabs_dispatch_counter=(global.__elevenlabs_dispatch_counter||0)+1;const picked=pool[(global.__elevenlabs_dispatch_counter-1)%pool.length];return{accountId:picked.accountId,account:picked.accountDisplayName||picked.accountEmail||picked.accountName||"ElevenLabs"};}if((r.type==="Video"||r.type==="Image")&&(r.providerId==="muse"`;

if (!content.includes(targetB)) {
  console.error('Target targetB not found!');
  process.exit(1);
}
content = content.replace(targetB, replacementB);
console.log('✓ Updated _B with ElevenLabs queue dispatch and account requirement');

// 3. In class Ip:
// Update validateJob and runJob to require and use account session
const targetValidateJob = 'async validateJob(e){if(!this.supports(e.type))throw new p("UNSUPPORTED_MODEL",`elevenlabs cannot run ${e.type} jobs`);if(!this.readText(e))throw new p("PROVIDER_REJECTED","ElevenLabs TTS jobs require text input")}';

const replacementValidateJob = `async validateJob(e){if(!this.supports(e.type))throw new p("UNSUPPORTED_MODEL",\`elevenlabs cannot run \${e.type} jobs\`);if(!this.readText(e))throw new p("PROVIDER_REJECTED","ElevenLabs TTS jobs require text input");const allEleven=T.listSessions().filter(s=>(s.providerId==="elevenlabs"||s.providerId==="elevenlabs-tts")&&!s.disabled&&(s.authStatus==="Logged In"||(s.cookieCount&&s.cookieCount>0)));if(allEleven.length===0)throw new p("AUTH_REQUIRED","Chưa có tài khoản ElevenLabs nào trong Browser Hub. Vui lòng thêm và đăng nhập tài khoản ElevenLabs để tạo giọng đọc.",!1,{providerReason:"ELEVENLABS_ACCOUNT_REQUIRED"});}`;

if (!content.includes(targetValidateJob)) {
  console.error('Target targetValidateJob not found!');
  process.exit(1);
}
content = content.replace(targetValidateJob, replacementValidateJob);
console.log('✓ Updated Ip.validateJob to verify account existence');

// 4. In class Ip.runJob:
// Pull accountSession, read cookies, pass to generateAudio, and report progress with account name
const targetRunJobStart = 'async runJob(e,t){await this.validateJob(e);const A=this.readText(e),o=this.readVoiceId(e),n=this.readModelId(e),a=this.readVoiceSettings(e);y("elevenlabs-tts","tts job started",{jobId:e.id,textLength:A.length,voiceId:o,modelId:n});';

const replacementRunJobStart = `async runJob(e,t){await this.validateJob(e);const A=this.readText(e),o=this.readVoiceId(e),n=this.readModelId(e),a=this.readVoiceSettings(e);let accountSession=e.accountId&&e.accountId!=="anonymous"?T.findSession(e.accountId):null;if(!accountSession){const allEleven=T.listSessions().filter(s=>(s.providerId==="elevenlabs"||s.providerId==="elevenlabs-tts")&&!s.disabled&&(s.authStatus==="Logged In"||(s.cookieCount&&s.cookieCount>0)));if(allEleven.length===0)throw new p("AUTH_REQUIRED","Chưa có tài khoản ElevenLabs nào trong Browser Hub. Vui lòng thêm và đăng nhập tài khoản ElevenLabs để tạo giọng đọc.",!1,{providerReason:"ELEVENLABS_ACCOUNT_REQUIRED"});accountSession=allEleven[0];}let cookieHeader="";if(accountSession?.partition){try{const ses=Re.fromPartition(accountSession.partition);const cookies=await ses.cookies.get({domain:"elevenlabs.io"});if(cookies&&cookies.length>0)cookieHeader=cookies.map(c=>\`\${c.name}=\${c.value}\`).join("; ")}catch(_){}}const accName=accountSession.accountDisplayName||accountSession.accountEmail||accountSession.accountName||"ElevenLabs";t.updateProgress(10,\`Đang chuẩn bị tạo giọng đọc với \${accName}...\`);y("elevenlabs-tts","tts job started",{jobId:e.id,textLength:A.length,voiceId:o,modelId:n,accountId:accountSession.accountId,accountName:accName});`;

if (!content.includes(targetRunJobStart)) {
  console.error('Target targetRunJobStart not found!');
  process.exit(1);
}
content = content.replace(targetRunJobStart, replacementRunJobStart);
console.log('✓ Updated Ip.runJob start with account session binding & cookie extraction');

// 5. In class Ip.runJob call to generateAudio:
const targetGenAudio = 'c=(await this.ttsClient.generateAudio({text:A,voiceId:o,modelId:n,voiceSettings:a,hcaptchaToken:i,signal:t.signal})).audioBase64;';
const replacementGenAudio = 'c=(await this.ttsClient.generateAudio({text:A,voiceId:o,modelId:n,voiceSettings:a,hcaptchaToken:i,cookieHeader,signal:t.signal})).audioBase64;';

if (!content.includes(targetGenAudio)) {
  console.error('Target targetGenAudio not found!');
  process.exit(1);
}
content = content.replace(targetGenAudio, replacementGenAudio);
console.log('✓ Updated ttsClient.generateAudio call to pass cookieHeader');

// 6. In mp.generateAudio:
const targetMpGen = 'class mp{async generateAudio(e){const{text:t,voiceId:A,modelId:o,voiceSettings:n,hcaptchaToken:a,signal:s}=e,';
const replacementMpGen = 'class mp{async generateAudio(e){const{text:t,voiceId:A,modelId:o,voiceSettings:n,hcaptchaToken:a,cookieHeader:ch,signal:s}=e,';

if (!content.includes(targetMpGen)) {
  console.error('Target targetMpGen not found!');
  process.exit(1);
}
content = content.replace(targetMpGen, replacementMpGen);

const targetMpHeaders = 'headers:{"Content-Type":"application/json",Accept:"text/event-stream"}';
const replacementMpHeaders = 'headers:{"Content-Type":"application/json",Accept:"text/event-stream",...(ch?{Cookie:ch}:{})}';

if (!content.includes(targetMpHeaders)) {
  console.error('Target targetMpHeaders not found!');
  process.exit(1);
}
content = content.replace(targetMpHeaders, replacementMpHeaders);
console.log('✓ Updated mp.generateAudio to attach Cookie header');

// Save file
fs.writeFileSync(mainPath, content, 'utf8');
console.log('✓ Successfully wrote modifications to app/out/main/index.js');
