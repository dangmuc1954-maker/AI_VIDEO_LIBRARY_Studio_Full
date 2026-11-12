/*
 * Tris yêu cầu 12/11/2026: dán API Key ElevenLabs → kiểm tra key thật → lưu nhiều key → mỗi key là 1 "tài khoản"
 * chọn được trong Studio Giọng Đọc. Lõi (main/index.js):
 *  - IPC browser:getElevenLabsKey/setElevenLabsKey thêm action "list" / "add" (kiểm tra key với ElevenLabs) / "remove".
 *    Gọi kiểu cũ (chuỗi key) giữ nguyên như trước.
 *  - Job có accountId "apikey:<id>" → chỉ dùng key đó (không lấy tài khoản Browser Hub).
 *  - Chế độ Tự động: hết tài khoản Browser Hub dùng được (bị chặn/nghỉ) → tự chuyển sang key.
 * Key lưu trong %APPDATA%\AI_VIDEO_LIBRARY_DATA\elevenlabs-keys.json (trường "keys"), không gửi đi đâu ngoài ElevenLabs.
 */
const fs = require('fs');
const path = require('path');
const FILE = path.join(__dirname, '..', 'app', 'out', 'main', 'index.js');
let s = fs.readFileSync(FILE, 'utf8');
if (s.includes('__elKeysRead')) { console.error('Đã vá trước đó — dừng.'); process.exit(1); }

// Hàm dùng chung (cấp module), chèn ngay trước hàm Xn
const HELPERS = 'function __elKeysPath(){return L(F.getPath("userData"),"elevenlabs-keys.json")}'
  + 'function __elKeysRead(){try{const p=__elKeysPath();if(nodeFs.existsSync(p)){const d=JSON.parse(nodeFs.readFileSync(p,"utf8"));return d&&typeof d==="object"?d:{}}}catch(_){}return{}}'
  + 'function __elKeysList(){const d=__elKeysRead();return Array.isArray(d.keys)?d.keys.filter(k=>k&&k.id&&k.key):[]}'
  + 'function __elKeyById(id){const x=String(id||"").replace(/^apikey:/,"");return __elKeysList().find(k=>k.id===x)||null}'
  + 'function __elKeyOfJob(e){const v=[e?.accountId,e?.payload?.accountId,e?.account,e?.payload?.account].map(x=>String(x||"")).find(x=>x.startsWith("apikey:"));return v?__elKeyById(v):null}';

const edits = [
  ['hàm dùng chung cho key', 'function Xn(r,e){if(r.providerId==="elevenlabs"){',
    HELPERS + 'function Xn(r,e){if(r.providerId==="elevenlabs"){'
    // job chọn key: giữ nguyên key đó
    + 'const __jk=__elKeyOfJob(r);if(__jk)return{...r,accountId:"apikey:"+__jk.id,account:"🔑 "+__jk.name,payload:{...r.payload,accountId:"apikey:"+__jk.id,accountSelection:"manual"}};'],
  ['Tự động: hết tài khoản dùng được → dùng key', 'const poolEl=readyEl.length>0?readyEl:',
    'if(readyEl.length===0){const __fk=__elKeysList().find(k=>!attemptedEl.includes("apikey:"+k.id));if(__fk)return{...r,accountId:"apikey:"+__fk.id,account:"🔑 "+__fk.name,payload:{...r.payload,accountSelection:"auto"}}}const poolEl=readyEl.length>0?readyEl:'],
  ['Tự động: không có tài khoản Browser Hub → dùng key (1)', 'const k=kd.default||kd.apiKey||Object.values(kd)[0];if(k&&k.trim().length>10)return{...r,accountId:"api-key"',
    'const __fk2=__elKeysList()[0];if(__fk2)return{...r,accountId:"apikey:"+__fk2.id,account:"🔑 "+__fk2.name,payload:{...r.payload,accountSelection:"auto"}};const k=kd.default||kd.apiKey;if(typeof k=="string"&&k.trim().length>10)return{...r,accountId:"api-key"'],
  ['bộ chia việc thứ 2 nhận job chọn key', 'function _B(r,e){if(r.providerId==="elevenlabs"||r.provider==="ElevenLabs"||r.type==="TTS"){',
    'function _B(r,e){if(r.providerId==="elevenlabs"||r.provider==="ElevenLabs"||r.type==="TTS"){const __jk=__elKeyOfJob(r);if(__jk)return{accountId:"apikey:"+__jk.id,account:"🔑 "+__jk.name};'],
  ['Tự động: không có tài khoản Browser Hub → dùng key (2)', 'const k=kd.default||kd.apiKey||Object.values(kd)[0];if(k&&k.trim().length>10)return{accountId:"api-key"',
    'const __fk3=__elKeysList()[0];if(__fk3)return{accountId:"apikey:"+__fk3.id,account:"🔑 "+__fk3.name};const k=kd.default||kd.apiKey;if(typeof k=="string"&&k.trim().length>10)return{accountId:"api-key"'],
  // runJob: job dùng key → không lấy tài khoản Browser Hub
  ['tạo giọng: nhận diện job dùng key', 'let accountSession=e.accountId&&e.accountId!=="anonymous"&&e.accountId!=="api-key"&&e.accountId!=="Auto"?T.findSession(e.accountId):null;',
    'const __ak=__elKeyOfJob(e);let accountSession=__ak?null:e.accountId&&e.accountId!=="anonymous"&&e.accountId!=="api-key"&&e.accountId!=="Auto"?T.findSession(e.accountId):null;'],
  ['tạo giọng: không tìm tài khoản theo tên khi dùng key', 'if(!accountSession&&e.account&&e.account!=="Auto"&&e.account!=="Anonymous ElevenLabs"){',
    'if(!__ak&&!accountSession&&e.account&&e.account!=="Auto"&&e.account!=="Anonymous ElevenLabs"){'],
  ['tạo giọng: không tự lấy tài khoản Browser Hub khi dùng key', 'if(!accountSession){const allEleven=T.listSessions().filter(s=>(s.providerId==="elevenlabs"||s.providerId==="elevenlabs-tts"||(s.provider&&s.provider.toLowerCase().includes("elevenlabs")))&&!s.disabled&&(s.authStatus==="Logged In"||(s.cookieCount&&s.cookieCount>0)));if(allEleven.length>0)accountSession=',
    'if(!__ak&&!accountSession){const allEleven=T.listSessions().filter(s=>(s.providerId==="elevenlabs"||s.providerId==="elevenlabs-tts"||(s.provider&&s.provider.toLowerCase().includes("elevenlabs")))&&!s.disabled&&(s.authStatus==="Logged In"||(s.cookieCount&&s.cookieCount>0)));if(allEleven.length>0)accountSession='],
  ['tạo giọng: dùng đúng key đã chọn', 'let apiKey=null;try{const kp=L(F.getPath("userData"),"elevenlabs-keys.json");if(nodeFs.existsSync(kp)){const kd=JSON.parse(nodeFs.readFileSync(kp,"utf8"));apiKey=kd[accountSession?.accountId]||kd.default||kd.apiKey||null;}}catch(_){}',
    'let apiKey=__ak?__ak.key:null;try{if(!__ak){const kp=L(F.getPath("userData"),"elevenlabs-keys.json");if(nodeFs.existsSync(kp)){const kd=JSON.parse(nodeFs.readFileSync(kp,"utf8"));const __v=kd[accountSession?.accountId]||kd.default||kd.apiKey||null;apiKey=typeof __v=="string"?__v:null;}}}catch(_){}'],
  // Lỗi "ElevenLabs khóa gói free": còn key chưa thử thì không dừng (để chuyển sang key)
  ['khóa gói free: còn key thì chuyển sang key', 'if(__alt.length===0){this.queue.failJob(',
    'if(__alt.length===0&&!__elKeysList().some(k=>!__tried.has("apikey:"+k.id))){this.queue.failJob('],
  // IPC: liệt kê / thêm (kiểm tra) / xóa key
  ['IPC đọc danh sách key', 'E.handle("browser:getElevenLabsKey",(A,o)=>{',
    'E.handle("browser:getElevenLabsKey",(A,o)=>{if(o&&typeof o=="object"&&o.action==="list"){C(A);return __elKeysList().map(k=>({id:k.id,name:k.name,tier:k.tier||"",masked:String(k.key).slice(0,5)+"…"+String(k.key).slice(-4),addedAt:k.addedAt||""}))}'],
];

for (const [name, a, b] of edits) {
  const n = s.split(a).length - 1;
  if (n !== 1) { console.error(`KHÔNG KHỚP (${n}) — ${name}. Không ghi.`); process.exit(1); }
  s = s.replace(a, () => b);
  console.log('  ✓ ' + name);
}

// IPC thêm/xóa key: chèn trước handler set cũ (giữ nguyên handler cũ cho kiểu gọi bằng chuỗi)
const SET_OLD = 'E.handle("browser:setElevenLabsKey",(A,o)=>{C(A);try{';
const SET_NEW = 'E.handle("browser:setElevenLabsKey",async(A,o)=>{C(A);'
  + 'if(o&&typeof o=="object"&&(o.action==="add"||o.action==="remove")){'
  + 'const d=__elKeysRead();d.keys=Array.isArray(d.keys)?d.keys:[];'
  + 'if(o.action==="remove"){d.keys=d.keys.filter(k=>k.id!==o.id);nodeFs.writeFileSync(__elKeysPath(),JSON.stringify(d,null,2),"utf8");return{ok:!0}}'
  + 'const key=String(o.key||"").trim();if(key.length<20)return{ok:!1,error:"Key không hợp lệ (quá ngắn)."};'
  + 'if(d.keys.some(k=>k.key===key))return{ok:!1,error:"Key này đã có trong danh sách."};'
  + 'let tier="",note="";try{const r=await fetch("https://api.elevenlabs.io/v1/user/subscription",{headers:{"xi-api-key":key},signal:AbortSignal.timeout(12e3)});const tx=await r.text();'
  + 'if(r.ok){try{const j=JSON.parse(tx);tier=j.tier||"";if(typeof j.character_limit=="number")note=Math.max(0,(j.character_limit||0)-(j.character_count||0)).toLocaleString("vi-VN")+" ký tự còn lại"}catch(_){}}'
  + 'else if(/missing_permissions/i.test(tx)){note="key giới hạn quyền (vẫn tạo giọng được nếu có quyền Text to Speech)"}'
  + 'else if(/invalid_api_key|invalid api key/i.test(tx)||r.status===401){return{ok:!1,error:"ElevenLabs báo key sai hoặc đã bị xóa."}}'
  + 'else return{ok:!1,error:"ElevenLabs trả lỗi "+r.status+" khi kiểm tra key."}}catch(err){return{ok:!1,error:"Không kết nối được ElevenLabs để kiểm tra key: "+(err?.message||err)}}'
  + 'const id="k"+Date.now().toString(36)+Math.random().toString(36).slice(2,6);const name=String(o.name||"").trim().slice(0,40)||("Key "+(d.keys.length+1));'
  + 'd.keys.push({id,name,key,tier,addedAt:new Date().toISOString()});nodeFs.writeFileSync(__elKeysPath(),JSON.stringify(d,null,2),"utf8");'
  + 'return{ok:!0,key:{id,name,tier,note,masked:key.slice(0,5)+"…"+key.slice(-4)}}}'
  + 'try{';
const n2 = s.split(SET_OLD).length - 1;
if (n2 !== 1) { console.error(`KHÔNG KHỚP (${n2}) — IPC thêm/xóa key. Không ghi.`); process.exit(1); }
s = s.replace(SET_OLD, () => SET_NEW);
console.log('  ✓ IPC thêm (kiểm tra với ElevenLabs) / xóa key');

const bak = FILE + '.bak_before_eleven_api_keys';
if (!fs.existsSync(bak)) fs.copyFileSync(FILE, bak);
fs.writeFileSync(FILE, s, 'utf8');
console.log('Xong. Bản gốc: ' + path.basename(bak));
