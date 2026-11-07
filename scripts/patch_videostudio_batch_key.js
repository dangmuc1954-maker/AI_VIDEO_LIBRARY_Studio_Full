const fs = require('fs');

console.log('--- Patching VideoStudio-frcr8V6s.js ---');
let code = fs.readFileSync('app/out/renderer/assets/VideoStudio-frcr8V6s.js', 'utf-8');

// Patch 1: Loop isPromptKey check
const oldLoopKey = 'const isPromptKey = myUserRefs.length > 0;';
const newLoopKey = 'const isPromptKey = myUserRefs.length > 0 || latestCurP.sceneMode === "new";';

if (!code.includes(oldLoopKey)) {
  console.error('Could not find oldLoopKey');
  process.exit(1);
}
code = code.replace(oldLoopKey, newLoopKey);
console.log('✓ Patched isPromptKey in loop');

// Patch 2: Next scene isPromptKey check
const oldNextKey = 'const nextIsKey = nextUserRefs.length > 0;';
const newNextKey = 'const nextIsKey = nextUserRefs.length > 0 || latestNext.sceneMode === "new";';

if (code.includes(oldNextKey)) {
  code = code.replace(oldNextKey, newNextKey);
  console.log('✓ Patched nextIsKey in loop');
}

// Patch 3: Table row badge in mn
const oldBadge = '((getUserOriginalRefs(p).length>0)?e.jsxs("div",{className:"inline-flex items-center gap-1.5",children:[e.jsxs("span",{className:"inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-extrabold bg-amber-500/25 text-amber-300 border border-amber-500/50 shadow-[0_0_12px_rgba(245,158,11,0.35)]",children:[e.jsx("span",{children:"🔑"}),"PROMPT KEY"]}),e.jsxs("button",{type:"button",onClick:Z=>{Z.stopPropagation();const cur=p.sceneMode||"continue";Q(p.id,{sceneMode:cur==="new"?"continue":"new"})},className:p.sceneMode==="new"?"inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-purple-500/30 text-purple-200 border border-purple-400 hover:bg-purple-500/45 cursor-pointer shadow-sm transition-all":"inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/30 text-emerald-200 border border-emerald-400 hover:bg-emerald-500/45 cursor-pointer shadow-sm transition-all",title:p.sceneMode==="new"?"Đang chọn: SANG CẢNH MỚI (Click để đổi sang NỐI TIẾP CẢNH)":"Đang chọn: NỐI TIẾP CẢNH (Click để đổi sang SANG CẢNH MỚI)",children:[e.jsx("span",{children:p.sceneMode==="new"?"🎬":"🔗"}),p.sceneMode==="new"?"Sang cảnh mới":"Nối tiếp cảnh"]})]}):e.jsxs("span",{className:"inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold bg-cyan-950/40 text-cyan-300 border border-cyan-500/30",children:[e.jsx("span",{children:"👶"}),"Prompt con (🔗 Tự động lấy frame cuối)"]}))';

const newBadge = '((getUserOriginalRefs(p).length>0||p.sceneMode==="new")?e.jsxs("div",{className:"inline-flex items-center gap-1.5",children:[e.jsxs("span",{className:"inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-extrabold bg-amber-500/25 text-amber-300 border border-amber-500/50 shadow-[0_0_12px_rgba(245,158,11,0.35)]",children:[e.jsx("span",{children:"🔑"}),"PROMPT KEY"]}),e.jsxs("button",{type:"button",onClick:Z=>{Z.stopPropagation();const cur=p.sceneMode||"continue";Q(p.id,{sceneMode:cur==="new"?"continue":"new"})},className:p.sceneMode==="new"?"inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-purple-500/30 text-purple-200 border border-purple-400 hover:bg-purple-500/45 cursor-pointer shadow-sm transition-all":"inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/30 text-emerald-200 border border-emerald-400 hover:bg-emerald-500/45 cursor-pointer shadow-sm transition-all",title:p.sceneMode==="new"?"Đang chọn: SANG CẢNH MỚI (Click để đổi sang NỐI TIẾP CẢNH)":"Đang chọn: NỐI TIẾP CẢNH (Click để đổi sang SANG CẢNH MỚI)",children:[e.jsx("span",{children:p.sceneMode==="new"?"🎬":"🔗"}),p.sceneMode==="new"?"Sang cảnh mới":"Nối tiếp cảnh"]})]}):e.jsxs("div",{className:"inline-flex items-center gap-1.5",children:[e.jsxs("span",{className:"inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold bg-cyan-950/40 text-cyan-300 border border-cyan-500/30",children:[e.jsx("span",{children:"👶"}),"Prompt con (🔗 Tự động lấy frame cuối)"]}),e.jsxs("button",{type:"button",onClick:Z=>{Z.stopPropagation();Q(p.id,{sceneMode:"new"})},className:"inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold bg-purple-500/20 text-purple-200 border border-purple-400/50 hover:bg-purple-500/40 cursor-pointer shadow-sm transition-all",title:"Click để tách cảnh này thành PROMPT KEY (Cảnh mới độc lập)",children:[e.jsx("span",{children:"🎬"}),"Tách cảnh mới"]})]}))';

if (!code.includes(oldBadge)) {
  console.error('Could not find oldBadge in VideoStudio');
  process.exit(1);
}
code = code.replace(oldBadge, newBadge);
console.log('✓ Patched table row badge in VideoStudio');

fs.writeFileSync('app/out/renderer/assets/VideoStudio-frcr8V6s.js', code, 'utf-8');
console.log('✓ Successfully patched VideoStudio-frcr8V6s.js');

