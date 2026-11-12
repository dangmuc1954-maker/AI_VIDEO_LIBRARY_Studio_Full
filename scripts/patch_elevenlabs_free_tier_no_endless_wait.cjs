/*
 * Tris duyệt 12/11/2026 (tiếp việc sửa lỗi ElevenLabs).
 * Lỗi máy khách bản 3.1.6: tài khoản ElevenLabs bị khóa gói free → QUOTA_EXCEEDED → tài khoản nghỉ 15 phút và câu
 * giọng đọc được xếp chờ "tài khoản khác". Khách chỉ có tài khoản bị khóa → câu đứng "Hàng đợi 0%" mãi, không báo gì.
 * Sửa (chỉ cho lỗi ELEVENLABS_FREE_TIER_DISABLED): cho tài khoản bị khóa nghỉ 6 tiếng; còn tài khoản ElevenLabs khác
 * dùng được thì xoay như cũ; hết tài khoản dùng được → dừng job, báo rõ lý do.
 */
const fs = require('fs');
const path = require('path');
const FILE = path.join(__dirname, '..', 'app', 'out', 'main', 'index.js');

const OLD = 'if(isQuotaOrLimit){const cdMs=elevenChallenge?15*60*1e3:this.getAccountCooldownMs(t)';
const NEW = 'if(isQuotaOrLimit&&t.details?.providerReason==="ELEVENLABS_FREE_TIER_DISABLED"){'
  + 'e.accountId&&this.onAccountFailure?.(e,t,6*60*60*1e3);'
  + 'const __job=this.queue.findJob(e.id)||e;'
  + 'const __tried=new Set([...(Array.isArray(__job.attemptedAccounts)?__job.attemptedAccounts:[]),...(Array.isArray(e.attemptedAccounts)?e.attemptedAccounts:[]),e.accountId].filter(Boolean));'
  + 'let __alt=[];try{__alt=T.listSessions().filter(s=>(s.providerId==="elevenlabs"||s.providerId==="elevenlabs-tts"||(s.provider&&String(s.provider).toLowerCase().includes("elevenlabs")))&&!s.disabled&&!__tried.has(s.accountId)&&!(s.diagnostics&&ct(s)))}catch(_){__alt=[]}'
  + 'if(__alt.length===0){this.queue.failJob(e.id,"Tất cả tài khoản ElevenLabs đang có đều bị ElevenLabs khóa gói miễn phí (phát hiện nhiều tài khoản free hoặc VPN). Cần dùng tài khoản trả phí hoặc thêm tài khoản khác chưa bị khóa.","ElevenLabs khóa gói miễn phí",t.code,t.details);return}}'
  + 'if(isQuotaOrLimit){const cdMs=t.details?.providerReason==="ELEVENLABS_FREE_TIER_DISABLED"?6*60*60*1e3:elevenChallenge?15*60*1e3:this.getAccountCooldownMs(t)';

let s = fs.readFileSync(FILE, 'utf8');
if (s.includes('ElevenLabs khóa gói miễn phí",t.code')) { console.error('Đã vá trước đó — dừng.'); process.exit(1); }
if (!s.includes('ELEVENLABS_FREE_TIER_DISABLED')) { console.error('Cần chạy patch_elevenlabs_free_tier_disabled.cjs trước.'); process.exit(1); }
const n = s.split(OLD).length - 1;
if (n !== 1) { console.error(`KHÔNG KHỚP (${n} lần, cần 1). Không ghi.`); process.exit(1); }
const bak = FILE + '.bak_before_eleven_no_endless_wait';
if (!fs.existsSync(bak)) fs.copyFileSync(FILE, bak);
fs.writeFileSync(FILE, s.replace(OLD, () => NEW), 'utf8');
console.log('  ✓ ElevenLabs khóa gói free: còn tài khoản khác thì xoay, hết thì dừng + báo rõ');
