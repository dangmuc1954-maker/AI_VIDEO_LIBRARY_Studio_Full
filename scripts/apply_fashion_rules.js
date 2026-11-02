const fs = require('fs');
const path = require('path');

const targetFile = path.resolve(__dirname, '../app/out/renderer/assets/VideoFactoryStudio.js');
let content = fs.readFileSync(targetFile, 'utf8');

console.log('Original content length:', content.length);

// 1. Helper function definition
const helperCode = `// 🎯 QUY TẮC NẠP ẢNH THAM CHIẾU XƯỞNG THỜI TRANG (CHUẨN 100% YÊU CẦU NGƯỜI DÙNG):
// Ảnh cảnh 1: 1 KOC gốc + 1 Outfit gốc -> [KOC, Outfit]
// Ảnh cảnh 2: 1 KOC gốc + 1 Outfit gốc + 1 Cảnh 1 -> [KOC, Outfit, Cảnh 1]
// Ảnh cảnh 3: 1 KOC gốc + 1 Outfit gốc + 1 Cảnh 2 -> [KOC, Outfit, Cảnh 2]
// Ảnh cảnh 4..7: 1 KOC gốc + 1 Outfit gốc + 1 Cảnh 3 + 1 Cảnh 1 -> [KOC, Outfit, Cảnh 3, Cảnh 1]
function getFashionSceneReferenceIds(frameId, validKocId, validOutfitId, validFrame1Id, validFrame2Id, validFrame3Id) {
  const refs = [];
  if (frameId === 1) {
    if (validKocId) refs.push(validKocId);
    if (validOutfitId) refs.push(validOutfitId);
  } else if (frameId === 2) {
    if (validKocId) refs.push(validKocId);
    if (validOutfitId) refs.push(validOutfitId);
    if (validFrame1Id) refs.push(validFrame1Id);
  } else if (frameId === 3) {
    if (validKocId) refs.push(validKocId);
    if (validOutfitId) refs.push(validOutfitId);
    if (validFrame2Id) refs.push(validFrame2Id);
  } else if (frameId >= 4) {
    if (validKocId) refs.push(validKocId);
    if (validOutfitId) refs.push(validOutfitId);
    if (validFrame3Id) refs.push(validFrame3Id);
    if (validFrame1Id) refs.push(validFrame1Id);
  }
  return refs.filter((id, idx, arr) => id && arr.indexOf(id) === idx);
}
`;

if (!content.includes('function getFashionSceneReferenceIds(')) {
  const marker = 'function buildSceneImagePrompt(templatePrompt, envStyle, techStyle) {';
  const markerIdx = content.indexOf(marker);
  if (markerIdx === -1) throw new Error('Cannot find buildSceneImagePrompt');
  const returnIdx = content.indexOf('return p;\n}', markerIdx);
  if (returnIdx === -1) throw new Error('Cannot find return p in buildSceneImagePrompt');
  const insertPos = returnIdx + 'return p;\n}'.length;
  content = content.slice(0, insertPos) + '\n\n' + helperCode + content.slice(insertPos);
  console.log('✓ Added getFashionSceneReferenceIds helper function');
} else {
  console.log('getFashionSceneReferenceIds helper already present');
}

// 2. Update polling triggers
const oldPolling = `                  // 🎯 NỐI CHUỖI TỰ ĐỘNG: CẢNH 1 XONG -> NẠP CẢNH 2, 3; CẢNH 3 XONG -> NẠP CẢNH 4-7
                  if (f.id === 1) {
                    setTimeout(() => dispatchScenesWaitingAnchor1(nextFrame.imageAsset), 500);
                  } else if (f.id === 3) {
                    setTimeout(() => dispatchScenesWaitingAnchor3(nextFrame.imageAsset), 500);
                  }`;

const newPolling = `                  // 🎯 NỐI CHUỖI TỰ ĐỘNG: C1 XONG -> C2; C2 XONG -> C3; C3 XONG -> C4-7
                  if (f.id === 1) {
                    setTimeout(() => dispatchScenesWaitingAnchor1(nextFrame.imageAsset), 500);
                  } else if (f.id === 2) {
                    setTimeout(() => dispatchScenesWaitingAnchor2(nextFrame.imageAsset), 500);
                  } else if (f.id === 3) {
                    setTimeout(() => dispatchScenesWaitingAnchor3(nextFrame.imageAsset), 500);
                  }`;

if (content.includes(oldPolling)) {
  content = content.replace(oldPolling, newPolling);
  console.log('✓ Updated polling triggers for C1 -> C2 -> C3 -> C4-7');
} else if (content.includes(newPolling)) {
  console.log('Polling triggers already updated');
} else {
  console.warn('Could not find oldPolling');
}

// 3. Update generateSingleImage refs
const oldSingle = `      // 🎯 CHUỖI THAM CHIẾU GOOGLE FLOW:
      // Cảnh 1: [Mặt KOC, Outfit]
      // Cảnh 2 & 3: [Mặt KOC, Outfit, Cảnh 1]
      // Cảnh 4-7: [Mặt KOC, Outfit, Cảnh 1, Cảnh 3]
      const refs = [validKocId, validOutfitId].filter(Boolean);
      if (frameId > 1) {
        const frame1 = cs.storyboard.find(f => f.id === 1);
        if (frame1?.imageAsset) {
          const validFrame1Id = await ensureRegisteredAsset(frame1.imageAsset, 'koc_scene_1.jpg');
          if (validFrame1Id && !refs.includes(validFrame1Id)) {
            refs.push(validFrame1Id);
          }
        }
      }
      if (frameId >= 4) {
        const frame3 = cs.storyboard.find(f => f.id === 3);
        if (frame3?.imageAsset) {
          const validFrame3Id = await ensureRegisteredAsset(frame3.imageAsset, 'koc_scene_3.jpg');
          if (validFrame3Id && !refs.includes(validFrame3Id)) {
            refs.push(validFrame3Id);
          }
        }
      }`;

const newSingle = `      // 🎯 QUY TẮC NẠP ẢNH THAM CHIẾU XƯỞNG THỜI TRANG (CHUẨN 100% YÊU CẦU NGƯỜI DÙNG):
      // Cảnh 1: [KOC gốc, Outfit gốc]
      // Cảnh 2: [KOC gốc, Outfit gốc, Cảnh 1]
      // Cảnh 3: [KOC gốc, Outfit gốc, Cảnh 2]
      // Cảnh 4..7: [KOC gốc, Outfit gốc, Cảnh 3, Cảnh 1]
      let validFrame1Id = null;
      let validFrame2Id = null;
      let validFrame3Id = null;

      if (frameId === 2 || frameId >= 4) {
        const frame1 = cs.storyboard.find(f => f.id === 1);
        if (frame1?.imageAsset) {
          validFrame1Id = await ensureRegisteredAsset(frame1.imageAsset, 'koc_scene_1.jpg');
        }
      }
      if (frameId === 3) {
        const frame2 = cs.storyboard.find(f => f.id === 2);
        if (frame2?.imageAsset) {
          validFrame2Id = await ensureRegisteredAsset(frame2.imageAsset, 'koc_scene_2.jpg');
        }
      }
      if (frameId >= 4) {
        const frame3 = cs.storyboard.find(f => f.id === 3);
        if (frame3?.imageAsset) {
          validFrame3Id = await ensureRegisteredAsset(frame3.imageAsset, 'koc_scene_3.jpg');
        }
      }

      const refs = getFashionSceneReferenceIds(frameId, validKocId, validOutfitId, validFrame1Id, validFrame2Id, validFrame3Id);`;

if (content.includes(oldSingle)) {
  content = content.replace(oldSingle, newSingle);
  console.log('✓ Updated generateSingleImage references logic');
} else {
  console.log('oldSingle not found or already updated');
}

// 4. Update generateAllImages, dispatchScenesWaitingAnchor1, dispatchScenesWaitingAnchor3
const blockStartMarker = '  // 1. TẠO 7 CẢNH ẢNH (QUY TRÌNH CHUỖI 4 CẤP: CẢNH 1 MỎ NEO -> CẢNH 2,3 -> CẢNH 4-7 NỐI CẢNH 3)';
const blockEndMarker = '  // 🧠 2. Phân Tích Chuyển Động Siêu Tốc (HỖ TRỢ GEMINI VISION API TRỰC TIẾP & BROWSER HUB)';

const startIdx = content.indexOf(blockStartMarker);
const endIdx = content.indexOf(blockEndMarker);

if (startIdx === -1 || endIdx === -1) {
  throw new Error(`Cannot locate block bounds: startIdx=${startIdx}, endIdx=${endIdx}`);
}

const newBatchAndDispatchBlock = `  // 1. TẠO 7 CẢNH ẢNH (QUY TRÌNH CHUỖI NỐI TIẾP: C1 -> C2 -> C3 -> C4..7)
  const generateAllImages = async () => {
    const cs = stateRef.current;
    if (!cs.koc || !cs.outfit) {
      toast?.warn?.("Vui lòng tải lên cả Gương mặt KOC và Mẫu Trang phục trước khi tạo kịch bản ảnh!");
      return;
    }

    const now = Date.now();
    const frame1 = cs.storyboard.find(f => f.id === 1);
    const frame2 = cs.storyboard.find(f => f.id === 2);
    const frame3 = cs.storyboard.find(f => f.id === 3);
    const hasFrame1Asset = Boolean(frame1?.imageAsset);
    const hasFrame2Asset = Boolean(frame2?.imageAsset);
    const hasFrame3Asset = Boolean(frame3?.imageAsset);

    setIsGeneratingImages(true);

    try {
      const validKocId = await ensureRegisteredAsset(cs.koc, 'koc_face.jpg');
      const validOutfitId = await ensureRegisteredAsset(cs.outfit, 'outfit_sample.jpg');
      if (validKocId && validKocId !== cs.koc.assetId) {
        setKoc(prev => prev ? { ...prev, assetId: validKocId, mediaId: validKocId } : prev);
      }
      if (validOutfitId && validOutfitId !== cs.outfit.assetId) {
        setOutfit(prev => prev ? { ...prev, assetId: validOutfitId, mediaId: validOutfitId } : prev);
      }

      const qApi = window.aiforge?.queue || window.aivideo?.queue;
      if (!qApi?.addJobs && !qApi?.addJob) throw new Error("Hệ thống Queue chưa sẵn sàng");

      const isAutoBanana = !selectedBananaAccountId || selectedBananaAccountId === 'auto';
      const liveSessionsAll = (window.aiforge?.browser?.listSessions?.() || window.aivideo?.browser?.listSessions?.() || []);
      const effectiveAccsAll = (accounts && accounts.length > 0) ? accounts : liveSessionsAll;
      let activeBananaAccs = effectiveAccsAll.filter(a => (a.providerId === 'banana' || a.provider === 'Banana') && (a.authStatus === 'Logged In' || a.authStatus === 'active' || !a.disabled));
      if (activeBananaAccs.length === 0) activeBananaAccs = effectiveAccsAll.filter(a => a.providerId === 'banana' || a.provider === 'Banana');
      let manualBananaAcc = !isAutoBanana ? effectiveAccsAll.find(a => a.accountId === selectedBananaAccountId) : undefined;

      const helperCreateJob = (frame, refs, idx = 0) => {
        let curAcc = undefined;
        let isManual = false;
        if (manualBananaAcc) {
          curAcc = manualBananaAcc;
          isManual = true;
        } else if (activeBananaAccs.length > 0) {
          curAcc = activeBananaAccs[idx % activeBananaAccs.length];
          isManual = false;
        }
        const targetAccId = curAcc?.accountId || undefined;
        const targetAccName = curAcc?.accountDisplayName || curAcc?.accountEmail || curAcc?.accountName || undefined;
        const finalPrompt = buildSceneImagePrompt(frame.imagePrompt, cs.creativeDirection, cs.technicalStyle);

        return {
          title: \`[KOC Thời Trang] Storyboard Cảnh \${frame.id}\`,
          type: "Image",
          providerId: imageEngine === "muse" ? "muse" : "banana",
          provider: imageEngine === "muse" ? "Muse AI" : "Banana",
          autoRemoveWatermark: cs.removeWatermark === true,
          removeWatermark: cs.removeWatermark === true,
          ...(targetAccId ? { accountId: targetAccId, account: targetAccName } : {}),
          payload: {
            title: \`[KOC Thời Trang] Storyboard Cảnh \${frame.id}\`,
            prompt: finalPrompt,
            ratio: "9:16",
            aspectRatio: "9:16",
            referenceAssetIds: refs,
            model: imageEngine === "muse" ? "muse-image" : "banana",
            modelDisplayName: "🍌 Nano Banana Pro",
            studioSource: "video-factory",
            removeWatermark: cs.removeWatermark === true,
            autoRemoveWatermark: cs.removeWatermark === true,
            upsampleResolution: cs.imageResolution === '2k' ? '2K' : 'Full HD',
            resolution: cs.imageResolution === '2k' ? '2K' : 'Standard',
            quality: cs.imageResolution === '2k' ? '2K' : 'Standard',
            imageResolution: cs.imageResolution,
            upscale2k: cs.imageResolution === '2k',
            accountSelection: isManual ? "manual" : "auto"
          }
        };
      };

      // TRƯỜNG HỢP 1: CẢ CẢNH 1, 2, 3 ĐỀU ĐÃ CÓ ẢNH -> NẠP CẢ 7 CẢNH VỚI ĐỦ MỎ NEO!
      if (hasFrame1Asset && hasFrame2Asset && hasFrame3Asset) {
        const validFrame1Id = await ensureRegisteredAsset(frame1.imageAsset, 'koc_scene_1.jpg');
        const validFrame2Id = await ensureRegisteredAsset(frame2.imageAsset, 'koc_scene_2.jpg');
        const validFrame3Id = await ensureRegisteredAsset(frame3.imageAsset, 'koc_scene_3.jpg');
        toast?.info?.("🚀 Đang sản xuất toàn bộ 7 cảnh với đầy đủ chuỗi mỏ neo Cảnh 1, 2 & 3...");

        const jobs = cs.storyboard.map((frame, idx) => {
          const refs = getFashionSceneReferenceIds(frame.id, validKocId, validOutfitId, validFrame1Id, validFrame2Id, validFrame3Id);
          return helperCreateJob(frame, refs, idx);
        });

        setStoryboard(prev => prev.map(f => ({
          ...f,
          imageStatus: "generating",
          imageProgress: 20,
          imageRunStartTime: now
        })));

        const res = await (qApi.addJobs ? qApi.addJobs(jobs) : Promise.all(jobs.map(j => qApi.addJob(j))));
        try { qApi.resume?.(); } catch(_) {}

        const jobResults = Array.isArray(res) ? res : (res?.results || []);
        setStoryboard(prev => prev.map((f, idx) => ({
          ...f,
          imageJobId: jobResults[idx]?.job?.id || jobResults[idx]?.id || null,
          imageStatus: "generating",
          imageProgress: 20
        })));

        toast?.success?.("Đã nạp chuỗi 7 cảnh ảnh thành công!");
      } else if (hasFrame1Asset && hasFrame2Asset && !hasFrame3Asset) {
        // TRƯỜNG HỢP 2: ĐÃ CÓ CẢNH 1 & 2, CHƯA CÓ CẢNH 3: NẠP CẢNH 3 (REFS: KOC + OUTFIT + CẢNH 2), CẢNH 4-7 CHỜ CẢNH 3
        const validFrame2Id = await ensureRegisteredAsset(frame2.imageAsset, 'koc_scene_2.jpg');
        toast?.info?.("🚀 Đã có Cảnh 1 & 2! Đang nạp Cảnh 3 (Cảnh 4-7 sẽ tự động nạp ngay khi Cảnh 3 xong)...");

        const targetFrame3 = cs.storyboard.find(f => f.id === 3) || cs.storyboard[2];
        const refs3 = getFashionSceneReferenceIds(3, validKocId, validOutfitId, null, validFrame2Id, null);
        const job3 = helperCreateJob(targetFrame3, refs3, 0);

        setStoryboard(prev => prev.map(f => {
          if (f.id === 3) {
            return { ...f, imageAsset: null, imageStatus: "generating", imageProgress: 20, imageRunStartTime: now };
          }
          if (f.id >= 4) {
            return { ...f, imageAsset: null, imageStatus: "waiting_anchor_3", imageProgress: 0, imageRunStartTime: now };
          }
          return f;
        }));

        const res = await (qApi.addJobs ? qApi.addJobs([job3]) : qApi.addJob(job3));
        try { qApi.resume?.(); } catch(_) {}

        const jId = res?.results?.[0]?.job?.id || res?.results?.[0]?.id || res?.id || res?.jobId || null;
        updateFrame(3, { imageJobId: jId, imageStatus: "generating", imageProgress: 20 });
      } else if (hasFrame1Asset && !hasFrame2Asset) {
        // TRƯỜNG HỢP 3: ĐÃ CÓ CẢNH 1, CHƯA CÓ CẢNH 2: NẠP CẢNH 2 (REFS: KOC + OUTFIT + CẢNH 1), CẢNH 3 CHỜ CẢNH 2, CẢNH 4-7 CHỜ CẢNH 3
        const validFrame1Id = await ensureRegisteredAsset(frame1.imageAsset, 'koc_scene_1.jpg');
        toast?.info?.("🚀 Đã có Cảnh 1! Đang nạp Cảnh 2 (Cảnh 3 chờ C2, Cảnh 4-7 chờ C3)...");

        const targetFrame2 = cs.storyboard.find(f => f.id === 2) || cs.storyboard[1];
        const refs2 = getFashionSceneReferenceIds(2, validKocId, validOutfitId, validFrame1Id, null, null);
        const job2 = helperCreateJob(targetFrame2, refs2, 0);

        setStoryboard(prev => prev.map(f => {
          if (f.id === 2) {
            return { ...f, imageAsset: null, imageStatus: "generating", imageProgress: 20, imageRunStartTime: now };
          }
          if (f.id === 3) {
            return { ...f, imageAsset: null, imageStatus: "waiting_anchor_2", imageProgress: 0, imageRunStartTime: now };
          }
          if (f.id >= 4) {
            return { ...f, imageAsset: null, imageStatus: "waiting_anchor_3", imageProgress: 0, imageRunStartTime: now };
          }
          return f;
        }));

        const res = await (qApi.addJobs ? qApi.addJobs([job2]) : qApi.addJob(job2));
        try { qApi.resume?.(); } catch(_) {}

        const jId = res?.results?.[0]?.job?.id || res?.results?.[0]?.id || res?.id || res?.jobId || null;
        updateFrame(2, { imageJobId: jId, imageStatus: "generating", imageProgress: 20 });
      } else {
        // TRƯỜNG HỢP 4: CHƯA CÓ CẢNH 1: TẠO CẢNH 1 TRƯỚC (REFS: 1 KOC GỐC + 1 OUTFIT GỐC), CẢNH 2 CHỜ C1, CẢNH 3 CHỜ C2, CẢNH 4-7 CHỜ C3
        toast?.info?.("⚓ Đang tạo Cảnh 1 làm mỏ neo bối cảnh... Các cảnh sau sẽ tự động nối chuỗi lần lượt!");

        setStoryboard(prev => prev.map(f => {
          if (f.id === 1) {
            return { ...f, imageAsset: null, imageStatus: "generating", imageProgress: 20, imageRunStartTime: now };
          }
          if (f.id === 2) {
            return { ...f, imageAsset: null, imageStatus: "waiting_anchor_1", imageProgress: 0, imageRunStartTime: now };
          }
          if (f.id === 3) {
            return { ...f, imageAsset: null, imageStatus: "waiting_anchor_2", imageProgress: 0, imageRunStartTime: now };
          }
          return { ...f, imageAsset: null, imageStatus: "waiting_anchor_3", imageProgress: 0, imageRunStartTime: now };
        }));

        const targetFrame1 = cs.storyboard.find(f => f.id === 1) || cs.storyboard[0];
        // 🎯 Cảnh 1 chỉ nạp 1 ảnh tham chiếu KOC gốc và 1 ảnh Outfit gốc
        const refs1 = getFashionSceneReferenceIds(1, validKocId, validOutfitId, null, null, null);
        const f1Job = helperCreateJob(targetFrame1, refs1, 0);

        const res = await (qApi.addJobs ? qApi.addJobs([f1Job]) : qApi.addJob(f1Job));
        try { qApi.resume?.(); } catch(_) {}

        const jId = res?.results?.[0]?.job?.id || res?.results?.[0]?.id || res?.id || res?.jobId || null;
        updateFrame(1, { imageJobId: jId, imageStatus: "generating", imageProgress: 25 });
      }
    } catch (err) {
      console.error("Lỗi nạp batch ảnh:", err);
      toast?.error?.("Lỗi nạp ảnh: " + (err?.message || err));
    } finally {
      setIsGeneratingImages(false);
    }
  };

  // 🎯 TỰ ĐỘNG NỐI CHUỖI CẢNH 2 KHI CẢNH 1 VỪA HOÀN THÀNH (REFS: KOC GỐC + OUTFIT GỐC + CẢNH 1)
  const dispatchScenesWaitingAnchor1 = async (frame1Asset) => {
    const cs = stateRef.current;
    const waitingScene = cs.storyboard.find(f => f.id === 2 && (f.imageStatus === "waiting_anchor_1" || f.imageStatus === "waiting_anchor"));
    if (!waitingScene || !frame1Asset) return;

    try {
      const qApi = window.aiforge?.queue || window.aivideo?.queue;
      if (!qApi?.addJobs && !qApi?.addJob) return;

      const validKocId = await ensureRegisteredAsset(cs.koc, 'koc_face.jpg');
      const validOutfitId = await ensureRegisteredAsset(cs.outfit, 'outfit_sample.jpg');
      const validFrame1Id = await ensureRegisteredAsset(frame1Asset, 'koc_scene_1.jpg');

      // 🎯 Cảnh 2 chỉ nạp 1 ảnh KOC gốc, 1 ảnh Outfit gốc và 1 ảnh Cảnh 1
      const refs = getFashionSceneReferenceIds(2, validKocId, validOutfitId, validFrame1Id, null, null);

      const isAutoBanana = !selectedBananaAccountId || selectedBananaAccountId === 'auto';
      let activeBananaAccs = accounts.filter(a => (a.providerId === 'banana' || a.provider === 'Banana') && (a.authStatus === 'Logged In' || a.authStatus === 'active' || !a.disabled));
      if (activeBananaAccs.length === 0) activeBananaAccs = accounts.filter(a => a.providerId === 'banana' || a.provider === 'Banana');
      let curAcc = !isAutoBanana ? accounts.find(a => a.accountId === selectedBananaAccountId) : (activeBananaAccs.length > 0 ? activeBananaAccs[0] : undefined);
      const isManual = !isAutoBanana && !!curAcc;

      const targetAccId = curAcc?.accountId || undefined;
      const targetAccName = curAcc?.accountDisplayName || curAcc?.accountEmail || curAcc?.accountName || undefined;
      const finalPrompt = buildSceneImagePrompt(waitingScene.imagePrompt, cs.creativeDirection, cs.technicalStyle);

      const job = {
        title: \`[KOC Thời Trang] Storyboard Cảnh 2\`,
        type: "Image",
        providerId: imageEngine === "muse" ? "muse" : "banana",
        provider: imageEngine === "muse" ? "Muse AI" : "Banana",
        autoRemoveWatermark: cs.removeWatermark === true,
        removeWatermark: cs.removeWatermark === true,
        ...(targetAccId ? { accountId: targetAccId, account: targetAccName } : {}),
        payload: {
          title: \`[KOC Thời Trang] Storyboard Cảnh 2\`,
          prompt: finalPrompt,
          ratio: "9:16",
          aspectRatio: "9:16",
          referenceAssetIds: refs,
          model: imageEngine === "muse" ? "muse-image" : "banana",
          modelDisplayName: "🍌 Nano Banana Pro",
          studioSource: "video-factory",
          removeWatermark: cs.removeWatermark === true,
          autoRemoveWatermark: cs.removeWatermark === true,
          upsampleResolution: cs.imageResolution === '2k' ? '2K' : 'Full HD',
          resolution: cs.imageResolution === '2k' ? '2K' : 'Standard',
          quality: cs.imageResolution === '2k' ? '2K' : 'Standard',
          imageResolution: cs.imageResolution,
          upscale2k: cs.imageResolution === '2k',
          accountSelection: isManual ? "manual" : "auto"
        }
      };

      const now = Date.now();
      updateFrame(2, { imageStatus: "generating", imageProgress: 20, imageRunStartTime: now });

      const res = await (qApi.addJobs ? qApi.addJobs([job]) : qApi.addJob(job));
      try { qApi.resume?.(); } catch(_) {}

      const jId = res?.results?.[0]?.job?.id || res?.results?.[0]?.id || res?.id || res?.jobId || null;
      updateFrame(2, { imageJobId: jId, imageStatus: "generating", imageProgress: 20 });

      toast?.success?.("⚓ Cảnh 1 đã có mỏ neo! Đang tự động nạp Cảnh 02...");
    } catch (err) {
      console.error("Lỗi dispatch scenes anchor 1:", err);
    }
  };

  // 🎯 TỰ ĐỘNG NỐI CHUỖI CẢNH 3 KHI CẢNH 2 VỪA HOÀN THÀNH (REFS: KOC GỐC + OUTFIT GỐC + CẢNH 2)
  const dispatchScenesWaitingAnchor2 = async (frame2Asset) => {
    const cs = stateRef.current;
    const waitingScene = cs.storyboard.find(f => f.id === 3 && (f.imageStatus === "waiting_anchor_2" || f.imageStatus === "waiting_anchor"));
    if (!waitingScene || !frame2Asset) return;

    try {
      const qApi = window.aiforge?.queue || window.aivideo?.queue;
      if (!qApi?.addJobs && !qApi?.addJob) return;

      const validKocId = await ensureRegisteredAsset(cs.koc, 'koc_face.jpg');
      const validOutfitId = await ensureRegisteredAsset(cs.outfit, 'outfit_sample.jpg');
      const validFrame2Id = await ensureRegisteredAsset(frame2Asset, 'koc_scene_2.jpg');

      // 🎯 Cảnh 3 chỉ nạp 1 ảnh KOC gốc, 1 ảnh Outfit gốc và 1 ảnh Cảnh 2
      const refs = getFashionSceneReferenceIds(3, validKocId, validOutfitId, null, validFrame2Id, null);

      const isAutoBanana = !selectedBananaAccountId || selectedBananaAccountId === 'auto';
      let activeBananaAccs = accounts.filter(a => (a.providerId === 'banana' || a.provider === 'Banana') && (a.authStatus === 'Logged In' || a.authStatus === 'active' || !a.disabled));
      if (activeBananaAccs.length === 0) activeBananaAccs = accounts.filter(a => a.providerId === 'banana' || a.provider === 'Banana');
      let curAcc = !isAutoBanana ? accounts.find(a => a.accountId === selectedBananaAccountId) : (activeBananaAccs.length > 0 ? activeBananaAccs[0] : undefined);
      const isManual = !isAutoBanana && !!curAcc;

      const targetAccId = curAcc?.accountId || undefined;
      const targetAccName = curAcc?.accountDisplayName || curAcc?.accountEmail || curAcc?.accountName || undefined;
      const finalPrompt = buildSceneImagePrompt(waitingScene.imagePrompt, cs.creativeDirection, cs.technicalStyle);

      const job = {
        title: \`[KOC Thời Trang] Storyboard Cảnh 3\`,
        type: "Image",
        providerId: imageEngine === "muse" ? "muse" : "banana",
        provider: imageEngine === "muse" ? "Muse AI" : "Banana",
        autoRemoveWatermark: cs.removeWatermark === true,
        removeWatermark: cs.removeWatermark === true,
        ...(targetAccId ? { accountId: targetAccId, account: targetAccName } : {}),
        payload: {
          title: \`[KOC Thời Trang] Storyboard Cảnh 3\`,
          prompt: finalPrompt,
          ratio: "9:16",
          aspectRatio: "9:16",
          referenceAssetIds: refs,
          model: imageEngine === "muse" ? "muse-image" : "banana",
          modelDisplayName: "🍌 Nano Banana Pro",
          studioSource: "video-factory",
          removeWatermark: cs.removeWatermark === true,
          autoRemoveWatermark: cs.removeWatermark === true,
          upsampleResolution: cs.imageResolution === '2k' ? '2K' : 'Full HD',
          resolution: cs.imageResolution === '2k' ? '2K' : 'Standard',
          quality: cs.imageResolution === '2k' ? '2K' : 'Standard',
          imageResolution: cs.imageResolution,
          upscale2k: cs.imageResolution === '2k',
          accountSelection: isManual ? "manual" : "auto"
        }
      };

      const now = Date.now();
      updateFrame(3, { imageStatus: "generating", imageProgress: 20, imageRunStartTime: now });

      const res = await (qApi.addJobs ? qApi.addJobs([job]) : qApi.addJob(job));
      try { qApi.resume?.(); } catch(_) {}

      const jId = res?.results?.[0]?.job?.id || res?.results?.[0]?.id || res?.id || res?.jobId || null;
      updateFrame(3, { imageJobId: jId, imageStatus: "generating", imageProgress: 20 });

      toast?.success?.("🎬 Cảnh 2 đã có mỏ neo! Đang tự động nạp Cảnh 03...");
    } catch (err) {
      console.error("Lỗi dispatch scenes anchor 2:", err);
    }
  };

  // 🎯 TỰ ĐỘNG NỐI CHUỖI CẢNH 4, 5, 6, 7 KHI CẢNH 3 VỪA HOÀN THÀNH (REFS: KOC GỐC + OUTFIT GỐC + CẢNH 3 + CẢNH 1)
  const dispatchScenesWaitingAnchor3 = async (frame3Asset) => {
    const cs = stateRef.current;
    const waitingScenes = cs.storyboard.filter(f => f.id >= 4 && (f.imageStatus === "waiting_anchor_3" || f.imageStatus === "waiting_anchor"));
    if (waitingScenes.length === 0 || !frame3Asset) return;

    try {
      const qApi = window.aiforge?.queue || window.aivideo?.queue;
      if (!qApi?.addJobs && !qApi?.addJob) return;

      const validKocId = await ensureRegisteredAsset(cs.koc, 'koc_face.jpg');
      const validOutfitId = await ensureRegisteredAsset(cs.outfit, 'outfit_sample.jpg');
      
      const frame1 = cs.storyboard.find(f => f.id === 1);
      const validFrame1Id = frame1?.imageAsset ? await ensureRegisteredAsset(frame1.imageAsset, 'koc_scene_1.jpg') : null;
      const validFrame3Id = await ensureRegisteredAsset(frame3Asset, 'koc_scene_3.jpg');

      // 🎯 Cảnh 4..7 chỉ nạp 1 ảnh KOC gốc, 1 ảnh Outfit gốc, 1 ảnh Cảnh 3 và 1 ảnh Cảnh 1
      const refs = getFashionSceneReferenceIds(4, validKocId, validOutfitId, validFrame1Id, null, validFrame3Id);

      const isAutoBanana = !selectedBananaAccountId || selectedBananaAccountId === 'auto';
      let activeBananaAccs = accounts.filter(a => (a.providerId === 'banana' || a.provider === 'Banana') && (a.authStatus === 'Logged In' || a.authStatus === 'active' || !a.disabled));
      if (activeBananaAccs.length === 0) activeBananaAccs = accounts.filter(a => a.providerId === 'banana' || a.provider === 'Banana');
      let manualBananaAcc = !isAutoBanana ? accounts.find(a => a.accountId === selectedBananaAccountId) : undefined;

      const jobs = waitingScenes.map((frame, idx) => {
        let curAcc = undefined;
        let isManual = false;
        if (manualBananaAcc) {
          curAcc = manualBananaAcc;
          isManual = true;
        } else if (activeBananaAccs.length > 0) {
          curAcc = activeBananaAccs[idx % activeBananaAccs.length];
          isManual = false;
        }
        const targetAccId = curAcc?.accountId || undefined;
        const targetAccName = curAcc?.accountDisplayName || curAcc?.accountEmail || curAcc?.accountName || undefined;
        const finalPrompt = buildSceneImagePrompt(frame.imagePrompt, cs.creativeDirection, cs.technicalStyle);
        return {
          title: \`[KOC Thời Trang] Storyboard Cảnh \${frame.id}\`,
          type: "Image",
          providerId: imageEngine === "muse" ? "muse" : "banana",
          provider: imageEngine === "muse" ? "Muse AI" : "Banana",
          autoRemoveWatermark: cs.removeWatermark === true,
          removeWatermark: cs.removeWatermark === true,
          ...(targetAccId ? { accountId: targetAccId } : {}),
          payload: {
            title: \`[KOC Thời Trang] Storyboard Cảnh \${frame.id}\`,
            prompt: finalPrompt,
            ratio: "9:16",
            aspectRatio: "9:16",
            referenceAssetIds: refs,
            model: imageEngine === "muse" ? "muse-image" : "banana",
            modelDisplayName: "🍌 Nano Banana Pro",
            studioSource: "video-factory",
            removeWatermark: cs.removeWatermark === true,
            autoRemoveWatermark: cs.removeWatermark === true,
            upsampleResolution: cs.imageResolution === '2k' ? '2K' : 'Full HD',
            resolution: cs.imageResolution === '2k' ? '2K' : 'Standard',
            quality: cs.imageResolution === '2k' ? '2K' : 'Standard',
            imageResolution: cs.imageResolution,
            upscale2k: cs.imageResolution === '2k',
            accountSelection: isManual ? "manual" : "auto"
          }
        };
      });

      const now = Date.now();
      setStoryboard(prev => prev.map(f => f.id >= 4 && (f.imageStatus === "waiting_anchor_3" || f.imageStatus === "waiting_anchor") ? {
        ...f,
        imageStatus: "generating",
        imageProgress: 20,
        imageRunStartTime: now
      } : f));

      const res = await (qApi.addJobs ? qApi.addJobs(jobs) : Promise.all(jobs.map(j => qApi.addJob(j))));
      try { qApi.resume?.(); } catch(_) {}

      const jobResults = Array.isArray(res) ? res : (res?.results || []);
      setStoryboard(prev => prev.map(f => {
        const idxInWaiting = waitingScenes.findIndex(ws => ws.id === f.id);
        if (idxInWaiting !== -1) {
          const jId = jobResults[idxInWaiting]?.job?.id || jobResults[idxInWaiting]?.id || null;
          return { ...f, imageJobId: jId, imageStatus: "generating", imageProgress: 20 };
        }
        return f;
      }));

      toast?.success?.("👗 Cảnh 3 đã có mỏ neo! Đang tự động nạp Cảnh 04, 05, 06, 07...");
    } catch (err) {
      console.error("Lỗi dispatch scenes anchor 3:", err);
    }
  };
`;

content = content.slice(0, startIdx) + newBatchAndDispatchBlock + content.slice(endIdx);
console.log('✓ Replaced generateAllImages & anchor dispatch block');

// 5. Update UI waiting badges for anchor 2
const oldBadgeSnippet = `: f.imageStatus === "waiting_anchor_3" ? React.createElement("div", { className: "flex flex-col items-center justify-center gap-2 select-none text-center px-2" },
                      React.createElement("span", { className: "text-4xl text-rose-400 animate-pulse" }, "👗"),
                      React.createElement("span", { className: "text-[11px] font-bold text-rose-300 uppercase tracking-wider" }, "Chờ mỏ neo Cảnh 3"),
                      React.createElement("span", { className: "text-[9px] text-gray-400" }, "Tự động tạo khi KOC mặc váy")
                    )`;

const newBadgeSnippet = `: f.imageStatus === "waiting_anchor_2" ? React.createElement("div", { className: "flex flex-col items-center justify-center gap-2 select-none text-center px-2" },
                      React.createElement("span", { className: "text-4xl text-cyan-400 animate-pulse" }, "🎬"),
                      React.createElement("span", { className: "text-[11px] font-bold text-cyan-300 uppercase tracking-wider" }, "Chờ mỏ neo Cảnh 2"),
                      React.createElement("span", { className: "text-[9px] text-gray-400" }, "Tự động tạo khi Cảnh 2 xong")
                    )
                  : f.imageStatus === "waiting_anchor_3" ? React.createElement("div", { className: "flex flex-col items-center justify-center gap-2 select-none text-center px-2" },
                      React.createElement("span", { className: "text-4xl text-rose-400 animate-pulse" }, "👗"),
                      React.createElement("span", { className: "text-[11px] font-bold text-rose-300 uppercase tracking-wider" }, "Chờ mỏ neo Cảnh 3"),
                      React.createElement("span", { className: "text-[9px] text-gray-400" }, "Tự động tạo khi Cảnh 3 xong")
                    )`;

if (content.includes(oldBadgeSnippet)) {
  content = content.replace(oldBadgeSnippet, newBadgeSnippet);
  console.log('✓ Updated UI waiting badges for anchor 2 & 3');
} else {
  console.log('oldBadgeSnippet not found or already updated');
}

fs.writeFileSync(targetFile, content, 'utf8');
console.log('Successfully written updated VideoFactoryStudio.js. Final length:', content.length);
