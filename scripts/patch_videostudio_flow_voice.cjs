/*
 * Tris duyệt 12/11/2026: ô chọn "Giọng Flow" trên thanh công cụ Studio Video (Veo3).
 * - Lựa chọn lưu localStorage "aiforge:flow_voice" (trống = không gắn giọng, job y như cũ).
 * - Chỉ gắn payload.voice cho job Veo3 có ảnh tham chiếu (lõi chỉ dùng giọng ở chế độ R2V).
 * Không đụng job Muse / Grok.
 */
const fs = require('fs');
const path = require('path');
const FILE = path.join(__dirname, '..', 'app', 'out', 'renderer', 'assets', 'VideoStudio-frcr8V6s.js');

const VOICES = ['achernar', 'achird', 'algenib', 'algieba', 'alnilam', 'aoede', 'autonoe', 'callirrhoe', 'charon', 'despina',
  'enceladus', 'erinome', 'fenrir', 'gacrux', 'iapetus', 'kore', 'laomedeia', 'leda', 'orus', 'puck', 'pulcherrima',
  'rasalgethi', 'sadachbia', 'sadaltager', 'schedar', 'sulafat', 'umbriel', 'vindemiatrix', 'zephyr', 'zubenelgenubi'];
const DESC = {achernar:'Nữ, mềm, cao',achird:'Nam, thân thiện',algenib:'Nam, khàn, trầm',algieba:'Nam, thoải mái',alnilam:'Nam, chắc giọng',
  aoede:'Nữ, nhẹ nhàng',autonoe:'Nữ, tươi sáng',callirrhoe:'Nữ, thoải mái',charon:'Nam, kể chuyện, trầm',despina:'Nữ, mượt',
  enceladus:'Nam, hơi thở, trầm',erinome:'Nữ, rõ ràng',fenrir:'Nam, hào hứng, trẻ',gacrux:'Nữ, trưởng thành',iapetus:'Nam, rõ ràng',
  kore:'Nữ, chắc giọng',laomedeia:'Nữ, vui tươi',leda:'Nữ, trẻ trung',orus:'Nam, chắc giọng',puck:'Nam, vui tươi',
  pulcherrima:'Trung tính, cao',rasalgethi:'Nam, kể chuyện',sadachbia:'Nam, sôi nổi, trầm',sadaltager:'Nam, hiểu biết',
  schedar:'Nam, đều giọng',sulafat:'Nữ, ấm áp',umbriel:'Nam, mượt, trầm',vindemiatrix:'Nữ, dịu dàng',zephyr:'Nữ, tươi sáng',
  zubenelgenubi:'Nam, tự nhiên'};
const cap = s => s[0].toUpperCase() + s.slice(1);
const optionsJs = VOICES.map(v => `e.jsx("option",{value:"${v}",children:"${cap(v)} — ${DESC[v]}"},"${v}")`).join(',');

const edits = [
  {
    name: 'trạng thái giọng Flow',
    find: 'const[museTimeoutLimit,setMuseTimeoutLimit]=l.useState(',
    replace: 'const[flowVoice,setFlowVoice]=l.useState(()=>{try{return localStorage.getItem("aiforge:flow_voice")||""}catch(_){return""}});const[museTimeoutLimit,setMuseTimeoutLimit]=l.useState(',
  },
  {
    name: 'gắn giọng vào job Veo3 có ảnh tham chiếu',
    find: '            referenceAssetIds:Ve,\n            studioSource:"video-studio",',
    replace: '            referenceAssetIds:Ve,\n            ...(flowVoice&&Array.isArray(Ve)&&Ve.length>0?{voice:flowVoice}:{}),\n            studioSource:"video-studio",',
  },
  {
    name: 'ô chọn Giọng Flow trên thanh công cụ',
    find: 'children:[museTimeoutLimit?"⏱️ Chế độ Muse: Giới hạn 8p":"⏳ Chế độ Muse: Chờ đến khi xong"]}),',
    replace: 'children:[museTimeoutLimit?"⏱️ Chế độ Muse: Giới hạn 8p":"⏳ Chế độ Muse: Chờ đến khi xong"]}),'
      + 'e.jsxs("select",{value:flowVoice,onChange:ev=>{const vv=ev.target.value;setFlowVoice(vv);try{localStorage.setItem("aiforge:flow_voice",vv)}catch(_){}z.info(vv?`Giọng Flow: ${vv} — áp cho cảnh Veo3 có ảnh tham chiếu (nên dùng Omni 1.2 Flash)`:"Đã tắt giọng Flow: Flow tự chọn giọng như cũ")},'
      + 'title:"Giọng Flow cho video Veo3: chỉ áp dụng khi cảnh có ảnh tham chiếu (chế độ Thành phần). Nên dùng model Omni 1.2 Flash. Để trống = Flow tự chọn giọng như cũ.",'
      + 'className:`h-8 cursor-pointer rounded-lg border px-2 text-xs font-semibold shadow-sm outline-none transition-all ${flowVoice?"border-sky-400/60 bg-sky-500/20 text-sky-200":"border-white/15 bg-white/5 text-slate-300"}`,'
      + 'children:[e.jsx("option",{value:"",children:"🎙️ Giọng Flow: Tự động"},"none"),' + optionsJs + ']}),',
  },
];

let s = fs.readFileSync(FILE, 'utf8');
if (s.includes('aiforge:flow_voice')) { console.error('Đã vá trước đó — dừng.'); process.exit(1); }
for (const ed of edits) {
  const n = s.split(ed.find).length - 1;
  if (n !== 1) { console.error(`KHÔNG KHỚP: ${ed.name} — ${n} lần (cần 1). Không ghi.`); process.exit(1); }
  s = s.replace(ed.find, ed.replace);
  console.log('  ✓ ' + ed.name);
}
const bak = FILE + '.bak_before_flow_voice';
if (!fs.existsSync(bak)) fs.copyFileSync(FILE, bak);
fs.writeFileSync(FILE, s, 'utf8');
console.log('Xong. Bản gốc: ' + path.basename(bak));
