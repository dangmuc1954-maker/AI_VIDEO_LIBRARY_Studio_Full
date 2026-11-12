/*
 * Tris 12/11/2026: giao diện cổng node workflow theo mẫu (chỉ giao diện, không đổi chức năng/mã cổng):
 *  - Biểu tượng cổng video = máy quay (thay ▶), cổng "Frame cuối" = cuộn phim.
 *  - Node tạo video (Google Flow/Grok chế độ Video, Muse): cổng ra xếp từ góc trên phải, cổng vào xếp từ góc dưới trái.
 */
const fs = require('fs');
const path = require('path');
const F = path.join(__dirname, '..', 'app', 'out', 'renderer', 'assets', 'WorkflowEditor-LHGC9K3C.js');
let s = fs.readFileSync(F, 'utf8');
if (s.includes('__wfIsVidNode')) { console.error('Đã vá trước đó — dừng.'); process.exit(1); }
const FILM = 't.jsxs("svg",{width:17,height:17,viewBox:"0 0 24 24",fill:"none",stroke:"currentColor",strokeWidth:2,strokeLinecap:"round",strokeLinejoin:"round",className:s,children:[t.jsx("rect",{width:18,height:18,x:3,y:3,rx:2}),t.jsx("path",{d:"M7 3v18"}),t.jsx("path",{d:"M3 7.5h4"}),t.jsx("path",{d:"M3 12h18"}),t.jsx("path",{d:"M3 16.5h4"}),t.jsx("path",{d:"M17 3v18"}),t.jsx("path",{d:"M17 7.5h4"}),t.jsx("path",{d:"M17 16.5h4"})]})';
const edits = [
  ['biểu tượng cổng Frame cuối = cuộn phim',
    'if(e.id.endsWith("-out-complete"))return t.jsx(hr,{size:18,className:s});switch(r){case"image":',
    'if(e.id.endsWith("-out-complete"))return t.jsx(hr,{size:18,className:s});if(e.id.endsWith("-out-lastframe"))return ' + FILM + ';switch(r){case"image":'],
  ['biểu tượng cổng video = máy quay',
    'case"video":return t.jsx(At,{size:20,className:`${s} fill-current ml-[0.5px]`});case"audio":return t.jsx(ar,{size:20,className:s});case"data"',
    'case"video":return t.jsx(Ti,{size:18,className:s});case"audio":return t.jsx(ar,{size:20,className:s});case"data"'],
  ['node tạo video: cổng ra góc trên phải, cổng vào góc dưới trái',
    'd=(x,y,w,m)=>{const v=i?.[x.id]||x.type,j=w===1?"50%":`${(y+1)/(w+1)*100}%`,',
    'd=(x,y,w,m)=>{const v=i?.[x.id]||x.type,j=__wfIsVidNode(e)?(m?`${30+y*40}px`:`calc(100% - ${30+(w-1-y)*40}px)`):w===1?"50%":`${(y+1)/(w+1)*100}%`,'],
];
for (const [n, a, b] of edits) {
  const c = s.split(a).length - 1;
  if (c !== 1) { console.error(`KHÔNG KHỚP (${c}) — ${n}. Không ghi.`); process.exit(1); }
  s = s.replace(a, () => b); console.log('  ✓ ' + n);
}
s += '\nfunction __wfIsVidNode(e){return!!e&&((e.type==="google-flow"||e.type==="grok")&&e.config?.mode==="Video"||e.type==="muse")}\n';
fs.writeFileSync(F, s, 'utf8');
