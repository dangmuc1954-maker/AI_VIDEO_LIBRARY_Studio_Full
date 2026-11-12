/*
 * Tris duyệt 12/11/2026: sửa lỗi ElevenLabs báo "phiên đăng nhập hết hạn" dù Browser Hub vẫn Logged In.
 * Nguyên nhân: chìa khóa đăng nhập (Firebase ID token) chỉ sống 1 tiếng; cửa sổ ElevenLabs chạy ngầm không tự làm mới,
 * tool lấy chìa khóa cũ mà không kiểm tra hạn → ElevenLabs từ chối.
 * Sửa (chỉ trong hàm extractElevenLabsToken): đọc chìa khóa trong trang → còn hạn thì dùng;
 * hết hạn thì dùng mã làm mới (refresh token) xin chìa khóa mới NGAY TRONG TRANG elevenlabs.io
 * (Google chỉ cấp khi yêu cầu đến từ trang ElevenLabs).
 */
const fs = require('fs');
const path = require('path');
const FILE = path.join(__dirname, '..', 'app', 'out', 'main', 'index.js');

const OLD = 'const viewToken=await viewObj.view.webContents.executeJavaScript(`(async()=>{try{const tok=await new Promise(res=>{try{const req=indexedDB.open("firebaseLocalStorageDb");req.onsuccess=()=>{try{const db=req.result,tx=db.transaction(["firebaseLocalStorage"],"readonly"),st=tx.objectStore("firebaseLocalStorage"),all=st.getAll();all.onsuccess=()=>{for(const item of(all.result||[])){const t=item?.value?.stsTokenManager?.accessToken;if(t)return res(t)}res(null)};all.onerror=()=>res(null)}catch(_){res(null)}};req.onerror=()=>res(null)}catch(_){res(null)}});if(tok)return tok;for(let i=0;i<localStorage.length;i++){const k=localStorage.key(i)||"",v=localStorage.getItem(k)||"";if(v.includes("stsTokenManager")){try{const p=JSON.parse(v);if(p?.stsTokenManager?.accessToken)return p.stsTokenManager.accessToken}catch(_){}}}return null}catch(_){return null}})()`,!0).catch(()=>null);';

const NEW = 'const viewToken=await viewObj.view.webContents.executeJavaScript(`(async()=>{try{'
  + 'const now=Date.now();'
  + 'const expOf=t=>{try{return JSON.parse(atob(String(t).split(".")[1].replace(/-/g,"+").replace(/_/g,"/"))).exp*1000}catch(_){return 0}};'
  + 'const users=await new Promise(res=>{try{const req=indexedDB.open("firebaseLocalStorageDb");req.onsuccess=()=>{try{const db=req.result,tx=db.transaction(["firebaseLocalStorage"],"readonly"),st=tx.objectStore("firebaseLocalStorage"),all=st.getAll();all.onsuccess=()=>res((all.result||[]).filter(i=>i&&i.value).map(i=>Object.assign({},i.value,{__k:i.fbase_key||""})));all.onerror=()=>res([])}catch(_){res([])}};req.onerror=()=>res([])}catch(_){res([])}});'
  + 'for(let i=0;i<localStorage.length;i++){const k=localStorage.key(i)||"",v=localStorage.getItem(k)||"";if(v.includes("stsTokenManager")){try{users.push(Object.assign(JSON.parse(v),{__k:k}))}catch(_){}}}'
  // 1. Chìa khóa còn hạn (> 2 phút) → dùng luôn
  + 'for(const u of users){const m=u&&u.stsTokenManager;if(m&&m.accessToken&&expOf(m.accessToken)>now+120000)return m.accessToken}'
  // 2. Hết hạn → xin chìa khóa mới bằng mã làm mới (gửi từ chính trang elevenlabs.io)
  + 'for(const u of users){const m=u&&u.stsTokenManager;const key=(u&&u.apiKey)||String((u&&u.__k)||"").split(":")[2]||"";if(m&&m.refreshToken&&key){try{const r=await fetch("https://securetoken.googleapis.com/v1/token?key="+encodeURIComponent(key),{method:"POST",headers:{"Content-Type":"application/x-www-form-urlencoded"},body:"grant_type=refresh_token&refresh_token="+encodeURIComponent(m.refreshToken)});if(r.ok){const j=await r.json();const nt=j&&(j.id_token||j.access_token);if(nt)return nt}}catch(_){}}}'
  // 3. Không xin được → trả chìa khóa cũ như trước (lỗi sẽ báo ra như cũ)
  + 'for(const u of users){const m=u&&u.stsTokenManager;if(m&&m.accessToken)return m.accessToken}'
  + 'return null}catch(_){return null}})()`,!0).catch(()=>null);';

let s = fs.readFileSync(FILE, 'utf8');
if (s.includes('securetoken.googleapis.com/v1/token')) { console.error('Đã vá trước đó — dừng.'); process.exit(1); }
const n = s.split(OLD).length - 1;
if (n !== 1) { console.error(`KHÔNG KHỚP (${n} lần, cần 1). Không ghi.`); process.exit(1); }
s = s.replace(OLD, () => NEW);
const bak = FILE + '.bak_before_eleven_token_refresh';
if (!fs.existsSync(bak)) fs.copyFileSync(FILE, bak);
fs.writeFileSync(FILE, s, 'utf8');
console.log('  ✓ extractElevenLabsToken: kiểm tra hạn + tự xin chìa khóa mới');
console.log('Xong. Bản gốc: ' + path.basename(bak));
