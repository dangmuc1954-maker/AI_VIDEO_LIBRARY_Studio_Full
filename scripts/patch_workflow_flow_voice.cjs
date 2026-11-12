/*
 * Tris duyệt 12/11/2026: node video Google Flow (Veo3) trong Workflow — ô "Giọng Flow" (config.flowVoice).
 * - Bộ chạy: chỉ gắn payload.voice khi node ở chế độ R2V (có ảnh tham chiếu). Trống = như cũ.
 * Không đụng node Grok / Muse / ảnh.
 */
const fs = require('fs');
const path = require('path');
const DIR = path.join(__dirname, '..', 'app', 'out', 'renderer', 'assets');
const VOICES = ['achernar','achird','algenib','algieba','alnilam','aoede','autonoe','callirrhoe','charon','despina','enceladus',
  'erinome','fenrir','gacrux','iapetus','kore','laomedeia','leda','orus','puck','pulcherrima','rasalgethi','sadachbia',
  'sadaltager','schedar','sulafat','umbriel','vindemiatrix','zephyr','zubenelgenubi'];
const opts = VOICES.map(v => `t.jsx("option",{value:"${v}",children:"${v[0].toUpperCase() + v.slice(1)}"},"${v}")`).join(',');

const jobs = [
  {
    file: 'WorkflowEditor-LHGC9K3C.js',
    name: 'ô Giọng Flow trong cài đặt node video',
    find: 'x==="Video"&&T.length>0&&t.jsx(Ee,{value:P,onChange:I=>o({...r,resolution:I}),options:T.map(I=>({value:I.id,label:I.label}))}),',
    replace: 'x==="Video"&&T.length>0&&t.jsx(Ee,{value:P,onChange:I=>o({...r,resolution:I}),options:T.map(I=>({value:I.id,label:I.label}))}),'
      + 'x==="Video"&&t.jsxs("div",{className:"flex flex-col gap-1.5",title:"Giọng Flow: chỉ áp dụng khi node có ảnh tham chiếu (Thành phần / R2V). Nên dùng Omni 1.2 Flash. Trống = Flow tự chọn giọng như cũ.",children:['
      + 't.jsx("span",{className:"text-[9px] text-text-muted font-bold uppercase tracking-wider select-none",children:"🎙️ Giọng Flow (cần ảnh tham chiếu)"}),'
      + 't.jsxs("select",{value:r.flowVoice||"",onChange:ev=>o({...r,flowVoice:ev.target.value}),className:"rounded-md border border-white/10 bg-[#0B0F17] px-2 py-1 text-[11px] font-semibold text-sky-200 outline-none",children:['
      + 't.jsx("option",{value:"",children:"Tự động (như cũ)"},"none"),' + opts + ']})]}),',
  },
  {
    file: 'useWorkflowRunner-DGw6Ekx4.js',
    name: 'node chạy: gắn giọng khi R2V',
    find: 'Y,promptId:e.id,prompt:c,ratio:h,mode:Rl(ee),flowVideoMode:ee,',
    replace: 'Y,promptId:e.id,prompt:c,ratio:h,mode:Rl(ee),flowVideoMode:ee,...(typeof e.config?.flowVoice=="string"&&e.config.flowVoice&&ee==="R2V"?{voice:e.config.flowVoice}:{}),',
  },
];

const out = [];
for (const j of jobs) {
  const f = path.join(DIR, j.file);
  const s = fs.readFileSync(f, 'utf8');
  if (s.includes('flowVoice')) { console.error(`${j.file}: đã vá trước đó — dừng.`); process.exit(1); }
  const n = s.split(j.find).length - 1;
  if (n !== 1) { console.error(`KHÔNG KHỚP: ${j.name} — ${n} lần (cần 1). Không ghi.`); process.exit(1); }
  out.push([f, s.replace(j.find, j.replace)]);
  console.log('  ✓ ' + j.name);
}
for (const [f, s] of out) {
  const bak = f + '.bak_before_flow_voice';
  if (!fs.existsSync(bak)) fs.copyFileSync(f, bak);
  fs.writeFileSync(f, s, 'utf8');
}
console.log('Xong.');
