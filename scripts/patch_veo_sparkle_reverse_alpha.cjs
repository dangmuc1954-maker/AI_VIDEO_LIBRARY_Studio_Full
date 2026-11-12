/*
 * Tris yêu cầu 12/11/2026: xóa watermark video Veo/Flow "lúc được lúc không" → làm sạch, không vết.
 * Lõi (main/index.js) removeVideoWatermark: chạy TRƯỚC bộ xóa mới app/out/main/veo_sparkle_remover.cjs
 * (dò dấu ✦ nhiều cỡ + tính ngược độ trong suốt + tự chọn độ đậm từng video, đo từ 227 khung Veo thật).
 *  - Bộ mới xóa được → trả kết quả (modified + verified).
 *  - Bộ mới không chắc / lỗi → để nguyên bộ xóa cũ chạy tiếp như trước (không mất trường hợp nào bộ cũ làm được).
 */
const fs = require('fs');
const path = require('path');
const FILE = path.join(__dirname, '..', 'app', 'out', 'main', 'index.js');
let s = fs.readFileSync(FILE, 'utf8');
if (s.includes('veo_sparkle_remover')) { console.error('Đã vá trước đó — dừng.'); process.exit(1); }

const OLD = 'async removeVideoWatermark(e,t,A){try{if(A?.signal?.aborted)return{modified:!1,details:"Video processing aborted"};';
const NEW = OLD
  + 'try{const __pm=require("node:path"),__fm=require("node:fs");'
  + 'const __cand=[__pm.join(na,"veo_sparkle_remover.cjs"),__pm.join(na,"../../modules/veo_sparkle_remover.cjs"),__pm.join(na,"../modules/veo_sparkle_remover.cjs"),process.resourcesPath?__pm.join(process.resourcesPath,"app/modules/veo_sparkle_remover.cjs"):""].filter(Boolean);'
  + 'const __mp=__cand.find(p=>__fm.existsSync(p));'
  + 'if(__mp){const __vs=require(__mp),__ff=await this.getFfmpegPath(),__pv=await this.probeVideo(__ff,e,A?.signal);'
  + 'if(__pv.width&&__pv.height){const __r=await __vs.removeVeoSparkle(__ff,e,t,__pv.width,__pv.height,{crf:16,preset:"veryfast"});'
  + 'if(__r.removed){y("watermark-service","Đã xóa dấu ✦ bằng tính ngược độ trong suốt",{roi:__r.roi,strength:__r.k,score:__r.score,scale:__r.scale});'
  + 'return{modified:!0,verified:!0,details:`Xóa ✦ (tính ngược độ trong, k=${__r.k}) tại (${__r.roi.x},${__r.roi.y})`}}'
  + 'y("watermark-service","Bộ xóa ✦ mới không chắc, dùng bộ xóa cũ",{score:__r.score})}}}'
  + 'catch(__se){B("watermark-service","Bộ xóa ✦ mới lỗi, dùng bộ xóa cũ",{error:__se instanceof Error?__se.message:String(__se)})}';

const n = s.split(OLD).length - 1;
if (n !== 1) { console.error(`KHÔNG KHỚP (${n}). Không ghi.`); process.exit(1); }
s = s.replace(OLD, () => NEW);
const bak = FILE + '.bak_before_sparkle_reverse_alpha';
if (!fs.existsSync(bak)) fs.copyFileSync(FILE, bak);
fs.writeFileSync(FILE, s, 'utf8');
console.log('  ✓ removeVideoWatermark: chạy bộ xóa ✦ mới trước, không chắc thì dùng bộ cũ');
