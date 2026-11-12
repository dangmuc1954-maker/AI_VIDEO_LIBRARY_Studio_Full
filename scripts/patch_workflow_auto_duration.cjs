/*
 * Tris 13/11/2026: node Google Flow (Video) trong workflow — có video tham chiếu thì ô giây tự thành
 * "🎬 Auto (theo video tham chiếu)" giống Studio Video (lõi đã tự lấy độ dài video, đây chỉ là giao diện).
 * Có video tham chiếu = có dây nối vào cổng "-in-vid" HOẶC danh sách tham chiếu của node có asset video.
 */
const fs = require('fs');
const path = require('path');
const F = path.join(__dirname, '..', 'app', 'out', 'renderer', 'assets', 'WorkflowEditor-LHGC9K3C.js');
let s = fs.readFileSync(F, 'utf8');
if (s.includes('__wfHasVidRef')) { console.error('Đã vá trước đó — dừng.'); process.exit(1); }
const edits = [
  ['ghi lại node có dây vào cổng video tham chiếu',
    'Te=C.useMemo(()=>{const Y=new Set;for(const xe of r)Y.add(xe.toNode);return Y},[r])',
    'Te=C.useMemo(()=>{const Y=new Set;for(const xe of r)Y.add(xe.toNode);try{window.__wfVidConn=new Set(r.filter(c=>String(c.toPort||"").endsWith("-in-vid")).map(c=>c.toNode))}catch(_){}return Y},[r])'],
  ['bảng cài đặt: ô giây thành Auto khi có video tham chiếu',
    't.jsx("div",{className:"flex flex-wrap gap-1.5",children:(k?A.map(I=>I.id):gh(r)).map(I=>t.jsx("button",{type:"button",onClick:()=>o({...r,duration:I})',
    '__wfHasVidRef(e,r,f)?t.jsx("div",{title:"Có video tham chiếu: thời lượng tự lấy theo độ dài video tham chiếu (tối đa 10 giây)",className:"rounded-md border border-violet-400/40 bg-violet-500/10 px-3 py-1.5 text-[11px] font-semibold text-violet-200",children:"🎬 Auto (theo video tham chiếu)"}):t.jsx("div",{className:"flex flex-wrap gap-1.5",children:(k?A.map(I=>I.id):gh(r)).map(I=>t.jsx("button",{type:"button",onClick:()=>o({...r,duration:I})'],
];
for (const [n, a, b] of edits) {
  const c = s.split(a).length - 1;
  if (c !== 1) { console.error(`KHÔNG KHỚP (${c}) — ${n}. Không ghi.`); process.exit(1); }
  s = s.replace(a, () => b); console.log('  ✓ ' + n);
}
s += '\nfunction __wfHasVidRef(e,r,f){try{if(!e||e.type!=="google-flow"||(r?.mode||"Video")!=="Video")return!1;if(window.__wfVidConn&&window.__wfVidConn.has(e.id))return!0;const as=Array.isArray(f)?f:[];return(Array.isArray(r?.referenceAssetIds)?r.referenceAssetIds:[]).some(id=>as.find(a=>a.id===id)?.type==="video")}catch(_){return!1}}\n';
fs.writeFileSync(F, s, 'utf8');
