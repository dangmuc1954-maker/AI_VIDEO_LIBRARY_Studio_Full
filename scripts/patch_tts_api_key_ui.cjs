/*
 * Tris yêu cầu 12/11/2026 — Studio Giọng Đọc: quản lý API Key ElevenLabs.
 * - Nút "Key ElevenLabs" (trước dùng window.prompt — không chạy trong Electron) → hộp quản lý key:
 *   danh sách key, xóa key, dán key + tên → kiểm tra thật với ElevenLabs → lưu.
 * - Mỗi key thêm vào ô "Tài khoản" của từng câu: "🔑 <tên> (API Key)".
 * - Câu chọn key → gửi job với accountId "apikey:<id>" (lõi dùng đúng key đó).
 * Cần chạy sau scripts/patch_elevenlabs_api_keys.cjs (lõi).
 */
const fs = require('fs');
const path = require('path');
const FILE = path.join(__dirname, '..', 'app', 'out', 'renderer', 'assets', 'TTSStudio-DfUKIn_N.js');
let s = fs.readFileSync(FILE, 'utf8');
if (s.includes('__openElevenKeyModal')) { console.error('Đã vá trước đó — dừng.'); process.exit(1); }

const MODAL = 'function __elEsc(x){return String(x==null?"":x).replace(/[&<>"\']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;","\\"":"&quot;","\'":"&#39;"}[c]))}'
  + 'function __openElevenKeyModal(){if(document.getElementById("__elkm"))return;const api=window.aiforge?.browser;'
  + 'const ov=document.createElement("div");ov.id="__elkm";ov.style.cssText="position:fixed;inset:0;z-index:99999;background:rgba(0,0,0,.65);display:flex;align-items:center;justify-content:center";'
  + 'const box=document.createElement("div");box.style.cssText="width:min(560px,92vw);max-height:90vh;overflow:auto;background:#17152d;border:1px solid rgba(168,85,247,.45);border-radius:16px;padding:18px 20px;color:#e2e8f0;box-shadow:0 20px 60px rgba(0,0,0,.6);font-size:13px";'
  + 'const inp="width:100%;box-sizing:border-box;height:36px;border-radius:10px;border:1px solid rgba(255,255,255,.12);background:#0B0F17;color:#fff;padding:0 10px;font-size:13px;outline:none";'
  + 'box.innerHTML="<div style=\\"display:flex;align-items:center;justify-content:space-between;margin-bottom:6px\\"><div style=\\"font-size:16px;font-weight:700\\">🔑 API Key ElevenLabs</div><button data-x style=\\"background:none;border:0;color:#94a3b8;font-size:20px;cursor:pointer\\">×</button></div>"'
  + '+"<div style=\\"color:#94a3b8;font-size:12px;line-height:1.55;margin-bottom:12px\\">Lấy key: elevenlabs.io → avatar → <b>API Keys</b> → Create API Key (bật quyền <b>Text to Speech</b>) → copy key dạng <code>sk_…</code>. Key được kiểm tra với ElevenLabs trước khi lưu; mỗi key sẽ hiện trong ô <b>Tài khoản</b> để chọn khi tạo giọng.</div>"'
  + '+"<div data-list style=\\"display:flex;flex-direction:column;gap:6px;margin-bottom:12px\\"></div>"'
  + '+"<div style=\\"display:grid;grid-template-columns:1fr 2fr;gap:8px;margin-bottom:8px\\"><input data-name placeholder=\\"Tên (vd: Key chính)\\" style=\\""+inp+"\\"><input data-key type=\\"password\\" placeholder=\\"Dán API Key sk_…\\" autocomplete=\\"off\\" style=\\""+inp+"\\"></div>"'
  + '+"<div data-st style=\\"min-height:18px;font-size:12px;margin-bottom:10px\\"></div>"'
  + '+"<div style=\\"display:flex;justify-content:flex-end;gap:8px\\"><button data-x style=\\"height:34px;padding:0 14px;border-radius:10px;border:1px solid rgba(255,255,255,.15);background:transparent;color:#cbd5e1;cursor:pointer\\">Đóng</button><button data-save style=\\"height:34px;padding:0 16px;border-radius:10px;border:0;background:linear-gradient(90deg,#7c3aed,#4f46e5);color:#fff;font-weight:700;cursor:pointer\\">Kiểm tra &amp; Lưu</button></div>";'
  + 'ov.appendChild(box);document.body.appendChild(ov);'
  + 'const $=q=>box.querySelector(q),st=(t,c)=>{const el=$("[data-st]");el.textContent=t||"";el.style.color=c||"#cbd5e1"};'
  + 'const close=()=>{ov.remove();document.removeEventListener("keydown",onKey)};const onKey=ev=>{if(ev.key==="Escape")close()};document.addEventListener("keydown",onKey);'
  + 'ov.addEventListener("mousedown",ev=>{if(ev.target===ov)close()});box.querySelectorAll("[data-x]").forEach(b=>b.addEventListener("click",close));'
  + 'const changed=()=>{try{window.dispatchEvent(new Event("aiforge-eleven-keys-changed"))}catch(_){}};'
  + 'const render=async()=>{const list=$("[data-list]");let ks=[];try{ks=await api?.getElevenLabsKey?.({action:"list"})||[]}catch(_){}'
  + 'if(!Array.isArray(ks)||ks.length===0){list.innerHTML="<div style=\\"color:#64748b;font-size:12px\\">Chưa có key nào.</div>";return}'
  + 'list.innerHTML=ks.map(k=>"<div style=\\"display:flex;align-items:center;gap:8px;border:1px solid rgba(168,85,247,.25);background:rgba(124,58,237,.08);border-radius:10px;padding:7px 10px\\"><span style=\\"font-weight:700\\">🔑 "+__elEsc(k.name)+"</span><span style=\\"color:#94a3b8;font-family:monospace;font-size:11px\\">"+__elEsc(k.masked)+"</span>"+(k.tier?"<span style=\\"font-size:11px;color:#a5b4fc\\">gói "+__elEsc(k.tier)+"</span>":"")+"<span style=\\"flex:1\\"></span><button data-del=\\""+__elEsc(k.id)+"\\" title=\\"Xóa key\\" style=\\"background:rgba(239,68,68,.15);border:1px solid rgba(239,68,68,.4);color:#fca5a5;border-radius:8px;height:26px;padding:0 9px;cursor:pointer\\">Xóa</button></div>").join("");'
  + 'list.querySelectorAll("[data-del]").forEach(b=>b.addEventListener("click",async()=>{if(!window.confirm("Xóa key này khỏi tool?"))return;await api?.setElevenLabsKey?.({action:"remove",id:b.getAttribute("data-del")});changed();render();st("Đã xóa key.","#fca5a5")}))};'
  + '$("[data-save]").addEventListener("click",async()=>{const key=$("[data-key]").value.trim(),name=$("[data-name]").value.trim();if(!key){st("Dán API Key vào ô trước đã.","#fbbf24");return}'
  + 'const b=$("[data-save]");b.disabled=!0;b.style.opacity=".6";st("Đang kiểm tra key với ElevenLabs…","#93c5fd");'
  + 'try{const r=await api?.setElevenLabsKey?.({action:"add",key,name});if(r&&r.ok){$("[data-key]").value="";$("[data-name]").value="";st("✅ Đã thêm "+r.key.name+(r.key.tier?" (gói "+r.key.tier+")":"")+(r.key.note?" — "+r.key.note:"")+". Chọn key này trong ô Tài khoản để tạo giọng.","#34d399");changed();render();try{j.success("Đã thêm API Key ElevenLabs: "+r.key.name)}catch(_){}}'
  + 'else st("❌ "+((r&&r.error)||"Không lưu được key."),"#f87171")}catch(err){st("❌ "+(err?.message||err),"#f87171")}finally{b.disabled=!1;b.style.opacity="1"}});'
  + 'render();setTimeout(()=>{try{$("[data-key]").focus()}catch(_){}},50)}';

const edits = [
  ['hộp quản lý key', 'function ms({accountOptions:accountOptions,', MODAL + 'function ms({accountOptions:accountOptions,', 1],
  ['nạp danh sách key cho ô Tài khoản', 'const accountOptions=m.useMemo(',
    'const[__elKeys,__setElKeys]=m.useState([]);m.useEffect(()=>{let __on=!0;const __ld=()=>{Promise.resolve(window.aiforge?.browser?.getElevenLabsKey?.({action:"list"})).then(x=>{__on&&__setElKeys(Array.isArray(x)?x:[])}).catch(()=>{})};__ld();window.addEventListener("aiforge-eleven-keys-changed",__ld);return()=>{__on=!1;window.removeEventListener("aiforge-eleven-keys-changed",__ld)}},[]);const accountOptions=m.useMemo(', 1],
  ['key hiện trong ô Tài khoản', ')+(st.authStatus==="Logged In"?" (Đã đăng nhập)":"")}))],[elevenSessions]);',
    ')+(st.authStatus==="Logged In"?" (Đã đăng nhập)":"")})),...__elKeys.map(k=>({value:"apikey:"+k.id,label:"🔑 "+k.name+" (API Key)"}))],[elevenSessions,__elKeys]);', 1],
  ['ô Tài khoản giữ lựa chọn key (bảng)', 'elevenSessions.some(st=>(st.accountDisplayName||st.accountName||st.accountId)===a.account)',
    '(elevenSessions.some(st=>(st.accountDisplayName||st.accountName||st.accountId)===a.account)||String(a.account||"").startsWith("apikey:"))', -1],
  ['ô Tài khoản giữ lựa chọn key (chi tiết)', 'elevenSessions.some(st=>(st.accountDisplayName||st.accountName||st.accountId)===r.account)',
    '(elevenSessions.some(st=>(st.accountDisplayName||st.accountName||st.accountId)===r.account)||String(r.account||"").startsWith("apikey:"))', -1],
  ['câu chọn key gửi đúng key', 'accountId:(elevenSessions.find(st=>st.accountDisplayName===g.account||st.accountName===g.account||st.accountId===g.account)?.accountId)',
    'accountId:(String(g.account||"").startsWith("apikey:")?g.account:elevenSessions.find(st=>st.accountDisplayName===g.account||st.accountName===g.account||st.accountId===g.account)?.accountId)', 2],
  ['tên hiển thị khi chọn key', 'children:r.account||"Tự động phân bổ"',
    'children:(String(r.account||"").startsWith("apikey:")?"🔑 API Key":r.account)||"Tự động phân bổ"', 1],
];
for (const [name, a, b, want] of edits) {
  const n = s.split(a).length - 1;
  if ((want === -1 && n < 1) || (want !== -1 && n !== want)) { console.error(`KHÔNG KHỚP (${n}) — ${name}. Không ghi.`); process.exit(1); }
  s = s.split(a).join(b);
  console.log(`  ✓ ${name} (${n} chỗ)`);
}

// Nút "Key ElevenLabs": mở hộp quản lý thay cho window.prompt
const a0 = s.indexOf('onClick:async()=>{const cur=await window.aiforge?.browser?.getElevenLabsKey?.()');
const a1 = s.indexOf('},className:"inline-flex h-8 cursor-pointer items-center gap-1.5 rounded-lg border border-purple-400/50', a0);
if (a0 < 0 || a1 < 0 || a1 - a0 > 600) { console.error('KHÔNG KHỚP — nút Key ElevenLabs. Không ghi.'); process.exit(1); }
s = s.slice(0, a0) + 'onClick:()=>__openElevenKeyModal()' + s.slice(a1 + 1);
console.log('  ✓ nút Key ElevenLabs mở hộp quản lý key');

const bak = FILE + '.bak_before_api_key_ui';
if (!fs.existsSync(bak)) fs.copyFileSync(FILE, bak);
fs.writeFileSync(FILE, s, 'utf8');
console.log('Xong. Bản gốc: ' + path.basename(bak));
