// Vá 2 lỗi TTS ElevenLabs (11/11/2026):
// 1) TTSStudio: bảng dòng (ms) và khung chi tiết (hs) dùng biến `elevenSessions` nhưng không được truyền vào
//    → chọn tài khoản cụ thể làm trang sập "ReferenceError: elevenSessions is not defined".
// 2) Main: chế độ Auto của ElevenLabs không bỏ qua tài khoản đang hạ nhiệt (vừa báo hết quota) và tài khoản
//    job đã thử thất bại (attemptedAccounts) → job bị xếp lại đúng tài khoản hết lượt, không tự xoay.
// Chạy lại được: bỏ qua chỗ đã vá. Tạo bản .bak trước khi ghi.
const fs = require("fs");
const path = require("path");
const ROOT = path.resolve(__dirname, "..", "app", "out");
const stamp = "bak_before_tts_rotation_fix";

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

console.log("TTSStudio-DfUKIn_N.js");
patch("renderer/assets/TTSStudio-DfUKIn_N.js", [
  ["ms nhận elevenSessions", "function ms({accountOptions:accountOptions,", "function ms({accountOptions:accountOptions,elevenSessions:elevenSessions=[],", 1],
  ["hs nhận elevenSessions", "function hs({accountOptions:accountOptions,", "function hs({accountOptions:accountOptions,elevenSessions:elevenSessions=[],", 1],
  ["truyền elevenSessions vào ms", "e.jsx(ms,{accountOptions:accountOptions,", "e.jsx(ms,{accountOptions:accountOptions,elevenSessions:elevenSessions,", 1],
  ["truyền elevenSessions vào hs", "e.jsx(hs,{accountOptions:accountOptions,", "e.jsx(hs,{accountOptions:accountOptions,elevenSessions:elevenSessions,", 1],
]);

console.log("main/index.js");
patch("main/index.js", [
  ["Auto ElevenLabs bỏ qua tài khoản hạ nhiệt / đã thử",
   "if(allEleven.length>0){const sorted=allEleven.map(u=>({candidate:u,",
   "if(allEleven.length>0){const attemptedEl=Array.isArray(r.payload?.attemptedAccounts)?r.payload.attemptedAccounts:[];const notTriedEl=allEleven.filter(u=>!attemptedEl.includes(u.accountId));const readyEl=notTriedEl.filter(u=>!(u.diagnostics&&ct(u)));const poolEl=readyEl.length>0?readyEl:notTriedEl.length>0?notTriedEl:allEleven.filter(u=>!(u.diagnostics&&ct(u))).length>0?allEleven.filter(u=>!(u.diagnostics&&ct(u))):allEleven;const sorted=poolEl.map(u=>({candidate:u,",
   1],
  ["Lúc chạy ưu tiên tài khoản không hạ nhiệt",
   "if(allEleven.length>0)accountSession=allEleven[0];}",
   "if(allEleven.length>0)accountSession=allEleven.find(s=>!(s.diagnostics&&ct(s)))||allEleven[0];}",
   1],
]);
console.log("Xong.");
