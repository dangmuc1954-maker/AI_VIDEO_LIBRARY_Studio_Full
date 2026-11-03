const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

console.log('======================================================================');
console.log('🎬 MASTER INSTALLER: CHUỖI KỊCH BẢN THÔNG MINH (STORY CHAINING) 🎬');
console.log('======================================================================');

const targetRoots = [
  path.join(__dirname, '../app'),
  path.join(__dirname, '../extracted_original'),
  path.join(__dirname, '../dist/AI_VIDEO_LIBRARY_Customer_Edition/resources/app'),
  path.join(__dirname, '../dist/AI_VIDEO_LIBRARY_Khach_Hang_v3.0/resources/app'),
  path.join(process.env.LOCALAPPDATA || 'C:/Users/admin/AppData/Local', 'Programs/AI VIDEO LIBRARY/resources/app')
];

// 1. ÁP DỤNG PRELOAD & MAIN PROCESS CHO TẤT CẢ TARGETS
for (const root of targetRoots) {
  const pPath = path.join(root, 'out/preload/index.cjs');
  if (fs.existsSync(pPath)) {
    let pCode = fs.readFileSync(pPath, 'utf8');
    if (!pCode.includes('extractLastFrame:')) {
      const target = 'syncVoiceoverVideo:(e,n,s)=>r.ipcRenderer.invoke("assets:syncVoiceoverVideo",e,n,s),';
      const addition = 'extractLastFrame:e=>r.ipcRenderer.invoke("assets:extractLastFrame",e),';
      if (pCode.includes(target)) {
        pCode = pCode.replace(target, target + addition);
        fs.writeFileSync(pPath, pCode, 'utf8');
        console.log('  ✓ Đã cập nhật Preload tại:', pPath);
      }
    }
  }

  const mPath = path.join(root, 'out/main/index.js');
  const mBakPath = path.join(root, 'out/main/index.js.bak_before_story_chain');
  
  const mainTarget = 'E.handle("assets:syncVoiceoverVideo", async (A, videoAssetId, audioAssetId, options) => {';
  const mainHandler = `E.handle("assets:extractLastFrame", async (A, videoIdOrPath) => {
  C(A);
  try {
    let localVideoPath = "";
    let lookupId = typeof videoIdOrPath === "string" ? videoIdOrPath : (videoIdOrPath?.assetId || videoIdOrPath?.id || "");
    let jobId = typeof videoIdOrPath === "object" ? (videoIdOrPath?.jobId || "") : "";
    let promptId = typeof videoIdOrPath === "object" ? (videoIdOrPath?.promptId || "") : "";
    let promptOrder = typeof videoIdOrPath === "object" ? (videoIdOrPath?.promptOrder || "") : "";

    // 1. Tìm bằng Asset ID
    if (lookupId) {
      const cleanId = lookupId.replace(/^.*\\/asset\\//, "").replace(/\\?.*$/, "").trim();
      const asset = V.getAsset ? (V.getAsset(cleanId) || V.getAsset(lookupId)) : null;
      if (asset && asset.localPath && require('fs').existsSync(asset.localPath)) {
        localVideoPath = asset.localPath;
      } else if (require('fs').existsSync(lookupId)) {
        localVideoPath = lookupId;
      }
    }

    // 2. Tìm bằng Job ID (Khớp 100% video vừa sinh ra từ job này)
    if (!localVideoPath && (jobId || lookupId)) {
      const targetJobId = jobId || lookupId;
      if (V.state && Array.isArray(V.state.assets)) {
        const jAsset = V.state.assets.find(a => (a.jobId === targetJobId || a.id === targetJobId) && a.localPath && require('fs').existsSync(a.localPath));
        if (jAsset) localVideoPath = jAsset.localPath;
      }
    }

    // 3. Tìm bằng Prompt ID (Video mới nhất của phân cảnh này)
    if (!localVideoPath && promptId) {
      if (V.state && Array.isArray(V.state.assets)) {
        const pAssets = V.state.assets
          .filter(a => a.promptId === promptId && a.localPath && require('fs').existsSync(a.localPath))
          .sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
        if (pAssets.length > 0) localVideoPath = pAssets[0].localPath;
      }
    }

    // 4. Tìm bằng Phân cảnh thứ tự (promptOrder)
    if (!localVideoPath && promptOrder) {
      if (V.state && Array.isArray(V.state.assets)) {
        const oAssets = V.state.assets
          .filter(a => (a.name === "Canh_" + promptOrder + ".png" || a.name === "Canh_" + promptOrder + ".mp4" || a.sceneName === "Cảnh " + promptOrder) && a.localPath && require('fs').existsSync(a.localPath))
          .sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
        if (oAssets.length > 0) localVideoPath = oAssets[0].localPath;
      }
    }

    // 5. Fallback cuối cùng: Sắp xếp theo ngày tạo MỚI NHẤT (createdAt DESCENDING)
    if (!localVideoPath) {
      if (V.state && Array.isArray(V.state.assets)) {
        const vAssets = V.state.assets
          .filter(a => (a.type === "video" || (a.mimeType && a.mimeType.startsWith("video/"))) && a.localPath && require('fs').existsSync(a.localPath))
          .sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
        if (vAssets.length > 0) localVideoPath = vAssets[0].localPath;
      }
    }

    if (!localVideoPath) {
      throw new Error("Không tìm thấy file video để trích xuất frame cuối");
    }

    const fs = require('fs');
    const path = require('path');
    const cp = require('child_process');
    const os = require('os');

    let ffmpegBin = "ffmpeg";
    try {
      const { MediaWatermarkCleaner } = require('../../modules/media_watermark_cleaner.cjs');
      const cleaner = new MediaWatermarkCleaner();
      ffmpegBin = cleaner.ffmpegPath || "ffmpeg";
    } catch (_) {}

    const tmpOut = path.join(os.tmpdir(), "last_frame_" + Date.now() + "_" + Math.random().toString(36).slice(2, 6) + ".png");
    cp.execFileSync(ffmpegBin, ['-sseof', '-0.1', '-i', localVideoPath, '-frames:v', '1', '-update', '1', '-y', tmpOut], { stdio: 'pipe' });

    if (!fs.existsSync(tmpOut) || fs.statSync(tmpOut).size === 0) {
      throw new Error("Lỗi khi xuất frame cuối của video");
    }

    const buf = fs.readFileSync(tmpOut);
    try { fs.unlinkSync(tmpOut); } catch (_) {}

    const dataUrl = "data:image/png;base64," + buf.toString("base64");
    const assetName = "LastFrame_" + path.basename(localVideoPath, path.extname(localVideoPath)) + ".png";
    const importedAsset = await V.importReference({
      name: assetName,
      mimeType: "image/png",
      dataUrl: dataUrl
    });
    return importedAsset;
  } catch (err) {
    console.error("[extractLastFrame] Error:", err);
    throw err;
  }
}),
`;

function injectMusePrefix(code) {
  if (code.includes('Tạo video ${normRatio}:')) return code;
  const startIdx = code.indexOf('// BƯỚC 3: NHẬP PROMPT VÀ GỬI');
  if (startIdx === -1) return code;
  const sendResIdx = code.indexOf('const sendRes = await wc.executeJavaScript', startIdx);
  if (sendResIdx === -1) return code;

  const targetSlice = code.substring(startIdx, sendResIdx);
  const rawPromptMarker = 'let promptToSend = rawPrompt.trim();';
  const rawPromptIdx = targetSlice.indexOf(rawPromptMarker);
  if (rawPromptIdx === -1) return code;

  const newPromptLogic = `      if (isImageJob) {
        const rawRatio = (job.payload?.ratio || job.payload?.aspectRatio || job.payload?.aspect || "9:16").toString().trim();
        const normRatio = (rawRatio === "16:9" || rawRatio === "16/9") ? "16:9" : (rawRatio === "1:1" ? "1:1" : (rawRatio === "4:3" ? "4:3" : (rawRatio === "3:4" ? "3:4" : "9:16")));
        const lower = promptToSend.toLowerCase();

        if (!lower.startsWith("tạo ảnh") && !lower.startsWith("tao anh") && !lower.startsWith("tạo hình ảnh") && !lower.startsWith("create image") && !lower.startsWith("generate image")) {
          promptToSend = \`Tạo ảnh \${normRatio}: \${promptToSend}\`;
        } else if (!lower.includes("9:16") && !lower.includes("16:9") && !lower.includes("1:1") && !lower.includes("4:3") && !lower.includes("3:4")) {
          promptToSend = promptToSend.replace(/^(tạo ảnh|tao anh|tạo hình ảnh|create image|generate image)\\s*[:\\-\\s]*/i, \`Tạo ảnh \${normRatio}: \`);
        }
      } else {
        const rawRatio = (job.payload?.ratio || job.payload?.aspectRatio || job.payload?.aspect || "16:9").toString().trim();
        const normRatio = (rawRatio === "9:16" || rawRatio === "9/16") ? "9:16" : (rawRatio === "1:1" ? "1:1" : (rawRatio === "4:3" ? "4:3" : (rawRatio === "3:4" ? "3:4" : "16:9")));
        const lower = promptToSend.toLowerCase();
        const hasRatio = lower.includes("16:9") || lower.includes("9:16") || lower.includes("1:1") || lower.includes("4:3") || lower.includes("3:4");

        if (!hasRatio) {
          if (lower.startsWith("create video") || lower.startsWith("generate video")) {
            promptToSend = promptToSend.replace(/^(create video|generate video)\\s*[:\\-\\s]*/i, \`Create video \${normRatio}: \`);
          } else if (lower.startsWith("tạo video") || lower.startsWith("tao video") || lower.startsWith("tạo clip") || lower.startsWith("tao clip")) {
            promptToSend = promptToSend.replace(/^(tạo video|tao video|tạo clip|tao clip)\\s*[:\\-\\s]*/i, \`Tạo video \${normRatio}: \`);
          } else {
            promptToSend = \`Tạo video \${normRatio}: \${promptToSend}\`;
          }
        }
      }
      const prompt = promptToSend;
      tracker.updateProgress(30, isImageJob ? \`Đang gửi lệnh tạo ảnh \${job.payload?.ratio || "9:16"} lên Muse AI...\` : \`Đang gửi lệnh tạo video \${job.payload?.ratio || "16:9"} lên Muse AI...\`);`;

  const newTargetSlice = targetSlice.substring(0, rawPromptIdx + rawPromptMarker.length) + '\n\n' + newPromptLogic + '\n      logDebug("Dispatching prompt to Muse AI", { isImageJob, prompt });\n\n      ';
  return code.substring(0, startIdx) + newTargetSlice + code.substring(sendResIdx);
}

  if (fs.existsSync(mBakPath)) {
    let baseCode = fs.readFileSync(mBakPath, 'utf8');
    if (baseCode.includes(mainTarget)) {
      baseCode = baseCode.replace(mainTarget, mainHandler + mainTarget);
    }
    baseCode = injectMusePrefix(baseCode);
    fs.writeFileSync(mPath, baseCode, 'utf8');
    console.log('  ✓ Đã cập nhật Main Process từ bản backup chuẩn (kèm tiền tố video) tại:', mPath);
  } else if (fs.existsSync(mPath)) {
    let mCode = fs.readFileSync(mPath, 'utf8');
    if (!mCode.includes('assets:extractLastFrame') && mCode.includes(mainTarget)) {
      mCode = mCode.replace(mainTarget, mainHandler + mainTarget);
    }
    mCode = injectMusePrefix(mCode);
    fs.writeFileSync(mPath, mCode, 'utf8');
    console.log('  ✓ Đã cập nhật Main Process (kèm tiền tố video) tại:', mPath);
  }
}

// 2. BIÊN DỊCH VIDEOSTUDIO BẰNG BỘ CHUYỂN ĐỔI CHUẨN XÁC 100%
console.log('[*] Đang biên dịch mã nguồn VideoStudio hoàn chỉnh...');
const pristinePath = path.join(__dirname, '../app/out/renderer/assets/VideoStudio-frcr8V6s.js.bak_before_story_chain');
const orig = fs.readFileSync(pristinePath, 'utf8');

// Step 0: Helper function getUserOriginalRefs at module scope
let c0 = orig;
const fnMnAnchor = 'function mn({';
const helperCode = `function getUserOriginalRefs(p){if(!p)return[];const assets=(typeof qe!=="undefined"&&qe.getState?qe.getState().assets:[])||[];if(Array.isArray(p.userReferenceAssetIds)&&p.userReferenceAssetIds.length>0){const validUser=p.userReferenceAssetIds.filter(id=>{const a=assets.find(x=>x.id===id);if(!a||!a.name)return (typeof id==="string"&&!id.toLowerCase().includes("lastframe")&&!id.toLowerCase().includes("last_frame"));const n=a.name.toLowerCase();return !n.startsWith("lastframe_")&&!n.startsWith("last_frame_")});if(validUser.length>0)return validUser}const cur=Array.isArray(p.referenceAssetIds)?p.referenceAssetIds:[];return cur.filter(id=>{const a=assets.find(x=>x.id===id);if(!a||!a.name)return (typeof id==="string"&&!id.toLowerCase().includes("lastframe")&&!id.toLowerCase().includes("last_frame"));const n=a.name.toLowerCase();return !n.startsWith("lastframe_")&&!n.startsWith("last_frame_")})};`;
c0 = c0.replace(fnMnAnchor, helperCode + fnMnAnchor);

// Step 1: State & Toolbar Master Switch
let c1 = c0;
const stateAnchor = 'const[autoDlVid,setAutoDlVid]=l.useState(';
const storyStateSnippet = 'const[storyChaining,setStoryChaining]=l.useState(()=>{try{return window.localStorage.getItem("aiforge_story_chaining_enabled")==="true"}catch{return false;}}),onToggleStoryChaining=()=>{const nv=!storyChaining;setStoryChaining(nv);try{window.localStorage.setItem("aiforge_story_chaining_enabled",String(nv))}catch(_){}};';
c1 = c1.replace(stateAnchor, storyStateSnippet + stateAnchor);

const toolbarAnchor = 'children:P("videoStudio.videoQueueDesc")})]}),e.jsxs("div",{className:"flex min-w-0 flex-1 flex-wrap items-center justify-end gap-2.5 text-xs text-text-muted",children:[';
const masterSwitchButton = 'e.jsxs("button",{type:"button",onClick:onToggleStoryChaining,title:storyChaining?"Chế độ Chuỗi Kịch Bản: ĐANG BẬT":"Chế độ Chuỗi Kịch Bản: ĐANG TẮT",className:storyChaining?"inline-flex h-8 cursor-pointer items-center gap-1.5 rounded-lg border px-3 text-[11px] font-bold transition-all border-amber-400 bg-amber-500/25 text-amber-200 shadow-[0_0_16px_rgba(245,158,11,0.4)]":"inline-flex h-8 cursor-pointer items-center gap-1.5 rounded-lg border px-3 text-[11px] font-bold transition-all border-white/10 bg-white/5 text-slate-400 hover:text-white",children:[e.jsx("span",{className:storyChaining?"h-2.5 w-2.5 rounded-full bg-amber-400 animate-pulse shadow-[0_0_8px_#f59e0b]":"h-2.5 w-2.5 rounded-full bg-slate-500"}),e.jsx("span",{children:"👑"}),storyChaining?"CHUỖI KỊCH BẢN: BẬT":"CHUỖI KỊCH BẢN: TẮT"]}),';
c1 = c1.replace(toolbarAnchor, toolbarAnchor + masterSwitchButton);

// Step 2: Prompt Key Yellow Badge & Prompt Con & 2 Buttons (Dựa trên getUserOriginalRefs)
let c2 = c1;
const cellAnchor = 'e.jsxs("td",{className:"min-w-0 px-2 py-1",children:[';
const badgeSnippet = 'storyChaining&&e.jsx("div",{className:"mb-1 flex items-center gap-2 select-none",children:p.index===1?e.jsxs("span",{className:"inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-extrabold bg-amber-500/25 text-amber-300 border border-amber-500/40 shadow-[0_0_10px_rgba(245,158,11,0.25)]",children:[e.jsx("span",{children:"🔑"}),"PROMPT KEY 1 (MỞ ĐẦU)"]}):((getUserOriginalRefs(p).length>0)?e.jsxs("div",{className:"inline-flex items-center gap-1.5",children:[e.jsxs("span",{className:"inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-extrabold bg-amber-500/25 text-amber-300 border border-amber-500/50 shadow-[0_0_12px_rgba(245,158,11,0.35)]",children:[e.jsx("span",{children:"🔑"}),"PROMPT KEY"]}),e.jsxs("button",{type:"button",onClick:Z=>{Z.stopPropagation();const cur=p.sceneMode||"continue";Q(p.id,{sceneMode:cur==="new"?"continue":"new"})},className:p.sceneMode==="new"?"inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-purple-500/30 text-purple-200 border border-purple-400 hover:bg-purple-500/45 cursor-pointer shadow-sm transition-all":"inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/30 text-emerald-200 border border-emerald-400 hover:bg-emerald-500/45 cursor-pointer shadow-sm transition-all",title:p.sceneMode==="new"?"Đang chọn: SANG CẢNH MỚI (Click để đổi sang NỐI TIẾP CẢNH)":"Đang chọn: NỐI TIẾP CẢNH (Click để đổi sang SANG CẢNH MỚI)",children:[e.jsx("span",{children:p.sceneMode==="new"?"🎬":"🔗"}),p.sceneMode==="new"?"Sang cảnh mới":"Nối tiếp cảnh"]})]}):e.jsxs("span",{className:"inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold bg-cyan-950/40 text-cyan-300 border border-cyan-500/30",children:[e.jsx("span",{children:"👶"}),"Prompt con (🔗 Tự động lấy frame cuối)"]}))}),';
c2 = c2.replace(cellAnchor, cellAnchor + badgeSnippet);

// Step 3: Unlimited Multi-Ref Upload (Using block comments) & Preserve userReferenceAssetIds
let c3 = c2;
c3 = c3.replace('if(d.length>=i){z.warning(t("videoStudio.maxVideoRefsWarning",{max:i}));return}', '/* unlimited multi-ref upload allowed */');
c3 = c3.replace('if(d.length>=i)break;', '/* unlimited upload */');
const exactMaxSelection = 'maxSelection:o.find(r=>r.id===we)?.provider==="Grok"?pt(o.find(r=>r.id===we)?.duration):(o.find(r=>r.id===we)?.provider==="Muse AI"||(o.find(r=>r.id===we)?.provider&&o.find(r=>r.id===we).provider.toLowerCase().includes("muse")))?6:o.find(r=>r.id===we)?ao(s,o.find(r=>r.id===we)):0,';
c3 = c3.replace(exactMaxSelection, 'maxSelection:99,');

// Preserve userReferenceAssetIds on confirm, upload, remove
c3 = c3.replace(
  'onConfirm:async r=>{we&&(await Promise.all(r.map(C=>Ft(C))),Y(we,{referenceAssetIds:r}))}',
  'onConfirm:async r=>{we&&(await Promise.all(r.map(C=>Ft(C))),Y(we,{referenceAssetIds:r,userReferenceAssetIds:r}))}'
);
c3 = c3.replace(
  'Y(r,{referenceAssetIds:d})',
  'Y(r,{referenceAssetIds:d,userReferenceAssetIds:d})'
);
c3 = c3.replace(
  'S(o.id,{referenceAssetIds:o.referenceAssetIds?.filter(Z=>Z!==g.id)})',
  'S(o.id,{referenceAssetIds:o.referenceAssetIds?.filter(Z=>Z!==g.id),userReferenceAssetIds:(o.userReferenceAssetIds||o.referenceAssetIds||[]).filter(Z=>Z!==g.id)})'
);

// Fix Muse AI slice(0, 1) to allow up to 6 images
c3 = c3.replace(
  'referenceAssetIds:g==="Grok"||g==="Muse AI"?(o?.referenceAssetIds||[]).slice(0,1):o?.referenceAssetIds',
  'referenceAssetIds:g==="Grok"?(o?.referenceAssetIds||[]).slice(0,1):o?.referenceAssetIds'
);
c3 = c3.replace(
  'referenceAssetIds:p==="Grok"||p==="Muse AI"?(K.referenceAssetIds||[]).slice(0,1):K.referenceAssetIds',
  'referenceAssetIds:p==="Grok"?(K.referenceAssetIds||[]).slice(0,1):K.referenceAssetIds'
);

// Step 4: Robust Sequential Story Chaining Pipeline in St()
const stStartAnchor = 'St=async r=>{';
const codeToTest = `St=async r=>{
    if(nt.current)return;
    const isStoryChainingOn = (typeof window !== "undefined" && window.localStorage && window.localStorage.getItem("aiforge_story_chaining_enabled") === "true");
    
    /* DANH SÁCH CÁC CẢNH CẦN CHẠY */
    const allValidPrompts = be.filter(v => v.prompt && v.prompt.trim().length > 0).sort((p1, p2) => (p1.index || 0) - (p2.index || 0));
    const selectedPrompts = (Array.isArray(r) && r.filter(v => v.prompt && v.prompt.trim().length > 0).length > 0)
      ? r.filter(v => v.prompt && v.prompt.trim().length > 0).sort((p1, p2) => (p1.index || 0) - (p2.index || 0))
      : allValidPrompts;

    if(isStoryChainingOn && selectedPrompts.length > 0){
      const validPrompts = selectedPrompts;
      nt.current = true;
      _t(true);
      z.info("🎬 Bắt đầu chạy Chuỗi Kịch Bản (" + validPrompts.length + " cảnh tuần tự)...");
      
      let lastExtractedFrameAsset = null;
      let completedVideoAssetIds = [];
      let chainMuseAccount = null;
      let chainVeoAccount = null;
      let chainGrokAccount = null;
      let activeSceneIndex = 1;
      
      try {
        for(let idx = 0; idx < validPrompts.length; idx++){
          const curP = validPrompts[idx];
          const sceneNum = curP.index || (idx + 1);
          activeSceneIndex = sceneNum;
          z.info("⚡ [Cảnh " + sceneNum + "/" + validPrompts.length + "] Đang chuẩn bị kịch bản & nạp ảnh...");
          
          /* LẤY TRẠNG THÁI PROMPT MỚI NHẤT TỪ STORE ĐỂ BẢO ĐẢM ĐÚNG ẢNH USER TẢI LÊN */
          const latestCurP = (typeof o !== "undefined" && Array.isArray(o) ? o.find(x => x.id === curP.id) : null) || curP;
          const myUserRefs = getUserOriginalRefs(latestCurP);
          const isPromptKey = myUserRefs.length > 0;
          const isSceneModeNew = latestCurP.sceneMode === "new";
          
          // NỐI TIẾP CẢNH: Nếu chạy từ cảnh 2 trở đi mà chưa có frame cuối: Tự động tìm lại video của cảnh trước (trong Jobs & Assets)
          if(idx === 0 && sceneNum > 1 && !isSceneModeNew && !lastExtractedFrameAsset){
            try {
              const prevIndex = sceneNum - 1;
              const allJobs = (typeof Rt !== "undefined" && Rt.getState ? Rt.getState().jobs : []) || (Array.isArray(_) ? _ : []);
              const prevJob = allJobs.find(j => j.status === "Completed" && (j.payload?.promptOrder === prevIndex || j.payload?.sceneIndex === prevIndex || j.payload?.title?.includes("Cảnh " + prevIndex) || j.payload?.title?.includes("Phân cảnh " + prevIndex)));
              let prevVideoTarget = prevJob?.result?.assets?.find(a => a.type === "video")?.id || prevJob?.id || prevJob?.assetId;
              
              if(!prevVideoTarget){
                const allAssets = (typeof qe !== "undefined" && qe.getState ? qe.getState().assets : []) || (Array.isArray(We) ? We : []);
                const prevAsset = allAssets.find(a => 
                  (a.type === "video" || (a.mimeType && a.mimeType.startsWith("video/"))) &&
                  (a.name?.includes("Canh_" + prevIndex) || a.name?.includes("Cảnh " + prevIndex) || a.promptOrder === prevIndex || a.sceneIndex === prevIndex)
                );
                if(prevAsset) prevVideoTarget = prevAsset.id;
              }
              
              const assetsApi = window.aiforge?.assets || window.aivideo?.assets;
              if(assetsApi?.extractLastFrame){
                z.info("🔍 Đang tự động tìm frame cuối từ Cảnh " + prevIndex + " đã hoàn tất trước đó...");
                const prevFrame = await assetsApi.extractLastFrame({ assetId: prevVideoTarget, jobId: prevJob?.id, promptOrder: prevIndex });
                if(prevFrame && prevFrame.id){
                  lastExtractedFrameAsset = prevFrame;
                  z.success("✨ Đã sẵn sàng Frame cuối Cảnh " + prevIndex + " để nối sang Cảnh " + sceneNum + "!");
                }
              }
            } catch(findPrevErr){
              console.warn("Không thể tìm frame cảnh trước:", findPrevErr);
            }
          }
          
          /* XÁC ĐỊNH CHÍNH XÁC 100% ẢNH THAM CHIẾU THEO ĐÚNG NGUYÊN TẮC: */
          let targetRefIds = [];
          if(idx === 0 && sceneNum === 1){
            // Cảnh 1 (Mở đầu): Dùng đúng ảnh tham chiếu gốc của Cảnh 1 (nếu có)
            targetRefIds = myUserRefs;
          } else if(!isPromptKey){
            // 👶 PROMPT CON: BẮT BUỘC CHỈ CÓ DUY NHẤT 1 ẢNH là Frame cuối của cảnh liền trước!
            targetRefIds = lastExtractedFrameAsset ? [lastExtractedFrameAsset.id] : [];
          } else {
            // 🔑 PROMPT KEY:
            if(isSceneModeNew){
              // 🎬 SANG CẢNH MỚI: CẮT ĐỨT TOÀN BỘ LIÊN HỆ TRƯỚC ĐÓ! CHỈ LẤY DUY NHẤT ẢNH GỐC CỦA KEY NÀY!
              targetRefIds = myUserRefs;
              lastExtractedFrameAsset = null; // Xóa sạch frame cũ
            } else {
              // 🔗 NỐI TIẾP CẢNH: [Frame cuối cảnh trước] + [Ảnh gốc của prompt key này]!
              targetRefIds = lastExtractedFrameAsset 
                ? [lastExtractedFrameAsset.id, ...myUserRefs.filter(id => id !== lastExtractedFrameAsset.id)] 
                : myUserRefs;
            }
          }
          
          /* CẬP NHẬT LẬP TỨC VÀO STORE ĐỂ GIAO DIỆN HIỂN THỊ ĐÚNG CHUẨN */
          if(typeof Y === "function"){
            Y(curP.id, { referenceAssetIds: targetRefIds, userReferenceAssetIds: myUserRefs });
          }
          if(typeof ce === "function"){
            ce(new Set([curP.id]));
          }
          
          const isAuto = !curP.account || curP.account === "Auto" || curP.account === "Generated account";
          const isMuse = curP.provider === "Muse AI" || curP.provider === "muse ai" || (curP.provider && curP.provider.toLowerCase().includes("muse"));
          const isGrok = curP.provider === "Grok";
          
          const ie = (targetRefIds || []).filter(Boolean);
          
          let selectedAccount = null;
          let isManual = false;
          if(isMuse){
            const validMuse = (typeof museAccounts !== "undefined" && Array.isArray(museAccounts)) ? museAccounts.filter(ae => !ae.disabled) : [];
            if(!isAuto && typeof Mo_muse === "function"){
              selectedAccount = Mo_muse(curP);
              isManual = !!selectedAccount;
            } else if(validMuse.length > 0){
              if(!chainMuseAccount) chainMuseAccount = validMuse[0];
              selectedAccount = chainMuseAccount;
              isManual = true; // Khóa chặt tài khoản này cho toàn bộ chuỗi kịch bản
            }
          } else if(isGrok){
            if(!isAuto && typeof Po === "function"){
              selectedAccount = Po(curP);
              isManual = !!selectedAccount;
            } else if(Ie.length > 0){
              if(!chainGrokAccount) chainGrokAccount = Ie[0];
              selectedAccount = chainGrokAccount;
              isManual = true;
            }
          } else {
            if(!isAuto){
              selectedAccount = Co(curP);
              isManual = !!selectedAccount;
            } else if(Ce.length > 0){
              if(!chainVeoAccount) chainVeoAccount = Ce[0];
              selectedAccount = chainVeoAccount;
              isManual = true;
            }
          }
          
          let flowMode = curP.mode === "Frames" ? (ie.length >= 2 ? "Frames" : "I2V") : (ie.length > 0 ? "R2V" : "T2V");
          const utModel = fo(s, curP.model);
          const ctRes = curP.resolution || (utModel ? qs(s, utModel.id, flowMode, curP.duration, curP.ratio) : "720p");
          const moCredit = Mt(curP.model, curP.duration, ctRes, s);
          const yoUpscale = Do("upscale_video") && curP.autoUpscale ? bo(ctRes) : void 0;
          
          /* TẦNG 1: TỰ ĐỘNG THỬ LẠI (AUTO-RETRY TỐI ĐA 3 LẦN) NẾU GẶP SỰ CỐ MẠNG / AI CHẬP CHỜN */
          let jobId = null;
          let completedJob = null;
          let lastSceneErr = null;
          const maxSceneAttempts = 3;
          
          for (let attempt = 1; attempt <= maxSceneAttempts; attempt++) {
            try {
              if (attempt > 1) {
                z.warning("⚠️ [Cảnh " + sceneNum + "] Gặp sự cố kết nối AI tạm thời (" + (lastSceneErr?.message || "Mạng chập chờn") + "). Đang tự động thử lại lần " + attempt + "/" + maxSceneAttempts + " sau 5 giây...");
                await new Promise(res => setTimeout(res, 5000));
              }
              
              const singleJobRunId = "story-scene-" + sceneNum + "-" + Date.now() + "-try" + attempt;
              const singleJobBatch = [{
                title: curP.title || curP.prompt,
                type: "Video",
                providerId: isGrok ? "grok" : (isMuse ? "muse" : "veo3"),
                provider: curP.provider || "Veo3",
                ...(selectedAccount ? { accountId: selectedAccount.accountId, account: Tt(selectedAccount) } : {}),
                payload: {
                  title: curP.sceneName || curP.title || ("Phân cảnh " + sceneNum),
                  promptId: curP.id,
                  prompt: curP.prompt,
                  ratio: curP.ratio || "16:9",
                  mode: curP.mode || "Components",
                  flowVideoMode: flowMode,
                  duration: isMuse ? (curP.duration || "10s") : (curP.duration || "8s"),
                  model: isMuse ? "muse-video" : (isGrok ? "grok-imagine-video" : curP.model),
                  ...(isMuse ? { timeoutLimit: Boolean(museTimeoutLimit) } : {}),
                  resolution: ctRes,
                  creditCost: moCredit,
                  creditTotal: moCredit,
                  promptCreditTotal: moCredit,
                  outputIndex: 0,
                  batchSize: 1,
                  generationRunId: singleJobRunId,
                  generationRunCreatedAt: new Date().toISOString(),
                  promptOrder: sceneNum,
                  sceneIndex: sceneNum,
                  sceneName: curP.sceneName || ("Phân cảnh " + sceneNum),
                  batchIndex: 0,
                  account: selectedAccount ? Tt(selectedAccount) : "Auto",
                  accountSelection: isManual ? "manual" : (isAuto ? "auto" : "manual"),
                  referenceAssetIds: ie.slice(0, isMuse ? 6 : 99),
                  resolutionName: ctRes || "720p",
                  preset: "custom",
                  studioSource: "video-studio",
                  autoMerge: false,
                  ...(yoUpscale ? { autoUpscale: true, upscaleTargetResolution: yoUpscale } : {}),
                  autoRemoveWatermark: Do("remove_watermark_video") && curP.autoRemoveWatermark === true,
                  removeWatermark: Do("remove_watermark_video") && curP.autoRemoveWatermark === true
                }
              }];
              
              const submitRes = await B(singleJobBatch);
              const queuedJob = submitRes?.results?.[0];
              if(!queuedJob || !queuedJob.ok){
                throw new Error(queuedJob?.error || ("Không thể tạo hàng đợi cho Cảnh " + sceneNum));
              }
              
              jobId = queuedJob?.job?.id || queuedJob?.id || queuedJob?.jobId;
              z.info("⏳ [Cảnh " + sceneNum + "] Đang render video" + (attempt > 1 ? " (Lần " + attempt + ")" : "") + (jobId ? " (" + jobId.slice(-6) + ")" : "") + "...");
              
              const pollStart = Date.now();
              while(Date.now() - pollStart < 900000){
                await new Promise(res => setTimeout(res, 2000));
                try {
                  const allJobs = (typeof Rt !== "undefined" && Rt.getState ? Rt.getState().jobs : []) || (Array.isArray(_) ? _ : []);
                  let j = null;
                  if (jobId) {
                    j = allJobs.find(x => x.id === jobId);
                  }
                  if (!j) {
                    j = allJobs.find(x => 
                      (x.payload?.promptId === curP.id || x.promptId === curP.id) &&
                      (x.payload?.generationRunId === singleJobRunId || x.generationRunId === singleJobRunId)
                    );
                  }
                  
                  if ((!j || j.status === "Pending" || j.status === "Queued") && jobId) {
                    const queueApi = window.aiforge?.queue || window.aivideo?.queue;
                    if (queueApi?.getJobs) {
                      const fetched = await queueApi.getJobs([jobId]);
                      if (fetched && fetched[0]) j = fetched[0];
                    }
                  }
                  
                  if(j){
                    if(j.status === "Completed"){
                      completedJob = j;
                      break;
                    } else if(j.status === "Failed" || j.status === "Canceled"){
                      throw new Error(j.error || j.statusReason || ("Cảnh " + sceneNum + " render thất bại hoặc bị hủy"));
                    }
                  }
                } catch(pollErr){
                  if(pollErr.message && (pollErr.message.includes("thất bại") || pollErr.message.includes("bị hủy"))) throw pollErr;
                }
              }
              
              if(!completedJob){
                throw new Error("Hết thời gian chờ tạo video Cảnh " + sceneNum);
              }
              
              // Đã thành công! Thoát khỏi vòng lặp retry
              break;
            } catch(attErr) {
              lastSceneErr = attErr;
              console.warn("[Cảnh " + sceneNum + "] Lần thử " + attempt + " thất bại:", attErr);
              if (attempt >= maxSceneAttempts) {
                throw attErr;
              }
            }
          }
          
          const videoAsset = (completedJob.result?.assets || []).find(a => a.type === "video") || null;
          let resultVideoAssetId = videoAsset?.id || completedJob.result?.assetId || completedJob.assetId || completedJob.payload?.assetId || completedJob.result?.videoUrl || completedJob.videoUrl;
          if(!resultVideoAssetId) resultVideoAssetId = completedJob.id;
          if(resultVideoAssetId){
            completedVideoAssetIds.push(resultVideoAssetId);
          }
          
          z.success("🎉 [Cảnh " + sceneNum + "] Hoàn tất video!");
          
          // TRÍCH XUẤT FRAME CUỐI VÀ NẠP SANG CẢNH TIẾP THEO (KẾT HỢP VỚI ẢNH GỐC CỦA CẢNH TIẾP THEO)
          if(idx < validPrompts.length - 1){
            z.info("📸 [Cảnh " + sceneNum + "] Đang trích xuất Frame cuối cực nét để nối sang Cảnh " + (sceneNum + 1) + "...");
            try {
              const assetsApi = window.aiforge?.assets || window.aivideo?.assets;
              if(assetsApi?.extractLastFrame){
                const frameAsset = await assetsApi.extractLastFrame({
                  assetId: resultVideoAssetId || completedJob.id,
                  jobId: completedJob.id || jobId,
                  promptId: curP.id,
                  promptOrder: sceneNum
                });
                if(frameAsset && frameAsset.id){
                  lastExtractedFrameAsset = frameAsset;
                  z.success("✨ Đã trích xuất xong Frame cuối Cảnh " + sceneNum + ", tự động nạp vào Cảnh " + (sceneNum + 1) + "!");
                  
                  // Hiển thị ngay frame trên giao diện cho Cảnh tiếp theo theo đúng rule
                  const nextPrompt = validPrompts[idx + 1];
                  if(nextPrompt && typeof Y === "function"){
                    const latestNext = (typeof o !== "undefined" && Array.isArray(o) ? o.find(x => x.id === nextPrompt.id) : null) || nextPrompt;
                    const nextUserRefs = getUserOriginalRefs(latestNext);
                    const nextIsKey = nextUserRefs.length > 0;
                    const nextIsNew = latestNext.sceneMode === "new";
                    
                    let nextTargetRefs = [];
                    if(!nextIsKey){
                      // Cảnh tiếp theo là PROMPT CON -> CHỈ LẤY DUY NHẤT 1 FRAME CUỐI!
                      nextTargetRefs = [frameAsset.id];
                    } else if(nextIsNew){
                      // Cảnh tiếp theo là SANG CẢNH MỚI -> CẮT ĐỨT! CHỈ LẤY ẢNH GỐC CỦA NÓ!
                      nextTargetRefs = nextUserRefs;
                    } else {
                      // Cảnh tiếp theo là NỐI TIẾP CẢNH -> [FRAME CUỐI] + [ẢNH GỐC]!
                      nextTargetRefs = [frameAsset.id, ...nextUserRefs.filter(id => id !== frameAsset.id)];
                    }
                    
                    Y(nextPrompt.id, {
                      referenceAssetIds: nextTargetRefs,
                      userReferenceAssetIds: nextUserRefs
                    });
                  }
                }
              }
            } catch(extractErr){
              console.warn("Lỗi trích xuất frame cuối:", extractErr);
              z.warning("Không thể tự động xuất frame cuối Cảnh " + sceneNum + ", sẽ tiếp tục cảnh tiếp theo.");
            }
          }
        }
        
        z.success("🏆 [XUẤT SẮC] ĐÃ HOÀN TẤT TRỌN VẸN TOÀN BỘ " + validPrompts.length + " CẢNH CỦA CHUỖI KỊCH BẢN!");
        
        const isAutoMergeOn = (window.localStorage.getItem("aiforge_auto_merge_queue_enabled")==="true")||(window.localStorage.getItem("aiforge.videoStudio.autoMerge.v1")==="true");
        if(isAutoMergeOn && completedVideoAssetIds.length > 1){
          z.info("🎞️ Đang tự động ghép " + completedVideoAssetIds.length + " phân cảnh thành bộ phim hoàn chỉnh...");
          try {
            const assetsApi = window.aiforge?.assets || window.aivideo?.assets;
            if(assetsApi?.editAndMergeVideos){
              await assetsApi.editAndMergeVideos(completedVideoAssetIds, { title: "Phim_Hoan_Chinh_" + Date.now() });
              z.success("🎬 Đã ghép nối phim dài hoàn tất!");
            }
          } catch(mergeErr){
            console.warn("Lỗi tự động ghép phim:", mergeErr);
          }
        }
        
      } catch(chainErr){
        console.error("[Story Chaining Error]:", chainErr);
        z.error("❌ Chuỗi Kịch Bản tạm dừng tại Cảnh " + activeSceneIndex + ": " + (chainErr.message || chainErr));
        z.info("💡 YÊN TÂM: Toàn bộ ảnh kịch bản và các cảnh trước đã được LƯU AN TOÀN 100%! Bạn KHÔNG CẦN nhập lại. Chỉ cần tick chọn từ Cảnh " + activeSceneIndex + " trở đi rồi bấm 'Tạo video' là hệ thống sẽ tự động nối tiếp!");
      } finally {
        nt.current = false;
        _t(false);
      }
      return;
    }
`;
const c4 = c3.replace(stStartAnchor, codeToTest);

// Áp dụng file patched cho tất cả các bản
for (const root of targetRoots) {
  const vsTarget = path.join(root, 'out/renderer/assets/VideoStudio-frcr8V6s.js');
  if (fs.existsSync(vsTarget)) {
    fs.writeFileSync(vsTarget, c4, 'utf8');
    console.log('  ✓ Đã cập nhật VideoStudio tại:', vsTarget);
  }
}

// Kiểm tra cú pháp của tất cả các file
console.log('[*] Đang kiểm tra cú pháp AST của toàn bộ bundle...');
for (const root of targetRoots) {
  const vsTarget = path.join(root, 'out/renderer/assets/VideoStudio-frcr8V6s.js');
  if (fs.existsSync(vsTarget)) {
    try {
      execSync(`node --check "${vsTarget}"`, { stdio: 'inherit' });
      console.log(`  🎉 [PASS] VideoStudio hợp lệ 100%: ${vsTarget}`);
    } catch (e) {
      console.error(`  ❌ [FAIL] VideoStudio lỗi cú pháp: ${vsTarget}`);
      process.exit(1);
    }
  }
}

console.log('🌟 [XONG] Toàn bộ hệ thống Chuỗi Kịch Bản đã được cài đặt hoàn hảo! 🌟');
