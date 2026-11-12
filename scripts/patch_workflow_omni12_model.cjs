/*
 * Tris 12/11/2026: node workflow Google Flow (Video) chưa có model Omni 1.2 Flash.
 * Danh sách model của node lấy từ danh mục gốc phía giao diện (Gi.models trong index-BS7vgKVV.js) — thêm Omni 1.2 Flash
 * giống hệt lõi (main/index.js: jm12 — macaron_cookie_*, R2V có giọng Flow).
 */
const fs = require('fs');
const path = require('path');
const F = path.join(__dirname, '..', 'app', 'out', 'renderer', 'assets', 'index-BS7vgKVV.js');
let s = fs.readFileSync(F, 'utf8');
if (s.includes('function jC12(')) { console.error('Đã vá trước đó — dừng.'); process.exit(1); }
const FN = 'function jC12(){const n=["T2V","I2V","R2V"],a={"720p":{"4s":12,"6s":18,"8s":24,"10s":30},"360p":{"4s":6,"6s":9,"8s":12,"10s":15}},r=[];for(const i of n)for(const s of Is)for(const c of dy)for(const h of hy){const f=`macaron_cookie_${i==="T2V"?"t2v":i==="R2V"?"r2v":"i2v"}_${c.id}`;r.push(Kv({mode:i,ratioId:s.id,durationId:c.id,resolutionId:h.id,modelKey:h.id==="360p"?`${f}_360p`:f,creditCost:a[h.id][c.id],maxReferenceImages:i==="R2V"?7:void 0,supportsVoice:i==="R2V"}))}return{id:"omni-flash-1.2",name:"Omni 1.2 Flash",status:"active",aliases:["Omni 1.2 Flash","Omni 1.2","macaron_cookie"],sortOrder:11,supportsVoice:!0,defaultMode:"T2V",defaultRatioId:"16:9",defaultDurationId:"8s",defaultResolutionId:"720p",ratios:Is.map(i=>({...i})),durations:dy,resolutions:hy,variants:r}}';
const edits = [
  ['hàm danh mục Omni 1.2 Flash', 'function jC(){const n=["T2V","I2V","Frames","R2V"]', FN + 'function jC(){const n=["T2V","I2V","Frames","R2V"]'],
  ['thêm Omni 1.2 Flash vào danh sách model', 'models:[jC(),ms({id:"veo-3.1-lite"', 'models:[jC(),jC12(),ms({id:"veo-3.1-lite"'],
];
for (const [n, a, b] of edits) {
  const c = s.split(a).length - 1;
  if (c !== 1) { console.error(`KHÔNG KHỚP (${c}) — ${n}. Không ghi.`); process.exit(1); }
  s = s.replace(a, () => b); console.log('  ✓ ' + n);
}
fs.writeFileSync(F, s, 'utf8');
