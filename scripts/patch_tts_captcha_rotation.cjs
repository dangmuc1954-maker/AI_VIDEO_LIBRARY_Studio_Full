// Vá lỗi TTS ElevenLabs (11/11/2026, Tris yêu cầu):
// Tài khoản ElevenLabs bị đòi captcha (CHALLENGE_REQUIRED / CAPTCHA_FAILED) → trước đây job bị DỪNG (Paused) và chờ mãi.
// Nay: coi như tài khoản tạm không dùng được → hạ nhiệt tài khoản đó 15 phút và xếp lại job sang tài khoản ElevenLabs khác
// (dùng sẵn requeueAutoJobForAlternateAccount như lỗi hết quota). Hết tài khoản thay thế thì vẫn dừng chờ xác minh như cũ.
// + Cookie/token có ký tự ngoài Latin-1 (vd 'Đ' trong tên tài khoản) làm fetch lỗi "Cannot convert argument to a ByteString" → mã hoá trước khi gửi.
// Chỉ áp cho job ElevenLabs; Google Flow, Grok… giữ nguyên. Chạy lại được; tạo .bak trước khi ghi.
const fs = require("fs");
const path = require("path");
const ROOT = path.resolve(__dirname, "..", "app", "out");
const stamp = "bak_before_tts_captcha_rotation";

function patch(rel, edits) {
  const f = path.join(ROOT, rel);
  let s = fs.readFileSync(f, "utf8");
  const bak = `${f}.${stamp}`;
  if (!fs.existsSync(bak)) fs.writeFileSync(bak, s);
  for (const [name, from, to, count] of edits) {
    if (s.includes(to) && !s.includes(from)) { console.log(`  = ${name}: đã vá trước đó`); continue; }
    const n = s.split(from).length - 1;
    if (n !== count) throw new Error(`${name}: tìm thấy ${n} chỗ, cần ${count} — dừng, không ghi file`);
    s = s.split(from).join(to);
    console.log(`  ✓ ${name} (${n} chỗ)`);
  }
  fs.writeFileSync(f, s);
}

console.log("main/index.js");
patch("main/index.js", [
  ["ElevenLabs captcha → xoay tài khoản khác",
   'const isQuotaOrLimit=t.code==="QUOTA_EXCEEDED"||',
   'const elevenChallenge=(t.code==="CHALLENGE_REQUIRED"||t.code==="CAPTCHA_FAILED")&&(String(e.accountId||"").startsWith("elevenlabs")||/eleven|tts/i.test(String(e.provider||"")+" "+String(e.type||"")+" "+String(e.kind||"")));const isQuotaOrLimit=elevenChallenge||t.code==="QUOTA_EXCEEDED"||',
   1],
  ["tài khoản bị captcha hạ nhiệt 15 phút",
   'const cdMs=this.getAccountCooldownMs(t)||(t.code==="RATE_LIMITED"?3e4:5e3);',
   'const cdMs=elevenChallenge?15*60*1e3:this.getAccountCooldownMs(t)||(t.code==="RATE_LIMITED"?3e4:5e3);',
   1],
  ["Cookie ElevenLabs có chữ có dấu (Đ…) → mã hoá, tránh lỗi ByteString",
   '...(ch?{Cookie:ch}:{})',
   '...(ch?{Cookie:String(ch).replace(/[^\x00-\xff]/g,x=>encodeURIComponent(x))}:{})',
   1],
  ["Bearer token ElevenLabs chỉ giữ ký tự hợp lệ",
   '...(at?{authorization:"Bearer "+at}:{})',
   '...(at?{authorization:"Bearer "+String(at).replace(/[^\x00-\xff]/g,"")}:{})',
   1],
]);
console.log("Xong.");
