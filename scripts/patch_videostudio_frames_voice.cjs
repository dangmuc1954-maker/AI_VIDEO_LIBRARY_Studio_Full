/*
 * Tris yêu cầu 12/11/2026: Khung hình + giọng Flow trong Studio Video.
 * Ghi lại từ Flow thật: Omni 1.1 ở chế độ Khung hình (2 ảnh) + giọng → Flow gửi y như Thành phần:
 *   rpc MZZa6b, model abra_r2v_4s, 2 ảnh làm ảnh tham chiếu, giọng [["achird"]].
 * Quy tắc: Khung hình + CÓ chọn giọng + model có R2V → gửi R2V (giống Flow).
 * Khung hình KHÔNG chọn giọng → giữ nguyên 100% như cũ (khung đầu → khung cuối).
 * Chạy SAU patch_videostudio_omni12_frames.cjs.
 */
const fs = require('fs');
const path = require('path');
const FILE = path.join(__dirname, '..', 'app', 'out', 'renderer', 'assets', 'VideoStudio-frcr8V6s.js');

const edits = [
  {
    name: 'hàm: model có chế độ Thành phần (R2V)',
    find: 'function __framesAsR2V(t,m){',
    replace: 'function __hasR2V(t,m){const x=fo(t,m);return!!x&&x.variants.some(v=>v.mode==="R2V")}function __framesAsR2V(t,m){',
  },
  {
    name: 'job: Khung hình + giọng → R2V (như Flow)',
    find: 'he=__framesAsR2V(s,v.model)?"R2V":ie.length>=2?"Frames":"I2V";',
    replace: 'he=__framesAsR2V(s,v.model)||(v.flowVoice||flowVoice)&&__hasR2V(s,v.model)?"R2V":ie.length>=2?"Frames":"I2V";',
  },
  {
    name: 'bảng prompt: thay cảnh báo đỏ bằng ghi chú đúng',
    find: 'o.mode==="Frames"&&!__framesAsR2V(U,o.model)?e.jsx("span",{className:"text-[10px] font-normal text-rose-300",children:"· Khung hình không dùng được giọng — chọn Thành phần"})',
    replace: 'o.mode==="Frames"&&!__hasR2V(U,o.model)?e.jsx("span",{className:"text-[10px] font-normal text-rose-300",children:"· model này không dùng được giọng"}):o.mode==="Frames"&&o.flowVoice&&!__framesAsR2V(U,o.model)?e.jsx("span",{className:"text-[10px] font-normal text-sky-300/80",children:"· có giọng: Khung hình gửi kiểu Thành phần (như Flow)"})',
  },
];

let s = fs.readFileSync(FILE, 'utf8');
if (s.includes('__hasR2V')) { console.error('Đã vá trước đó — dừng.'); process.exit(1); }
if (!s.includes('__framesAsR2V')) { console.error('Cần chạy patch_videostudio_omni12_frames.cjs trước.'); process.exit(1); }
for (const ed of edits) {
  const n = s.split(ed.find).length - 1;
  if (n !== 1) { console.error(`KHÔNG KHỚP: ${ed.name} — ${n} lần (cần 1). Không ghi.`); process.exit(1); }
  s = s.replace(ed.find, ed.replace);
  console.log('  ✓ ' + ed.name);
}
const bak = FILE + '.bak_before_frames_voice';
if (!fs.existsSync(bak)) fs.copyFileSync(FILE, bak);
fs.writeFileSync(FILE, s, 'utf8');
console.log('Xong. Bản gốc: ' + path.basename(bak));
