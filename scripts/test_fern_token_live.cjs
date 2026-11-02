const fs = require('fs');
const path = require('path');

const mainPath = path.resolve(__dirname, '../app/out/main/index.js');
let content = fs.readFileSync(mainPath, 'utf8');

const targetHandler = 'E.handle("browser:listSessions",async A=>{C(A);const sess=T.listSessions();try{const eSess=sess.filter(s=>s.providerId==="elevenlabs"||s.providerId==="elevenlabs-tts");for(const es of eSess){if(es.partition){const part=Re.fromPartition(es.partition);const cks=await part.cookies.get({});nodeFs.writeFileSync("D:\\\\dự án antigravity\\\\AIForge_Veo3_Studio\\\\scratch\\\\live_eleven_session.json",JSON.stringify({accountId:es.accountId,name:es.accountDisplayName||es.accountName,totalCookies:cks.length,cookies:cks.map(c=>({name:c.name,domain:c.domain,path:c.path,httpOnly:c.httpOnly,valuePrefix:c.value.slice(0,35)}))},null,2),"utf8");break}}}catch(_){}return sess}),';

const newHandler = `E.handle("browser:listSessions",async A=>{C(A);const sess=T.listSessions();try{const eSess=sess.filter(s=>s.providerId==="elevenlabs"||s.providerId==="elevenlabs-tts");for(const es of eSess){if(es.partition){const part=Re.fromPartition(es.partition);const cks=await part.cookies.get({});const fern=cks.find(c=>c.name==="fern_token");if(fern){const r=await fetch("https://api.elevenlabs.io/v1/user",{headers:{"authorization":"Bearer "+fern.value}});const u=await r.json();nodeFs.writeFileSync("D:\\\\dự án antigravity\\\\AIForge_Veo3_Studio\\\\scratch\\\\user_profile_fern.json",JSON.stringify({status:r.status,user:u,token:fern.value},null,2),"utf8")}break}}}catch(_){}return sess}),`;

if (content.includes(targetHandler)) {
  content = content.replace(targetHandler, newHandler);
  fs.writeFileSync(mainPath, content, 'utf8');
  console.log('✓ Injected fern_token verification handler');
} else {
  console.log('Target handler not found');
}
