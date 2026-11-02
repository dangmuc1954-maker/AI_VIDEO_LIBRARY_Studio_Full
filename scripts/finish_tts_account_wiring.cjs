const fs = require('fs');
const path = require('path');

const ttsPath = path.resolve(__dirname, '../app/out/renderer/assets/TTSStudio-DfUKIn_N.js');
let content = fs.readFileSync(ttsPath, 'utf8');

// 1. Add state in function Xs()
const oldXsStart = 'function Xs(){const{t:s}=Z(),{promptRows:r,';
const newXsStart = 'function Xs(){const{t:s}=Z();const allSessions=useBrowserStore(st=>st.sessions)||[];const elevenSessions=m.useMemo(()=>(allSessions||[]).filter(st=>(st.providerId==="elevenlabs"||st.providerId==="elevenlabs-tts"||(st.provider&&st.provider.toLowerCase().includes("elevenlabs")))&&!st.disabled),[allSessions]);const accountOptions=m.useMemo(()=>[{value:"Auto",label:"Tự động phân bổ"},...elevenSessions.map(st=>({value:st.accountDisplayName||st.accountName||st.accountId,label:st.accountDisplayName||st.accountName||st.accountId}))],[elevenSessions]);const{promptRows:r,';

if (!content.includes('const elevenSessions=')) {
  if (!content.includes(oldXsStart)) {
    console.error('Target oldXsStart not found!');
    process.exit(1);
  }
  content = content.replace(oldXsStart, newXsStart);
  console.log('✓ Added elevenSessions and accountOptions at start of Xs');
}

// 2. Pass accountOptions to ms in Xs
const oldCallMs = 'e.jsx(ms,{allRowsSelected:lt,promptCount:r.length,';
const newCallMs = 'e.jsx(ms,{accountOptions:accountOptions,allRowsSelected:lt,promptCount:r.length,';

if (content.includes(oldCallMs)) {
  content = content.replace(oldCallMs, newCallMs);
  console.log('✓ Passed accountOptions to e.jsx(ms)');
}

// 3. Pass accountOptions to hs in Xs
const oldCallHs = 'e.jsx(hs,{focusPromptId:tt,prompt:re,';
const newCallHs = 'e.jsx(hs,{accountOptions:accountOptions,focusPromptId:tt,prompt:re,';

if (content.includes(oldCallHs)) {
  content = content.replace(oldCallHs, newCallHs);
  console.log('✓ Passed accountOptions to e.jsx(hs)');
}

// 4. Update job enqueue in Xs
const oldSubmitJob = 'type:"TTS",providerId:"elevenlabs",provider:"ElevenLabs",payload:{';
const newSubmitJob = 'type:"TTS",providerId:"elevenlabs",provider:"ElevenLabs",account:g.account||"Auto",accountId:(elevenSessions.find(st=>st.accountDisplayName===g.account||st.accountName===g.account||st.accountId===g.account)?.accountId),payload:{account:g.account||"Auto",accountId:(elevenSessions.find(st=>st.accountDisplayName===g.account||st.accountName===g.account||st.accountId===g.account)?.accountId),accountSelection:(g.account&&g.account!=="Auto")?"manual":"auto",';

if (content.includes(oldSubmitJob)) {
  content = content.replace(oldSubmitJob, newSubmitJob);
  console.log('✓ Wired account and accountId into job enqueue payload');
}

fs.writeFileSync(ttsPath, content, 'utf8');
console.log('✓ Successfully saved TTSStudio-DfUKIn_N.js');
