/*
 * Tris yêu cầu 12/11/2026: "chế độ thông minh" — prompt Veo3 có VIDEO tham chiếu thì ô chọn giây tự thành
 * "Auto (theo video)" (khóa, không chọn tay), lõi lấy đúng độ dài video tham chiếu (tối đa 10 giây).
 * - Studio Video: ô giây ở bảng prompt + khung sửa prompt → nhãn "🎬 Auto (theo video)" khi có video tham chiếu.
 * - Lõi: job có video tham chiếu → khung cuối = độ dài video × 24 (tối đa 10s = 240 khung), bỏ qua số giây đã chọn.
 * Prompt không có video tham chiếu: y như cũ.
 */
const fs = require('fs');
const path = require('path');
const VS = path.join(__dirname, '..', 'app', 'out', 'renderer', 'assets', 'VideoStudio-frcr8V6s.js');
const IX = path.join(__dirname, '..', 'app', 'out', 'main', 'index.js');
let vs = fs.readFileSync(VS, 'utf8'), ix = fs.readFileSync(IX, 'utf8');
if (vs.includes('__hasVidRef')) { console.error('Đã vá trước đó — dừng.'); process.exit(1); }

const CHIP = (w) => `e.jsx("div",{title:"Có video tham chiếu: thời lượng tự lấy theo độ dài video tham chiếu (tối đa 10 giây)",className:"${w} h-8 flex items-center justify-center rounded-lg border border-violet-400/40 bg-violet-500/10 px-1 text-[11px] font-semibold text-violet-200 whitespace-nowrap",children:"🎬 Auto (theo video)"})`;
const ED_OLD = 'e.jsx(Qe,{value:o.duration,options:o.provider==="Veo3"?Y.map(g=>g.id):Fs(o.model),onChange:g=>S(o.id,{duration:g}),icon:e.jsx(mo,{size:12,className:"text-[#a78bfa] mr-1"}),className:"w-full h-8 justify-between"})';
const ROW_OLD = 'e.jsx(Qe,{value:p.duration,options:p.provider==="Muse AI"?["5s","10s","15s"]:p.provider==="Muse AI"?["5s","10s","15s"]:p.provider==="Veo3"&&fo(A,p.model)?Os(A,p.model,p.mode==="Frames"?"Frames":"T2V").map(N=>N.id):Fs(p.model),onChange:N=>Q(p.id,{duration:N}),className:"w-[84px] justify-center"})';
const IX_OLD = 'const want=parseInt(String(e?.payload?.duration||"8"),10)||8;const maxFrames=up.durationSec>0?Math.floor(up.durationSec*24):want*24;const endFrame=Math.max(24,Math.min(want*24,maxFrames));';
const IX_NEW = 'const want=parseInt(String(e?.payload?.duration||"8"),10)||8;const endFrame=up.durationSec>0?Math.max(24,Math.min(240,Math.floor(up.durationSec*24))):Math.max(24,want*24);';

for (const [n, s, a] of [['Studio Video: ô giây khung sửa prompt', vs, ED_OLD], ['Studio Video: ô giây bảng prompt', vs, ROW_OLD], ['lõi: giây theo video tham chiếu', ix, IX_OLD]]) {
  const c = s.split(a).length - 1;
  if (c !== 1) { console.error(`KHÔNG KHỚP (${c}) — ${n}. Không ghi.`); process.exit(1); }
}
vs = vs.replace(ED_OLD, () => `(__hasVidRef(o)?${CHIP('w-full')}:${ED_OLD})`);
vs = vs.replace(ROW_OLD, () => `(__hasVidRef(p)?${CHIP('w-[118px]')}:${ROW_OLD})`);
vs += '\nfunction __hasVidRef(p){try{if(!p||p.provider!=="Veo3")return!1;const as=qe.getState().assets||[];return(p.referenceAssetIds||[]).some(id=>as.find(a=>a.id===id)?.type==="video")}catch(_){return!1}}\n';
ix = ix.replace(IX_OLD, () => IX_NEW);
fs.writeFileSync(VS, vs, 'utf8'); fs.writeFileSync(IX, ix, 'utf8');
console.log('  ✓ Studio Video: ô giây → "Auto (theo video)" khi có video tham chiếu (2 chỗ)\n  ✓ lõi: thời lượng = độ dài video tham chiếu (tối đa 10s)');
