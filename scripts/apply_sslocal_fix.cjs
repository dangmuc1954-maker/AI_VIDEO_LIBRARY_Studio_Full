const fs = require('fs');
const path = require('path');

const mainPath = path.resolve(__dirname, '../app/out/main/index.js');
let content = fs.readFileSync(mainPath, 'utf8');

// 1. Update ip to "https://elevenlabs.io/robots.txt"
const oldIp = 'ip="https://elevenlabs.io";class An';
const newIp = 'ip="https://elevenlabs.io/robots.txt";class An';

if (!content.includes(oldIp)) {
  console.error('Target oldIp not found!');
  process.exit(1);
}
content = content.replace(oldIp, newIp);
console.log('✓ Replaced ip with https://elevenlabs.io/robots.txt');

// 2. In cp.initialize, add guards to A.webContents
const targetInit = 'this.view=A,await this.runWebContentsOperation(A,"hCaptcha page navigation"';
const guardedInit = `A.webContents.setWindowOpenHandler(()=>({action:"deny"})),A.webContents.on("will-navigate",(t,u)=>{if(!u.startsWith("http://")&&!u.startsWith("https://"))t.preventDefault()}),A.webContents.on("will-frame-navigate",(t)=>{if(!t.url.startsWith("http://")&&!t.url.startsWith("https://"))t.preventDefault()}),this.view=A,await this.runWebContentsOperation(A,"hCaptcha page navigation"`;

if (!content.includes(targetInit)) {
  console.error('Target targetInit not found!');
  process.exit(1);
}
content = content.replace(targetInit, guardedInit);
console.log('✓ Added navigation & window open guards to captcha view');

// 3. In mB(), add global protocol blocker for all webContents
const targetMB = `function mB(){\n  F.on("web-contents-created",(r,e)=>{`;
const replacementMB = `function mB(){\n  F.on("web-contents-created",(r,e)=>{\n    try{e.setWindowOpenHandler(d=>{const u=d.url||"";if(!u.startsWith("http://")&&!u.startsWith("https://"))return{action:"deny"};return{action:"deny"}});e.on("will-navigate",(t,u)=>{if(typeof u==="string"&&!u.startsWith("http://")&&!u.startsWith("https://")&&!u.startsWith("file://")&&!u.startsWith("devtools://")&&!u.startsWith("aivideo-asset://")&&!u.startsWith("aiforge-asset://"))t.preventDefault()});e.on("will-frame-navigate",(t)=>{const u=t.url||"";if(typeof u==="string"&&!u.startsWith("http://")&&!u.startsWith("https://")&&!u.startsWith("file://")&&!u.startsWith("devtools://")&&!u.startsWith("aivideo-asset://")&&!u.startsWith("aiforge-asset://"))t.preventDefault()})}catch(_){}`;

if (!content.includes(targetMB)) {
  console.error('Target targetMB not found!');
  process.exit(1);
}
content = content.replace(targetMB, replacementMB);
console.log('✓ Added global protocol navigation blocker to mB()');

fs.writeFileSync(mainPath, content, 'utf8');
console.log('✓ Saved app/out/main/index.js successfully!');
