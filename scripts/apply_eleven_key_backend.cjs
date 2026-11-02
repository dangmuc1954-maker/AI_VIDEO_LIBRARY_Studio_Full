const fs = require('fs');
const path = require('path');

// 1. Update app/out/preload/index.cjs
const preloadPath = path.resolve(__dirname, '../app/out/preload/index.cjs');
let preloadContent = fs.readFileSync(preloadPath, 'utf8');

const targetPreload = 'listSessions:()=>r.ipcRenderer.invoke("browser:listSessions"),';
const replacementPreload = 'listSessions:()=>r.ipcRenderer.invoke("browser:listSessions"),getElevenLabsKey:e=>r.ipcRenderer.invoke("browser:getElevenLabsKey",e),setElevenLabsKey:e=>r.ipcRenderer.invoke("browser:setElevenLabsKey",e),';

if (!preloadContent.includes('getElevenLabsKey')) {
  if (!preloadContent.includes(targetPreload)) {
    console.error('Target preload string not found!');
    process.exit(1);
  }
  preloadContent = preloadContent.replace(targetPreload, replacementPreload);
  fs.writeFileSync(preloadPath, preloadContent, 'utf8');
  console.log('✓ Updated app/out/preload/index.cjs with getElevenLabsKey and setElevenLabsKey');
} else {
  console.log('Preload already has getElevenLabsKey');
}

// 2. Update app/out/main/index.js
const mainPath = path.resolve(__dirname, '../app/out/main/index.js');
let mainContent = fs.readFileSync(mainPath, 'utf8');

// Add helper functions and IPC handlers for ElevenLabs API keys
const targetIpc = 'E.handle("browser:listSessions",A=>(C(A),T.listSessions())),';
const newIpcHandlers = `E.handle("browser:getElevenLabsKey",(A,o)=>{C(A);try{const p=L(F.getPath("userData"),"elevenlabs-keys.json");if(nodeFs.existsSync(p)){const d=JSON.parse(nodeFs.readFileSync(p,"utf8"));if(o&&d[o])return d[o];return d.default||d.apiKey||Object.values(d)[0]||""}}catch(_){}return""}),E.handle("browser:setElevenLabsKey",(A,o)=>{C(A);try{const p=L(F.getPath("userData"),"elevenlabs-keys.json");let d={};if(nodeFs.existsSync(p)){try{d=JSON.parse(nodeFs.readFileSync(p,"utf8"))}catch(_){}}const k=typeof o=="string"?o.trim():typeof o?.key=="string"?o.key.trim():"";if(o?.accountId){d[o.accountId]=k}d.default=k,d.apiKey=k,nodeFs.writeFileSync(p,JSON.stringify(d,null,2),"utf8");return true}catch(_){return false}}),`;

if (!mainContent.includes('browser:getElevenLabsKey')) {
  if (!mainContent.includes(targetIpc)) {
    console.error('Target main IPC string not found!');
    process.exit(1);
  }
  mainContent = mainContent.replace(targetIpc, targetIpc + newIpcHandlers);
  console.log('✓ Added browser:getElevenLabsKey and browser:setElevenLabsKey IPC handlers');
}

// Update Ip.runJob to check stored API key
const oldRunJobCheck = 'let authToken=null,apiKey=null;';
const newRunJobCheck = `let authToken=null,apiKey=accountSession?.apiKey||null;if(!apiKey){try{const kp=L(F.getPath("userData"),"elevenlabs-keys.json");if(nodeFs.existsSync(kp)){const kd=JSON.parse(nodeFs.readFileSync(kp,"utf8"));apiKey=kd[accountSession.accountId]||kd.default||kd.apiKey||null;}}catch(_){}}`;

if (mainContent.includes(oldRunJobCheck) && !mainContent.includes('elevenlabs-keys.json')) {
  mainContent = mainContent.replace(oldRunJobCheck, newRunJobCheck);
  console.log('✓ Updated Ip.runJob to check elevenlabs-keys.json');
}

fs.writeFileSync(mainPath, mainContent, 'utf8');
console.log('✓ Saved app/out/main/index.js');
