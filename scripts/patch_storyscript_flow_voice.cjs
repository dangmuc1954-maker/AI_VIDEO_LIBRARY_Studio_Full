/*
 * Tris duyệt 12/11/2026: Studio Kịch Bản — thêm model "Omni 1.2 Flash" + "Giọng Flow" theo từng dự án.
 * - proj.flowVoice (trống = như cũ). Chỉ gắn payload.voice cho cảnh Veo3 có ảnh tham chiếu (lõi dùng ở R2V).
 * Không đụng cảnh Muse / Grok.
 */
const fs = require('fs');
const path = require('path');
const FILE = path.join(__dirname, '..', 'app', 'out', 'renderer', 'assets', 'StoryScriptStudio.js');

const VOICES = [['achernar','Nữ, mềm, cao'],['achird','Nam, thân thiện'],['algenib','Nam, khàn, trầm'],['algieba','Nam, thoải mái'],
  ['alnilam','Nam, chắc giọng'],['aoede','Nữ, nhẹ nhàng'],['autonoe','Nữ, tươi sáng'],['callirrhoe','Nữ, thoải mái'],
  ['charon','Nam, kể chuyện, trầm'],['despina','Nữ, mượt'],['enceladus','Nam, hơi thở, trầm'],['erinome','Nữ, rõ ràng'],
  ['fenrir','Nam, hào hứng, trẻ'],['gacrux','Nữ, trưởng thành'],['iapetus','Nam, rõ ràng'],['kore','Nữ, chắc giọng'],
  ['laomedeia','Nữ, vui tươi'],['leda','Nữ, trẻ trung'],['orus','Nam, chắc giọng'],['puck','Nam, vui tươi'],
  ['pulcherrima','Trung tính, cao'],['rasalgethi','Nam, kể chuyện'],['sadachbia','Nam, sôi nổi, trầm'],
  ['sadaltager','Nam, hiểu biết'],['schedar','Nam, đều giọng'],['sulafat','Nữ, ấm áp'],['umbriel','Nam, mượt, trầm'],
  ['vindemiatrix','Nữ, dịu dàng'],['zephyr','Nữ, tươi sáng'],['zubenelgenubi','Nam, tự nhiên']];
const opts = VOICES.map(([v, d]) => `              React.createElement("option", { key: "${v}", value: "${v}" }, "${v[0].toUpperCase() + v.slice(1)} — ${d}")`).join(',\n');

const edits = [
  {
    name: 'thêm model Omni 1.2 Flash vào danh sách',
    find: '                    React.createElement("option", { value: "Omni 1.1 Flash" }, "Omni Flash"),',
    replace: '                    React.createElement("option", { value: "Omni 1.2 Flash" }, "Omni 1.2 Flash"),\n                    React.createElement("option", { value: "Omni 1.1 Flash" }, "Omni Flash"),',
  },
  {
    name: 'gắn giọng vào cảnh Veo3 có ảnh tham chiếu',
    find: '          referenceAssetIds: refIds,\n          preset: "custom",\n          studioSource: "story-script-studio",',
    replace: '          referenceAssetIds: refIds,\n          ...(!isMuse && !isGrok && proj.flowVoice && refIds.length > 0 ? { voice: proj.flowVoice } : {}),\n          preset: "custom",\n          studioSource: "story-script-studio",',
  },
  {
    name: 'ô chọn Giọng Flow theo dự án',
    find: '          // Dropdown Chuyển cảnh (chỉ hiện khi autoMerge bật)',
    replace: `          // Giọng Flow (Veo3): một giọng cho cả dự án, chỉ áp cho cảnh có ảnh tham chiếu
          React.createElement("div", { className: "flex items-center gap-1.5", title: "Giọng Flow cho cảnh Veo3: chỉ áp dụng khi cảnh có ảnh tham chiếu. Nên dùng Omni 1.2 Flash. Để trống = Flow tự chọn giọng như cũ." },
            React.createElement("span", { className: "text-xs text-slate-400 font-semibold whitespace-nowrap" }, "🎙️ Giọng Flow:"),
            React.createElement("select", {
              value: currentProject.flowVoice || "",
              onChange: e => updateProject(currentProject.id, { flowVoice: e.target.value }),
              className: "bg-[#0B0F17] text-sky-200 text-xs border border-sky-500/30 rounded-lg px-2 py-1.5 outline-none cursor-pointer font-semibold"
            },
              React.createElement("option", { key: "none", value: "" }, "Tự động (như cũ)"),
${opts}
            )
          ),

          // Dropdown Chuyển cảnh (chỉ hiện khi autoMerge bật)`,
  },
];

let s = fs.readFileSync(FILE, 'utf8');
if (s.includes('flowVoice')) { console.error('Đã vá trước đó — dừng.'); process.exit(1); }
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
