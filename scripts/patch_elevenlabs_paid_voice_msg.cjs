/*
 * Tris 12/11/2026: lỗi 402 "Free users cannot use library voices via the API" hiện thành
 * "ElevenLabs rejected the request (402)" — khó hiểu. Đổi thành câu tiếng Việt rõ lý do (không đổi cách xử lý).
 */
const fs = require('fs');
const path = require('path');
const FILE = path.join(__dirname, '..', 'app', 'out', 'main', 'index.js');
const OLD = 'return t.includes("detected_unusual_activity")||';
const NEW = 'return t.includes("paid_plan_required")||t.includes("free users cannot use library voices")?new p("PROVIDER_REJECTED","Giọng này là giọng thư viện ElevenLabs — tài khoản/API Key gói miễn phí không được dùng giọng thư viện qua API. Cần tài khoản trả phí, hoặc chọn giọng có sẵn của ElevenLabs.",!1,{...A,providerReason:"ELEVENLABS_PAID_VOICE_REQUIRED"}):t.includes("detected_unusual_activity")||';
let s = fs.readFileSync(FILE, 'utf8');
if (s.includes('ELEVENLABS_PAID_VOICE_REQUIRED')) { console.error('Đã vá trước đó — dừng.'); process.exit(1); }
const n = s.split(OLD).length - 1;
if (n !== 1) { console.error(`KHÔNG KHỚP (${n}). Không ghi.`); process.exit(1); }
const bak = FILE + '.bak_before_eleven_paid_voice_msg';
if (!fs.existsSync(bak)) fs.copyFileSync(FILE, bak);
fs.writeFileSync(FILE, s.replace(OLD, () => NEW), 'utf8');
console.log('  ✓ 402 giọng thư viện → báo rõ bằng tiếng Việt');
