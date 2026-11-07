const fs = require('fs');

console.log('--- Rolling back badge in VideoStudio-frcr8V6s.js to exact original ---');
let code = fs.readFileSync('app/out/renderer/assets/VideoStudio-frcr8V6s.js', 'utf-8');

// The exact original badge snippet from commit c012aa4:
const originalBadge = 'storyChaining&&e.jsx("div",{className:"mb-1 flex items-center gap-2 select-none",children:p.index===1?e.jsxs("span",{className:"inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-extrabold bg-amber-500/25 text-amber-300 border border-amber-500/40 shadow-[0_0_10px_rgba(245,158,11,0.25)]",children:[e.jsx("span",{children:"🔑"}),"PROMPT KEY 1 (MỞ ĐẦU)"]}):((p.referenceAssetIds&&p.referenceAssetIds.length>0)?e.jsxs("div",{className:"inline-flex items-center gap-1.5",children:[e.jsxs("span",{className:"inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-extrabold bg-amber-500/25 text-amber-300 border border-amber-500/50 shadow-[0_0_12px_rgba(245,158,11,0.35)]",children:[e.jsx("span",{children:"🔑"}),"PROMPT KEY"]}),e.jsxs("button",{type:"button",onClick:Z=>{Z.stopPropagation();const cur=p.sceneMode||"continue";Q(p.id,{sceneMode:cur==="new"?"continue":"new"})},className:p.sceneMode==="new"?"inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-purple-500/30 text-purple-200 border border-purple-400 hover:bg-purple-500/45 cursor-pointer shadow-sm transition-all":"inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/30 text-emerald-200 border border-emerald-400 hover:bg-emerald-500/45 cursor-pointer shadow-sm transition-all",title:p.sceneMode==="new"?"Đang chọn: SANG CẢNH MỚI (Click để đổi sang NỐI TIẾP CẢNH)":"Đang chọn: NỐI TIẾP CẢNH (Click để đổi sang SANG CẢNH MỚI)",children:[e.jsx("span",{children:p.sceneMode==="new"?"🎬":"🔗"}),p.sceneMode==="new"?"Sang cảnh mới":"Nối tiếp cảnh"]})]}):e.jsxs("span",{className:"inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold bg-cyan-950/40 text-cyan-300 border border-cyan-500/30",children:[e.jsx("span",{children:"👶"}),"Prompt con (🔗 Tự động lấy frame cuối)"]}))})';

const startIdx = code.indexOf('storyChaining&&e.jsx("div",{className:"mb-1 flex items-center gap-2 select-none"');
if (startIdx === -1) {
  console.error('startIdx not found');
  process.exit(1);
}

// Find the end of this badge block (which is followed by: ,e.jsx("div",{className:"truncate text-[11px] font-semibold leading-4 text-text-primary")
const endMarker = ',e.jsx("div",{className:"truncate text-[11px] font-semibold leading-4 text-text-primary"';
const endIdx = code.indexOf(endMarker, startIdx);
if (endIdx === -1) {
  console.error('endMarker not found');
  process.exit(1);
}

console.log('Found badge block from', startIdx, 'to', endIdx);
console.log('Current block:\n', code.substring(startIdx, endIdx));

code = code.substring(0, startIdx) + originalBadge + code.substring(endIdx);

fs.writeFileSync('app/out/renderer/assets/VideoStudio-frcr8V6s.js', code, 'utf-8');
console.log('✓ Successfully rolled back table row badge to exact original!');

