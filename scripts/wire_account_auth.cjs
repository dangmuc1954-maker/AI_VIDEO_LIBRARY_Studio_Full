const fs = require('fs');
const path = require('path');

const mainPath = path.resolve(__dirname, '../app/out/main/index.js');
let content = fs.readFileSync(mainPath, 'utf8');

const targetBeforeLog = 'if(ext?.apiKey)apiKey=ext.apiKey;}catch(_){}y("elevenlabs-tts","tts job started"';
const replacement = 'if(ext?.apiKey)apiKey=ext.apiKey;}catch(_){}if(!authToken&&accountSession){try{const aData=await getAccountElevenAuth(accountSession);if(aData?.accessToken)authToken=aData.accessToken;}catch(_){}}if(!authToken&&!apiKey&&accountSession){try{const kp=L(F.getPath("userData"),"elevenlabs-keys.json");if(nodeFs.existsSync(kp)){const kd=JSON.parse(nodeFs.readFileSync(kp,"utf8"));apiKey=kd[accountSession.accountId]||kd.default||kd.apiKey||null;}}catch(_){}}y("elevenlabs-tts","tts job started"';

if (!content.includes('const aData=await getAccountElevenAuth')) {
  if (!content.includes(targetBeforeLog)) {
    console.error('Target before log not found!');
    process.exit(1);
  }
  content = content.replace(targetBeforeLog, replacement);
  fs.writeFileSync(mainPath, content, 'utf8');
  console.log('✓ Successfully wired getAccountElevenAuth into Ip.runJob');
} else {
  console.log('Already wired.');
}
