/*
 * Tris yêu cầu 12/11/2026: Omni 1.2 + "Khung hình" trong Studio Video.
 * Ghi lại từ Flow thật: Omni 1.2 ở chế độ Khung hình (2 ảnh + giọng) gửi y như Thành phần:
 *   rpc MZZa6b, model macaron_cookie_r2v_4s, 2 ảnh làm ảnh tham chiếu, giọng [["achird"]].
 * Quy tắc: model KHÔNG có chế độ Frames nhưng có R2V → Khung hình chạy như R2V (hiện tại chỉ Omni 1.2).
 * Model có Frames (Omni 1.1, Veo 3.1...) giữ nguyên 100%.
 */
const fs = require('fs');
const path = require('path');
const FILE = path.join(__dirname, '..', 'app', 'out', 'renderer', 'assets', 'VideoStudio-frcr8V6s.js');

const HELPER = 'function __framesAsR2V(t,m){const x=fo(t,m);return!!x&&!x.variants.some(v=>v.mode==="Frames")&&x.variants.some(v=>v.mode==="R2V")}';

const edits = [
  {
    name: 'hàm nhận biết model không có Khung hình',
    find: 'function ao(t,s,n=s.mode==="Frames"?"Frames":"R2V"){',
    replace: HELPER + 'function ao(t,s,n=s.mode==="Frames"?"Frames":"R2V"){',
  },
  {
    name: 'job: Khung hình của model không có Frames → gửi R2V',
    find: '        he=ie.length>=2?"Frames":"I2V";\n',
    replace: '        he=__framesAsR2V(s,v.model)?"R2V":ie.length>=2?"Frames":"I2V";\n',
  },
  {
    name: 'bảng prompt: số ảnh được phép (hết ẩn ảnh)',
    find: 'o?.provider==="Veo3"&&A?Ho(U,A.id,o.mode==="Frames"?"Frames":"R2V",',
    replace: 'o?.provider==="Veo3"&&A?Ho(U,A.id,o.mode==="Frames"&&!__framesAsR2V(U,A.id)?"Frames":"R2V",',
  },
  {
    name: 'cảnh báo đỏ chỉ khi Khung hình thật (model có Frames)',
    find: 'o.mode==="Frames"?e.jsx("span",{className:"text-[10px] font-normal text-rose-300"',
    replace: 'o.mode==="Frames"&&!__framesAsR2V(U,o.model)?e.jsx("span",{className:"text-[10px] font-normal text-rose-300"',
  },
];

let s = fs.readFileSync(FILE, 'utf8');
if (s.includes('__framesAsR2V')) { console.error('Đã vá trước đó — dừng.'); process.exit(1); }
for (const ed of edits) {
  const n = s.split(ed.find).length - 1;
  if (n !== 1) { console.error(`KHÔNG KHỚP: ${ed.name} — ${n} lần (cần 1). Không ghi.`); process.exit(1); }
  s = s.replace(ed.find, ed.replace);
  console.log('  ✓ ' + ed.name);
}
const bak = FILE + '.bak_before_omni12_frames';
if (!fs.existsSync(bak)) fs.copyFileSync(FILE, bak);
fs.writeFileSync(FILE, s, 'utf8');
console.log('Xong. Bản gốc: ' + path.basename(bak));
