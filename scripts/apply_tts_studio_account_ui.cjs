const fs = require('fs');
const path = require('path');

const ttsPath = path.resolve(__dirname, '../app/out/renderer/assets/TTSStudio-DfUKIn_N.js');
let content = fs.readFileSync(ttsPath, 'utf8');

// 1. Import bH (useBrowserStore) from ./index-BS7vgKVV.js
const oldImport = 'import{bL as Z,bn as m,b4 as e,p as De,l as Se,L as wt,bK as ve,bI as Nt,bD as Pt,bf as j,d as ze,T as Ct}from"./index-BS7vgKVV.js";';
const newImport = 'import{bL as Z,bn as m,b4 as e,p as De,l as Se,L as wt,bK as ve,bI as Nt,bD as Pt,bf as j,d as ze,T as Ct,bH as useBrowserStore}from"./index-BS7vgKVV.js";';

if (!content.includes('useBrowserStore')) {
  if (content.includes(oldImport)) {
    content = content.replace(oldImport, newImport);
    console.log('✓ Added useBrowserStore import');
  }
}

// 2. Add table header for Account
const oldThead = 'e.jsx("th",{className:"w-[180px] px-2 py-2 text-left font-medium whitespace-nowrap",children:l("ttsStudio.thVoice")}),';
const newThead = 'e.jsx("th",{className:"w-[180px] px-2 py-2 text-left font-medium whitespace-nowrap",children:l("ttsStudio.thVoice")}),e.jsx("th",{className:"w-[145px] px-2 py-2 text-left font-medium whitespace-nowrap",children:"Tài khoản"}),';

if (!content.includes('children:"Tài khoản"')) {
  if (content.includes(oldThead)) {
    content = content.replace(oldThead, newThead);
    console.log('✓ Added "Tài khoản" th header');
  }
}

// 3. Add Account td in Table Row
const oldRowVoice = 'className:"w-full justify-between"})}),e.jsx("td",{className:"px-2 py-1",children:e.jsxs("span",{className:`inline-flex items-center gap-1.5 rounded-md border px-2 py-0.5 text-[11px] font-semibold whitespace-nowrap ${P.bg}';
const newRowVoice = 'className:"w-full justify-between"})}),e.jsx("td",{className:"px-2 py-1",onClick:S=>S.stopPropagation(),children:e.jsx(Be,{value:a.account||"Auto",options:accountOptions||[{value:"Auto",label:"Tự động phân bổ"}],onChange:S=>G(a.id,{account:S}),className:"w-full justify-between"})}),e.jsx("td",{className:"px-2 py-1",children:e.jsxs("span",{className:`inline-flex items-center gap-1.5 rounded-md border px-2 py-0.5 text-[11px] font-semibold whitespace-nowrap ${P.bg}';

if (!content.includes('a.account||"Auto"')) {
  if (content.includes(oldRowVoice)) {
    content = content.replace(oldRowVoice, newRowVoice);
    console.log('✓ Added Account td dropdown in table row');
  }
}

// 4. Pass accountOptions to ms function component
const oldMsSig = 'function ms({allRowsSelected:s,focusPromptId:r,';
const newMsSig = 'function ms({accountOptions:accountOptions,allRowsSelected:s,focusPromptId:r,';

if (!content.includes('accountOptions:accountOptions,allRowsSelected:s')) {
  if (content.includes(oldMsSig)) {
    content = content.replace(oldMsSig, newMsSig);
    console.log('✓ Updated ms signature with accountOptions');
  }
}

// 5. In Drawer hs: add Account selector
const oldDrawerVoice = 'e.jsx("div",{className:"mb-2 text-xs font-semibold text-text-primary",children:i("ttsStudio.voiceSettingsHeading")})';
const newDrawerVoice = 'e.jsxs("div",{className:"mb-3 space-y-1.5",children:[e.jsx("label",{className:"text-xs font-semibold text-slate-300",children:"Tài khoản (Account)"}),e.jsx(Be,{value:r.account||"Auto",options:accountOptions||[{value:"Auto",label:"Tự động phân bổ"}],onChange:o=>c(r.id,{account:o}),className:"w-full justify-between"})]}),e.jsx("div",{className:"mb-2 text-xs font-semibold text-text-primary",children:i("ttsStudio.voiceSettingsHeading")})';

if (!content.includes('r.account||"Auto"')) {
  if (content.includes(oldDrawerVoice)) {
    content = content.replace(oldDrawerVoice, newDrawerVoice);
    console.log('✓ Added Account selector in Drawer hs');
  }
}

// 6. Update hs signature with accountOptions
const oldHsSig = 'function hs({focusPromptId:s,prompt:r,';
const newHsSig = 'function hs({accountOptions:accountOptions,focusPromptId:s,prompt:r,';

if (!content.includes('accountOptions:accountOptions,focusPromptId:s')) {
  if (content.includes(oldHsSig)) {
    content = content.replace(oldHsSig, newHsSig);
    console.log('✓ Updated hs signature with accountOptions');
  }
}

// 7. In main Xs component: retrieve sessions, compute accountOptions, pass to ms and hs, and add Key button
const oldXsInit = 'const[ot,It]=m.useState({status:"idle"});';
const newXsInit = `const[ot,It]=m.useState({status:"idle"});const allSessions=useBrowserStore(s=>s.sessions)||[];const elevenSessions=m.useMemo(()=>(allSessions||[]).filter(s=>(s.providerId==="elevenlabs"||s.providerId==="elevenlabs-tts"||(s.provider&&s.provider.toLowerCase().includes("elevenlabs")))&&!s.disabled),[allSessions]);const accountOptions=m.useMemo(()=>[{value:"Auto",label:"Tự động phân bổ"},...elevenSessions.map(s=>({value:s.accountDisplayName||s.accountName||s.accountId,label:s.accountDisplayName||s.accountName||s.accountId}))],[elevenSessions]);`;

if (!content.includes('const elevenSessions=')) {
  if (content.includes(oldXsInit)) {
    content = content.replace(oldXsInit, newXsInit);
    console.log('✓ Added elevenSessions and accountOptions state in Xs');
  }
}

// Pass accountOptions to ms in Xs
const oldCallMs = 'e.jsx(ms,{allRowsSelected:lt,promptCount:r.length,';
const newCallMs = 'e.jsx(ms,{accountOptions:accountOptions,allRowsSelected:lt,promptCount:r.length,';

if (content.includes(oldCallMs)) {
  content = content.replace(oldCallMs, newCallMs);
  console.log('✓ Passed accountOptions to e.jsx(ms)');
}

// Pass accountOptions to hs in Xs
const oldCallHs = 'e.jsx(hs,{focusPromptId:tt,prompt:re,';
const newCallHs = 'e.jsx(hs,{accountOptions:accountOptions,focusPromptId:tt,prompt:re,';

if (content.includes(oldCallHs)) {
  content = content.replace(oldCallHs, newCallHs);
  console.log('✓ Passed accountOptions to e.jsx(hs)');
}

// Add [🔑 Key ElevenLabs] button to header actions
const oldHeaderBtn = 'children:[e.jsx(ne,{size:13})," ",s("ttsStudio.deleteSelectedBtn")]}),';
const newHeaderBtn = `children:[e.jsx(ne,{size:13})," ",s("ttsStudio.deleteSelectedBtn")]}),e.jsxs("button",{type:"button",onClick:async()=>{const cur=await window.aiforge?.browser?.getElevenLabsKey?.()||"";const k=window.prompt("Nhập ElevenLabs API Key (xi-api-key) của tài khoản để nạp lệnh siêu tốc và trừ credit chính chủ 100%:",cur);if(k!==null){await window.aiforge?.browser?.setElevenLabsKey?.(k.trim());j.success("Đã lưu API Key ElevenLabs thành công!")}},className:"inline-flex h-8 cursor-pointer items-center gap-1.5 rounded-lg border border-purple-400/50 bg-purple-600/30 px-3 text-xs font-semibold text-purple-200 transition-colors hover:bg-purple-600/50 hover:text-white",children:[e.jsx(Ct,{size:13})," Key ElevenLabs"]}),`;

if (!content.includes('" Key ElevenLabs"')) {
  if (content.includes(oldHeaderBtn)) {
    content = content.replace(oldHeaderBtn, newHeaderBtn);
    console.log('✓ Added [🔑 Key ElevenLabs] button in header actions');
  }
}

// 8. Update runPrompts enqueue to pass account, accountId, accountSelection
const oldEnqueue = 'voiceSettings:g.voiceSettings,accountSelection:"auto"}';
const newEnqueue = 'voiceSettings:g.voiceSettings,account:g.account||"Auto",accountId:(elevenSessions.find(s=>s.accountDisplayName===g.account||s.accountName===g.account||s.accountId===g.account)?.accountId),accountSelection:(g.account&&g.account!=="Auto")?"manual":"auto"}';

if (content.includes(oldEnqueue)) {
  content = content.replace(oldEnqueue, newEnqueue);
  console.log('✓ Updated enqueue payload with account and accountId');
}

fs.writeFileSync(ttsPath, content, 'utf8');
console.log('✓ Successfully saved TTSStudio-DfUKIn_N.js');
