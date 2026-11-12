/*
 * Tris 13/11/2026: viền LED khi node chạy phải CHẠY VÒNG (bản trước đứng yên) + trong node hiện thời gian chạy và %.
 * - Thẻ node đang chạy có thêm lớp "wf-led" (dải màu xoay liên tục, chỉ lộ phần viền) — chỉ giao diện.
 * - Vòng quay tiến độ của node model: thêm đồng hồ mm:ss (đếm từ lúc node bắt đầu chạy) phía trên số %.
 */
const fs = require('fs');
const path = require('path');
const F = path.join(__dirname, '..', 'app', 'out', 'renderer', 'assets', 'WorkflowEditor-LHGC9K3C.js');
let s = fs.readFileSync(F, 'utf8');
if (s.includes('__WfTimer')) { console.error('Đã vá trước đó — dừng.'); process.exit(1); }
const edits = [
  ['lớp LED xoay trong thẻ node đang chạy',
    'children:[t.jsx(dp,{node:e}),tr&&',
    'children:[e.status==="running"&&t.jsx("div",{className:"wf-led","aria-hidden":"true",children:t.jsx("div",{className:"wf-led-spin"})}),t.jsx(dp,{node:e}),tr&&'],
  ['đồng hồ thời gian chạy + %',
    'children:[t.jsx("div",{className:"w-8 h-8 rounded-full border-2 border-accent border-t-transparent animate-spin"}),t.jsxs("span",{className:"text-[10px] text-text-muted font-semibold tabular-nums",children:[e.progress||0,"%"]})]}):t.jsx(vt,{size:28,strokeWidth:1.2})',
    'children:[t.jsx("div",{className:"w-8 h-8 rounded-full border-2 border-accent border-t-transparent animate-spin"}),t.jsx(__WfTimer,{id:e.id}),t.jsxs("span",{className:"text-[10px] text-text-muted font-semibold tabular-nums",children:[e.progress||0,"%"]})]}):t.jsx(vt,{size:28,strokeWidth:1.2})'],
];
for (const [n, a, b] of edits) {
  const c = s.split(a).length - 1;
  if (c !== 1) { console.error(`KHÔNG KHỚP (${c}) — ${n}. Không ghi.`); process.exit(1); }
  s = s.replace(a, () => b); console.log('  ✓ ' + n);
}
s += '\nconst __wfRunStarts=new Map();'
  + 'function __WfTimer({id}){const[,__tick]=C.useState(0);'
  + 'if(!__wfRunStarts.has(id))__wfRunStarts.set(id,Date.now());'
  + 'C.useEffect(()=>{const iv=setInterval(()=>__tick(x=>x+1),1000);return()=>{clearInterval(iv);__wfRunStarts.delete(id)}},[id]);'
  + 'const sec=Math.max(0,Math.floor((Date.now()-__wfRunStarts.get(id))/1000)),mm=String(Math.floor(sec/60)).padStart(2,"0"),ss=String(sec%60).padStart(2,"0");'
  + 'return t.jsx("span",{className:"text-[13px] font-semibold tabular-nums text-text-primary",children:mm+":"+ss})}\n';
fs.writeFileSync(F, s, 'utf8');
