/*
 * Tris duyệt 12/11/2026 (cùng việc sửa lỗi ElevenLabs báo "hết hạn đăng nhập").
 * ElevenLabs trả 401 "detected_unusual_activity ... Free Tier access has been disabled" khi tài khoản free bị khóa
 * (nhiều tài khoản free / VPN). Lõi cũ dịch thành AUTH_REQUIRED → màn hình báo "Phiên đăng nhập hết hạn" (sai lý do)
 * và không xoay sang tài khoản khác. Sửa: xếp lỗi này vào QUOTA_EXCEEDED (tự bỏ qua tài khoản, xoay tài khoản khác).
 */
const fs = require('fs');
const path = require('path');
const FILE = path.join(__dirname, '..', 'app', 'out', 'main', 'index.js');
const OLD = 'return t.includes("quota_exceeded")||t.includes("credit_limit_exceeded")||';
const NEW = 'return t.includes("detected_unusual_activity")||t.includes("free tier access has been disabled")?new p("QUOTA_EXCEEDED","ElevenLabs đã khóa gói miễn phí của tài khoản này (phát hiện hoạt động bất thường: nhiều tài khoản free hoặc VPN). Cần nâng cấp gói trả phí hoặc dùng tài khoản khác.",!1,{...A,providerReason:"ELEVENLABS_FREE_TIER_DISABLED"}):t.includes("quota_exceeded")||t.includes("credit_limit_exceeded")||';
let s = fs.readFileSync(FILE, 'utf8');
if (s.includes('ELEVENLABS_FREE_TIER_DISABLED')) { console.error('Đã vá trước đó — dừng.'); process.exit(1); }
const n = s.split(OLD).length - 1;
if (n !== 1) { console.error(`KHÔNG KHỚP (${n} lần, cần 1). Không ghi.`); process.exit(1); }
const bak = FILE + '.bak_before_eleven_free_tier';
if (!fs.existsSync(bak)) fs.copyFileSync(FILE, bak);
fs.writeFileSync(FILE, s.replace(OLD, () => NEW), 'utf8');
console.log('  ✓ ElevenLabs khóa gói free → QUOTA_EXCEEDED (xoay tài khoản, báo đúng lý do)');
