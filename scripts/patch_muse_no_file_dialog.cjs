/*
 * Tris 14/11/2026: máy khách tạo ảnh/video Muse AI có ảnh tham chiếu → mỗi job bật 1 hộp "Open" của Windows, tràn màn hình.
 * Nguyên nhân: bộ điều khiển trang Muse tìm ô chat bằng 'textarea, div[contenteditable="true"], [role="textbox"], input'
 * rồi el.click() — chữ "input" bắt luôn <input type="file"> (đứng trước ô chat) → bấm trúng ô chọn file → Windows mở hộp Open.
 * Sửa: loại ô chọn file và ô ẩn khỏi bộ chọn ô chat (3 chỗ). Việc đính kèm ảnh vẫn dùng CDP setFileInputFiles như cũ.
 */
const fs = require('fs');
const path = require('path');
const F = path.join(__dirname, '..', 'app', 'out', 'main', 'index.js');
let s = fs.readFileSync(F, 'utf8');
const OLD = `'textarea, div[contenteditable="true"], [role="textbox"], input'`;
const NEW = `'textarea, div[contenteditable="true"], [role="textbox"], input:not([type="file"]):not([type="hidden"])'`;
if (s.includes(NEW)) { console.error('Đã vá trước đó — dừng.'); process.exit(1); }
const n = s.split(OLD).length - 1;
if (n !== 3) { console.error(`KHÔNG KHỚP (${n}, cần 3). Không ghi.`); process.exit(1); }
s = s.split(OLD).join(NEW);
const bak = F + '.bak_before_muse_no_file_dialog';
if (!fs.existsSync(bak)) fs.copyFileSync(F, bak);
fs.writeFileSync(F, s, 'utf8');
console.log('  ✓ bộ chọn ô chat Muse không còn bắt ô chọn file (3 chỗ)');
