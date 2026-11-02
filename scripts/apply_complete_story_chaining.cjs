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
  path.join(__dirname, '../dist/AI_VIDEO_LIBRARY_Khach_Hang_v3.0/resources/app')
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
  if (fs.existsSync(mPath)) {
    let mCode = fs.readFileSync(mPath, 'utf8');
    if (!mCode.includes('assets:extractLastFrame')) {
      const mainTarget = 'E.handle("assets:syncVoiceoverVideo", async (A, videoAssetId, audioAssetId, options) => {';
      const mainHandler = `E.handle("assets:extractLastFrame", async (A, videoIdOrPath) => {
  C(A);
  try {
    let localVideoPath = "";
    if (typeof videoIdOrPath === "string") {
      const cleanId = videoIdOrPath.replace(/^.*\\/asset\\//, "").replace(/\\?.*$/, "").trim();
      const asset = V.getAsset ? (V.getAsset(cleanId) || V.getAsset(videoIdOrPath)) : null;
      if (asset && asset.localPath && require('fs').existsSync(asset.localPath)) {
        localVideoPath = asset.localPath;
      } else if (require('fs').existsSync(videoIdOrPath)) {
        localVideoPath = videoIdOrPath;
      }
    }
    if (!localVideoPath) {
      if (V.state && Array.isArray(V.state.assets)) {
        const vAssets = V.state.assets.filter(a => a.type === "video" && a.localPath && require('fs').existsSync(a.localPath));
        if (vAssets.length > 0) localVideoPath = vAssets[vAssets.length - 1].localPath;
      }
    }
    if (!localVideoPath) {
      throw new Error("Không tìm thấy file video để trích xuất frame cuối: " + videoIdOrPath);
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
      if (mCode.includes(mainTarget)) {
        mCode = mCode.replace(mainTarget, mainHandler + mainTarget);
        fs.writeFileSync(mPath, mCode, 'utf8');
        console.log('  ✓ Đã cập nhật Main Process tại:', mPath);
      }
    }
  }
}

// 2. BIÊN DỊCH VIDEOSTUDIO BẰNG BỘ CHUYỂN ĐỔI CHUẨN XÁC 100%
console.log('[*] Đang biên dịch mã nguồn VideoStudio hoàn chỉnh...');
const pristinePath = path.join(__dirname, '../app/out/renderer/assets/VideoStudio-frcr8V6s.js.bak_before_story_chain');
const orig = fs.readFileSync(pristinePath, 'utf8');

// Step 1: State & Toolbar Master Switch
let c1 = orig;
const stateAnchor = 'const[autoDlVid,setAutoDlVid]=l.useState(';
const storyStateSnippet = 'const[storyChaining,setStoryChaining]=l.useState(()=>{try{return window.localStorage.getItem("aiforge_story_chaining_enabled")==="true"}catch{return false;}}),onToggleStoryChaining=()=>{const nv=!storyChaining;setStoryChaining(nv);try{window.localStorage.setItem("aiforge_story_chaining_enabled",String(nv))}catch(_){}};';
c1 = c1.replace(stateAnchor, storyStateSnippet + stateAnchor);

const toolbarAnchor = 'children:P("videoStudio.videoQueueDesc")})]}),e.jsxs("div",{className:"flex min-w-0 flex-1 flex-wrap items-center justify-end gap-2.5 text-xs text-text-muted",children:[';
const masterSwitchButton = 'e.jsxs("button",{type:"button",onClick:onToggleStoryChaining,title:storyChaining?"Chế độ Chuỗi Kịch Bản: ĐANG BẬT":"Chế độ Chuỗi Kịch Bản: ĐANG TẮT",className:storyChaining?"inline-flex h-8 cursor-pointer items-center gap-1.5 rounded-lg border px-3 text-[11px] font-bold transition-all border-amber-400 bg-amber-500/25 text-amber-200 shadow-[0_0_16px_rgba(245,158,11,0.4)]":"inline-flex h-8 cursor-pointer items-center gap-1.5 rounded-lg border px-3 text-[11px] font-bold transition-all border-white/10 bg-white/5 text-slate-400 hover:text-white",children:[e.jsx("span",{className:storyChaining?"h-2.5 w-2.5 rounded-full bg-amber-400 animate-pulse shadow-[0_0_8px_#f59e0b]":"h-2.5 w-2.5 rounded-full bg-slate-500"}),e.jsx("span",{children:"👑"}),storyChaining?"CHUỖI KỊCH BẢN: BẬT":"CHUỖI KỊCH BẢN: TẮT"]}),';
c1 = c1.replace(toolbarAnchor, toolbarAnchor + masterSwitchButton);

// Step 2: Prompt Key Yellow Badge & Prompt Con & 2 Buttons
let c2 = c1;
const cellAnchor = 'e.jsxs("td",{className:"min-w-0 px-2 py-1",children:[';
const badgeSnippet = 'storyChaining&&e.jsx("div",{className:"mb-1 flex items-center gap-2 select-none",children:p.index===1?e.jsxs("span",{className:"inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-extrabold bg-amber-500/25 text-amber-300 border border-amber-500/40 shadow-[0_0_10px_rgba(245,158,11,0.25)]",children:[e.jsx("span",{children:"🔑"}),"PROMPT KEY 1 (MỞ ĐẦU)"]}):((p.referenceAssetIds&&p.referenceAssetIds.length>0)?e.jsxs("div",{className:"inline-flex items-center gap-1.5",children:[e.jsxs("span",{className:"inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-extrabold bg-amber-500/25 text-amber-300 border border-amber-500/50 shadow-[0_0_12px_rgba(245,158,11,0.35)]",children:[e.jsx("span",{children:"🔑"}),"PROMPT KEY"]}),e.jsxs("button",{type:"button",onClick:Z=>{Z.stopPropagation();const cur=p.sceneMode||"continue";Q(p.id,{sceneMode:cur==="new"?"continue":"new"})},className:p.sceneMode==="new"?"inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-purple-500/30 text-purple-200 border border-purple-400 hover:bg-purple-500/45 cursor-pointer shadow-sm transition-all":"inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/30 text-emerald-200 border border-emerald-400 hover:bg-emerald-500/45 cursor-pointer shadow-sm transition-all",title:p.sceneMode==="new"?"Đang chọn: SANG CẢNH MỚI (Click để đổi sang NỐI TIẾP CẢNH)":"Đang chọn: NỐI TIẾP CẢNH (Click để đổi sang SANG CẢNH MỚI)",children:[e.jsx("span",{children:p.sceneMode==="new"?"🎬":"🔗"}),p.sceneMode==="new"?"Sang cảnh mới":"Nối tiếp cảnh"]})]}):e.jsxs("span",{className:"inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold bg-cyan-950/40 text-cyan-300 border border-cyan-500/30",children:[e.jsx("span",{children:"👶"}),"Prompt con (🔗 Tự động lấy frame cuối)"]}))}),';
c2 = c2.replace(cellAnchor, cellAnchor + badgeSnippet);

// Step 3: Unlimited Multi-Ref Upload (Using block comments)
let c3 = c2;
c3 = c3.replace('if(d.length>=i){z.warning(t("videoStudio.maxVideoRefsWarning",{max:i}));return}', '/* unlimited multi-ref upload allowed */');
c3 = c3.replace('if(d.length>=i)break;', '/* unlimited upload */');
const exactMaxSelection = 'maxSelection:o.find(r=>r.id===we)?.provider==="Grok"?pt(o.find(r=>r.id===we)?.duration):(o.find(r=>r.id===we)?.provider==="Muse AI"||(o.find(r=>r.id===we)?.provider&&o.find(r=>r.id===we).provider.toLowerCase().includes("muse")))?6:o.find(r=>r.id===we)?ao(s,o.find(r=>r.id===we)):0,';
c3 = c3.replace(exactMaxSelection, 'maxSelection:99,');

// Step 4: Sequential Pipeline in St()
const stStartAnchor = 'St=async r=>{';
const codeToTest = `St=async r=>{
    if(nt.current)return;
    const isStoryChainingOn = (typeof window !== "undefined" && window.localStorage && window.localStorage.getItem("aiforge_story_chaining_enabled") === "true");
    
    /* NẾU BẬT CHẾ ĐỘ CHUỖI KỊCH BẢN VÀ CÓ TỪ 2 CẢNH TRỞ LÊN: CHẠY TUẦN TỰ NỐI FRAME CUỐI */
    if(isStoryChainingOn && Array.isArray(r) && r.filter(v=>v.prompt.trim().length>0).length > 1){
      const validPrompts = r.filter(v=>v.prompt.trim().length>0).sort((p1,p2)=>(p1.index||0)-(p2.index||0));
      nt.current = true;
      _t(true);
      z.info("🎬 Bắt đầu chạy Chuỗi Kịch Bản gồm " + validPrompts.length + " cảnh tuần tự...");
      
      let lastExtractedFrameAsset = null;
      let completedVideoAssetIds = [];
      
      try {
        for(let idx = 0; idx < validPrompts.length; idx++){
          const curP = validPrompts[idx];
          const sceneNum = curP.index || (idx + 1);
          z.info("⚡ [Cảnh " + sceneNum + "/" + validPrompts.length + "] Đang khởi tạo và tạo video...");
          
          let targetRefIds = [];
          if(idx === 0){
            targetRefIds = curP.referenceAssetIds || [];
          } else {
            const hasUserImages = curP.referenceAssetIds && curP.referenceAssetIds.length > 0;
            if(hasUserImages){
              if(curP.sceneMode === "new"){
                targetRefIds = curP.referenceAssetIds;
              } else {
                targetRefIds = lastExtractedFrameAsset ? [lastExtractedFrameAsset.id, ...curP.referenceAssetIds] : curP.referenceAssetIds;
              }
            } else {
              targetRefIds = lastExtractedFrameAsset ? [lastExtractedFrameAsset.id] : [];
            }
          }
          
          if(typeof Y === "function"){
            Y(curP.id, { referenceAssetIds: targetRefIds });
          }
          
          const singleJobRunId = "story-scene-" + sceneNum + "-" + Date.now();
          const singleJobBatch = [];
          
          const isAuto=!curP.account||curP.account==="Auto"||curP.account==="Generated account";
          const ie=(targetRefIds||[]).flatMap(ve=>{const ot=We.find(Pt=>Pt.id===ve);return ot?[ot]:[]}).filter(ve=>ve.type==="image").map(ve=>ve.id);
          
          let selectedAccount = null;
          if(!isAuto){
            selectedAccount = Co(curP);
          } else if(Ce.length > 0){
            selectedAccount = Ce[idx % Ce.length];
          }
          
          let flowMode = curP.mode === "Frames" ? (ie.length >= 2 ? "Frames" : "I2V") : (ie.length > 0 ? "R2V" : "T2V");
          const utModel = fo(s, curP.model);
          const ctRes = curP.resolution || (utModel ? qs(s, utModel.id, flowMode, curP.duration, curP.ratio) : "720p");
          const moCredit = Mt(curP.model, curP.duration, ctRes, s);
          const yoUpscale = Do("upscale_video") && curP.autoUpscale ? bo(ctRes) : void 0;
          
          singleJobBatch.push({
            title: curP.title || curP.prompt,
            type: "Video",
            providerId: curP.provider === "Grok" ? "grok" : (curP.provider === "Muse AI" ? "muse" : "veo3"),
            provider: curP.provider || "Veo3",
            ...(selectedAccount ? { accountId: selectedAccount.accountId, account: Tt(selectedAccount) } : {}),
            payload: {
              title: curP.sceneName || curP.title || ("Phân cảnh " + sceneNum),
              promptId: curP.id,
              prompt: curP.prompt,
              ratio: curP.ratio || "16:9",
              mode: curP.mode || "Components",
              flowVideoMode: flowMode,
              duration: curP.duration || "8s",
              model: curP.model,
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
              accountSelection: isAuto ? "auto" : "manual",
              referenceAssetIds: ie,
              studioSource: "video-studio",
              autoMerge: false,
              ...(yoUpscale ? { autoUpscale: true, upscaleTargetResolution: yoUpscale } : {}),
              autoRemoveWatermark: Do("remove_watermark_video") && curP.autoRemoveWatermark === true,
              removeWatermark: Do("remove_watermark_video") && curP.autoRemoveWatermark === true
            }
          });
          
          const submitRes = await B(singleJobBatch);
          const queuedJob = submitRes?.results?.[0];
          if(!queuedJob || !queuedJob.ok){
            throw new Error(queuedJob?.error || ("Không thể tạo hàng đợi cho Cảnh " + sceneNum));
          }
          
          const jobId = queuedJob.id || queuedJob.jobId;
          z.info("⏳ [Cảnh " + sceneNum + "] Đang render video trong hàng đợi...");
          
          let completedJob = null;
          const pollStart = Date.now();
          while(Date.now() - pollStart < 900000){
            await new Promise(res => setTimeout(res, 3000));
            try {
              const queueApi = window.aiforge?.queue || window.aivideo?.queue;
              const jobs = queueApi?.getJobs ? (await queueApi.getJobs([jobId])) : [];
              const j = jobs?.[0];
              if(j){
                if(j.status === "Completed"){
                  completedJob = j;
                  break;
                } else if(j.status === "Failed"){
                  throw new Error(j.error || j.statusReason || ("Cảnh " + sceneNum + " render thất bại"));
                }
              }
            } catch(pollErr){
              if(pollErr.message && pollErr.message.includes("render thất bại")) throw pollErr;
            }
          }
          
          if(!completedJob){
            throw new Error("Hết thời gian chờ tạo video Cảnh " + sceneNum);
          }
          
          const resultVideoAssetId = completedJob.result?.assetId || completedJob.assetId || completedJob.payload?.assetId || completedJob.result?.videoUrl || completedJob.videoUrl;
          if(resultVideoAssetId){
            completedVideoAssetIds.push(resultVideoAssetId);
          }
          
          z.success("🎉 [Cảnh " + sceneNum + "] Hoàn tất video!");
          
          if(idx < validPrompts.length - 1){
            z.info("📸 [Cảnh " + sceneNum + "] Đang trích xuất Frame cuối cực nét để nối sang Cảnh " + (sceneNum + 1) + "...");
            try {
              const assetsApi = window.aiforge?.assets || window.aivideo?.assets;
              if(assetsApi?.extractLastFrame && resultVideoAssetId){
                const frameAsset = await assetsApi.extractLastFrame(resultVideoAssetId);
                if(frameAsset && frameAsset.id){
                  lastExtractedFrameAsset = frameAsset;
                  z.success("✨ Frame cuối Cảnh " + sceneNum + " đã sẵn sàng làm bệ phóng cho Cảnh " + (sceneNum + 1) + "!");
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
        z.error("❌ Lỗi trong Chuỗi Kịch Bản: " + (chainErr.message || chainErr));
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
