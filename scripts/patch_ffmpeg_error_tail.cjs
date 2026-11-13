/*
 * Tris 13/11/2026: khách ghép video (Biên tập video – Studio Kịch Bản) báo lỗi dài toàn thông tin phiên bản ffmpeg, không thấy lý do.
 * Hàm chạy ffmpeg chung (_t trong main/index.js) chỉ giữ PHẦN ĐẦU stderr (banner) → mất dòng lỗi thật ở cuối.
 * Sửa: giữ PHẦN CUỐI stderr; mã thoát -28 (4294967268) = ổ đĩa hết chỗ → báo rõ tiếng Việt.
 * (Lệnh ghép 42 đoạn có chuyển cảnh đã chạy thử thành công trên máy Tris — lệnh không sai, lỗi khách là hết dung lượng ổ.)
 */
const fs = require('fs');
const path = require('path');
const F = path.join(__dirname, '..', 'app', 'out', 'main', 'index.js');
let s = fs.readFileSync(F, 'utf8');
if (s.includes('__ffDiskFull')) { console.error('Đã vá trước đó — dừng.'); process.exit(1); }
const edits = [
  ['giữ phần cuối nhật ký lỗi ffmpeg',
    'a.stderr.on("data",d=>{s.length<Yr&&(s+=d.toString().slice(0,Yr-s.length))}),a.on("error",d=>{c(d)}),a.on("close",d=>{d===0?c():c(new Error(`FFmpeg exited with code ${d}. Stderr: ${s}`))})',
    'a.stderr.on("data",d=>{s+=d.toString();s.length>Yr&&(s=s.slice(-Yr))}),a.on("error",d=>{c(d)}),a.on("close",d=>{const __ffDiskFull=d===4294967268||d===-28||/No space left on device/i.test(s);d===0?c():c(new Error(__ffDiskFull?`Ổ đĩa đã hết dung lượng nên FFmpeg không ghi được video (mã ${d}). Hãy dọn bớt ổ đĩa chứa dữ liệu app (thường là ổ C) và thư mục lưu video, rồi thử lại. Chi tiết: ${s.slice(-600)}`:`FFmpeg exited with code ${d}. Stderr (cuối): ${s.slice(-1500)}`))})'],
];
for (const [n, a, b] of edits) {
  const c = s.split(a).length - 1;
  if (c !== 1) { console.error(`KHÔNG KHỚP (${c}) — ${n}. Không ghi.`); process.exit(1); }
  s = s.replace(a, () => b); console.log('  ✓ ' + n);
}
const bak = F + '.bak_before_ffmpeg_error_tail';
if (!fs.existsSync(bak)) fs.copyFileSync(F, bak);
fs.writeFileSync(F, s, 'utf8');
