/*
 * Tris yêu cầu 12/11/2026: ô "Giọng Flow" ngay trong bảng cài đặt từng prompt (khu ĐẦU RA, chỉ Veo3).
 * - prompt.flowVoice (trống = dùng giọng chung trên thanh công cụ; chung cũng trống = như cũ).
 * - "Áp dụng cho mục chọn / tất cả" sao chép luôn flowVoice → cả loạt prompt cùng một giọng.
 * - Giọng chỉ gửi khi prompt có ảnh tham chiếu (lõi dùng ở chế độ R2V).
 */
const fs = require('fs');
const path = require('path');
const DIR = path.join(__dirname, '..', 'app', 'out', 'renderer', 'assets');

const VOICES = [['achernar','Nữ, mềm, cao'],['achird','Nam, thân thiện'],['algenib','Nam, khàn, trầm'],['algieba','Nam, thoải mái'],
  ['alnilam','Nam, chắc giọng'],['aoede','Nữ, nhẹ nhàng'],['autonoe','Nữ, tươi sáng'],['callirrhoe','Nữ, thoải mái'],
  ['charon','Nam, kể chuyện, trầm'],['despina','Nữ, mượt'],['enceladus','Nam, hơi thở, trầm'],['erinome','Nữ, rõ ràng'],
  ['fenrir','Nam, hào hứng, trẻ'],['gacrux','Nữ, trưởng thành'],['iapetus','Nam, rõ ràng'],['kore','Nữ, chắc giọng'],
  ['laomedeia','Nữ, vui tươi'],['leda','Nữ, trẻ trung'],['orus','Nam, chắc giọng'],['puck','Nam, vui tươi'],
  ['pulcherrima','Trung tính, cao'],['rasalgethi','Nam, kể chuyện'],['sadachbia','Nam, sôi nổi, trầm'],
  ['sadaltager','Nam, hiểu biết'],['schedar','Nam, đều giọng'],['sulafat','Nữ, ấm áp'],['umbriel','Nam, mượt, trầm'],
  ['vindemiatrix','Nữ, dịu dàng'],['zephyr','Nữ, tươi sáng'],['zubenelgenubi','Nam, tự nhiên']];
const opts = VOICES.map(([v, d]) => `e.jsx("option",{value:"${v}",children:"${v[0].toUpperCase() + v.slice(1)} — ${d}"},"${v}")`).join(',');

const jobs = [
  {
    file: 'VideoStudio-frcr8V6s.js',
    edits: [
      {
        name: 'ô Giọng Flow trong bảng cài đặt prompt (sau ô độ phân giải)',
        find: 'o.provider==="Veo3"&&de.length>0&&e.jsx(Qe,{value:K,options:de.map(g=>g.id),onChange:g=>S(o.id,{resolution:g}),className:"w-full h-8 justify-between"}),',
        replace: 'o.provider==="Veo3"&&de.length>0&&e.jsx(Qe,{value:K,options:de.map(g=>g.id),onChange:g=>S(o.id,{resolution:g}),className:"w-full h-8 justify-between"}),'
          + 'o.provider==="Veo3"&&e.jsxs("div",{className:"flex flex-col gap-1",title:"Giọng Flow cho prompt này. Chỉ áp dụng khi có ảnh tham chiếu (chế độ Thành phần). Nên dùng Omni 1.2 Flash. Để trống = dùng giọng chung trên thanh công cụ.",children:['
          + 'e.jsxs("div",{className:"flex items-center gap-1.5 text-[11px] font-semibold text-sky-300",children:["🎙️ Giọng Flow",o.mode==="Frames"?e.jsx("span",{className:"text-[10px] font-normal text-rose-300",children:"· Khung hình không dùng được giọng — chọn Thành phần"}):(o.referenceAssetIds||[]).length>0?null:e.jsx("span",{className:"text-[10px] font-normal text-amber-300/90",children:"· cần thêm ảnh tham chiếu"})]}),'
          + 'e.jsxs("select",{value:o.flowVoice||"",onChange:ev=>S(o.id,{flowVoice:ev.target.value}),className:"w-full h-8 rounded-lg border border-[#2e2956] bg-[#141126] px-2 text-xs font-semibold text-sky-100 outline-none cursor-pointer",children:['
          + 'e.jsx("option",{value:"",children:"Theo giọng chung (thanh công cụ)"},"none"),' + opts + ']})]}),',
      },
      {
        name: 'job dùng giọng của prompt trước, rồi tới giọng chung',
        find: '...(flowVoice&&Array.isArray(Ve)&&Ve.length>0?{voice:flowVoice}:{}),',
        replace: '...((v.flowVoice||flowVoice)&&Array.isArray(Ve)&&Ve.length>0?{voice:v.flowVoice||flowVoice}:{}),',
      },
    ],
  },
  {
    file: 'index-BS7vgKVV.js',
    edits: [
      {
        name: '"Áp dụng cho mục chọn / tất cả" sao chép giọng',
        find: 'autoUpscale:s.autoUpscale,autoRemoveWatermark:s.autoRemoveWatermark},p=i.promptRows.map(',
        replace: 'autoUpscale:s.autoUpscale,autoRemoveWatermark:s.autoRemoveWatermark,flowVoice:s.flowVoice},p=i.promptRows.map(',
      },
    ],
  },
];

const out = [];
for (const j of jobs) {
  const f = path.join(DIR, j.file);
  let s = fs.readFileSync(f, 'utf8');
  if (s.includes('o.flowVoice') || s.includes('flowVoice:s.flowVoice')) { console.error(`${j.file}: đã vá trước đó — dừng.`); process.exit(1); }
  for (const ed of j.edits) {
    const n = s.split(ed.find).length - 1;
    if (n !== 1) { console.error(`KHÔNG KHỚP: ${ed.name} — ${n} lần (cần 1). Không ghi.`); process.exit(1); }
    s = s.replace(ed.find, ed.replace);
    console.log('  ✓ ' + ed.name);
  }
  out.push([f, s]);
}
for (const [f, s] of out) {
  const bak = f + '.bak_before_flow_voice_row';
  if (!fs.existsSync(bak)) fs.copyFileSync(f, bak);
  fs.writeFileSync(f, s, 'utf8');
}
console.log('Xong.');
