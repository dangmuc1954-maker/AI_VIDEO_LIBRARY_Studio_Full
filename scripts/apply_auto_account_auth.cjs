const fs = require('fs');
const path = require('path');

const mainPath = path.resolve(__dirname, '../app/out/main/index.js');
let content = fs.readFileSync(mainPath, 'utf8');

// 1. Add getAccountElevenAuth function
const helperCode = `
async function getAccountElevenAuth(accountSession) {
  if (!accountSession?.partition) return null;
  try {
    const pName = accountSession.partition.replace(/^persist:/, '').replace(/:/g, '%3A');
    const dir = L(F.getPath('userData'), 'Partitions', pName, 'IndexedDB', 'https_elevenlabs.io_0.indexeddb.leveldb');
    if (!nodeFs.existsSync(dir)) return null;
    let accessToken = null, refreshToken = null, email = null;
    const files = nodeFs.readdirSync(dir).sort().reverse();
    for (const f of files) {
      if (f.endsWith('.log') || f.endsWith('.ldb')) {
        const buf = nodeFs.readFileSync(L(dir, f));
        const str = buf.toString('latin1');
        const tokenMatch = str.match(/eyJhbGciOiJSUzI1NiIs[A-Za-z0-9_-]+\\.[A-Za-z0-9_-]+\\.[A-Za-z0-9_-]+/);
        const refreshMatch = str.match(/AMf-vBx[A-Za-z0-9_-]+/);
        const emailMatch = str.match(/[a-zA-Z0-9._%+-]+@gmail\\.com/);
        if (tokenMatch) {
          accessToken = tokenMatch[0];
          refreshToken = refreshMatch ? refreshMatch[0] : null;
          email = emailMatch ? emailMatch[0] : null;
          break;
        }
      }
    }
    if (!accessToken && !refreshToken) return null;
    let isExpired = false;
    if (accessToken) {
      try {
        const parts = accessToken.split('.');
        const payload = JSON.parse(Buffer.from(parts[1], 'base64').toString('utf8'));
        if (payload.exp && (payload.exp * 1000 - Date.now() < 300000)) isExpired = true;
      } catch (_) { isExpired = true; }
    } else { isExpired = true; }
    if (isExpired && refreshToken) {
      try {
        const apiKey = 'AIzaSyBSsRE_1Os04-bxpd5JTLIniy3UK4OqKys';
        const r = await fetch('https://securetoken.googleapis.com/v1/token?key=' + apiKey, {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded', 'Referer': 'https://elevenlabs.io/' },
          body: new URLSearchParams({ grant_type: 'refresh_token', refresh_token: refreshToken })
        });
        if (r.ok) {
          const d = await r.json();
          if (d.access_token) accessToken = d.access_token;
        }
      } catch (_) {}
    }
    return { accessToken, refreshToken, email };
  } catch (err) {
    return null;
  }
}
`;

if (!content.includes('function getAccountElevenAuth(')) {
  const insertBefore = 'class mp{';
  content = content.replace(insertBefore, helperCode + '\n' + insertBefore);
  console.log('✓ Injected getAccountElevenAuth helper');
}

// 2. Update mp.generateAudio to handle authToken & apiKey properly
const oldMpGen = 'class mp{async generateAudio(e){const{text:t,voiceId:A,modelId:o,voiceSettings:n,hcaptchaToken:a,cookieHeader:ch,signal:s}=e,i=`${dp}/${A}/stream/with-timestamps/anonymous`,c=new AbortController;';
const newMpGen = 'class mp{async generateAudio(e){const{text:t,voiceId:A,modelId:o,voiceSettings:n,hcaptchaToken:a,cookieHeader:ch,authToken:at,apiKey:ak,signal:s}=e,isAuth=Boolean(at||ak),i=isAuth?`${dp}/${A}/stream/with-timestamps`:`${dp}/${A}/stream/with-timestamps/anonymous`,c=new AbortController;';

if (content.includes(oldMpGen)) {
  content = content.replace(oldMpGen, newMpGen);
  console.log('✓ Updated class mp.generateAudio signature and endpoint selection');
}

// Update fetch call in mp.generateAudio
const oldFetch = 'const h=await fetch(i,{method:"POST",signal:c.signal,headers:{"Content-Type":"application/json",Accept:"text/event-stream",...(ch?{Cookie:ch}:{})},body:JSON.stringify({text:t,model_id:o,voice_settings:n,hcaptcha_token:a})});';
const newFetch = 'const h=await fetch(i,{method:"POST",signal:c.signal,headers:{"Content-Type":"application/json",Accept:"text/event-stream",...(at?{"authorization":"Bearer "+at}:ak?{"xi-api-key":ak}:ch?{Cookie:ch}:{})},body:JSON.stringify(isAuth?{text:t,model_id:o,voice_settings:n}:{text:t,model_id:o,voice_settings:n,hcaptcha_token:a})});';

if (content.includes(oldFetch)) {
  content = content.replace(oldFetch, newFetch);
  console.log('✓ Updated fetch headers and body in mp.generateAudio');
}

// 3. Update Ip.runJob to automatically extract auth for the selected account
const oldRunJobAuth = `let authToken=null,apiKey=accountSession?.apiKey||null;if(!apiKey){try{const kp=L(F.getPath("userData"),"elevenlabs-keys.json");if(nodeFs.existsSync(kp)){const kd=JSON.parse(nodeFs.readFileSync(kp,"utf8"));apiKey=kd[accountSession.accountId]||kd.default||kd.apiKey||null;}}catch(_){}}`;
const newRunJobAuth = `let authToken=null,apiKey=accountSession?.apiKey||null;if(accountSession){try{const aData=await getAccountElevenAuth(accountSession);if(aData?.accessToken)authToken=aData.accessToken;}catch(_){}}if(!authToken&&!apiKey&&accountSession){try{const kp=L(F.getPath("userData"),"elevenlabs-keys.json");if(nodeFs.existsSync(kp)){const kd=JSON.parse(nodeFs.readFileSync(kp,"utf8"));apiKey=kd[accountSession.accountId]||kd.default||kd.apiKey||null;}}catch(_){}}`;

if (content.includes(oldRunJobAuth)) {
  content = content.replace(oldRunJobAuth, newRunJobAuth);
  console.log('✓ Updated Ip.runJob to automatically extract authToken via getAccountElevenAuth');
}

fs.writeFileSync(mainPath, content, 'utf8');
console.log('✓ Successfully saved app/out/main/index.js');
