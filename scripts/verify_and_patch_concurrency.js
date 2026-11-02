const fs = require('fs');

// 1. Patch app/out/main/index.js
const mainPath = 'app/out/main/index.js';
let content = fs.readFileSync(mainPath, 'utf8');

const t1 = 'getLimit(e){if(e?.providerId==="muse"||e?.provider==="Muse AI"||e?.payload?.model==="muse-video"||(e?.provider&&e.provider.toLowerCase().includes("muse")))return ko;return Math.max(1,Math.floor(this.resolveLimit(e)||1))}';
const r1 = 'getLimit(e){if(e?.providerId==="muse"||e?.provider==="Muse AI"||e?.payload?.model==="muse-video"||(e?.provider&&e.provider.toLowerCase().includes("muse")))return ko;if(e?.providerId==="banana"||e?.providerId==="veo3"||e?.provider==="Banana"||e?.provider==="Veo3"||(e?.provider&&/veo|banana/i.test(e.provider))||(e?.payload?.model&&/veo|banana/i.test(e.payload.model)))return 3;return Math.max(1,Math.floor(this.resolveLimit(e)||1))}';

const t2 = 'getSlotKey(e){const t=e.accountId||"unassigned";return`${e.providerId}:${t}:${e.type}`}';
const r2 = 'getSlotKey(e){const t=e.accountId||"unassigned";if((e?.providerId==="banana"||e?.providerId==="veo3"||e?.provider==="Banana"||e?.provider==="Veo3"||(e?.provider&&/veo|banana/i.test(e.provider)))&&e?.accountId){return`${e.providerId}:${e.accountId}`}return`${e.providerId}:${t}:${e.type}`}';

const t3 = 'function ud(r){return eo(r)&&r.payload?.accountSelection==="auto"}';
const r3 = 'function ud(r){return eo(r)&&(r.payload?.accountSelection==="auto"||!r.accountId||r.account==="Auto"||r.payload?.account==="Auto"||r.payload?.account==="Tự động")}';

const t4 = 'bananaImage:20,chatgptImages:20,chatgptChat:20,grokImage:20,grokVideo:20,veo3Video:20';
const r4 = 'bananaImage:3,chatgptImages:20,chatgptChat:20,grokImage:20,grokVideo:20,veo3Video:3';

if (!content.includes(t1) || !content.includes(t2) || !content.includes(t3) || !content.includes(t4)) {
  console.error("Error: Not all targets found in app/out/main/index.js");
  process.exit(1);
}

content = content.replace(t1, r1);
content = content.replace(t2, r2);
content = content.replace(t3, r3);
content = content.replace(t4, r4);

fs.writeFileSync(mainPath, content, 'utf8');
console.log("Successfully patched app/out/main/index.js!");

// 2. Patch installed running app if present
const installedMainPath = 'C:\\Users\\admin\\AppData\\Local\\Programs\\AI VIDEO LIBRARY\\resources\\app\\out\\main\\index.js';
if (fs.existsSync(installedMainPath)) {
  let instContent = fs.readFileSync(installedMainPath, 'utf8');
  if (instContent.includes(t1)) instContent = instContent.replace(t1, r1);
  if (instContent.includes(t2)) instContent = instContent.replace(t2, r2);
  if (instContent.includes(t3)) instContent = instContent.replace(t3, r3);
  if (instContent.includes(t4)) instContent = instContent.replace(t4, r4);
  fs.writeFileSync(installedMainPath, instContent, 'utf8');
  console.log("Successfully patched installed app index.js!");
}

// 3. Update concurrency-settings.json in Roaming
const cfgPath = 'C:\\Users\\admin\\AppData\\Roaming\\AI_VIDEO_LIBRARY_DATA\\concurrency-settings.json';
if (fs.existsSync(cfgPath)) {
  try {
    const cfg = JSON.parse(fs.readFileSync(cfgPath, 'utf8'));
    if (cfg && cfg.limits) {
      cfg.limits.bananaImage = 3;
      cfg.limits.veo3Video = 3;
      fs.writeFileSync(cfgPath, JSON.stringify(cfg, null, 2), 'utf8');
      console.log("Updated Roaming concurrency-settings.json to banana: 3, veo3: 3!");
    }
  } catch(e) {
    console.warn("Could not parse concurrency-settings.json:", e);
  }
}
