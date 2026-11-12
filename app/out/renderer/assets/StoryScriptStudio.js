import { bn as React, bf as toast } from "./index-BS7vgKVV.js";

// ============================================================================
// STUDIO KỊCH BẢN PHIM (ĐA DỰ ÁN ĐỘC LẬP - MULTI-PROJECT STORY SCRIPT STUDIO)
// Quản lý từng dự án phim độc lập - Tự động nối frame cuối - Tạo phim dài
// ============================================================================

const STORAGE_KEY = "aiforge_story_script_projects_v2";

function generateId(prefix = "proj") {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
}

// Lọc danh sách session Browser Hub theo loại provider (muse / veo3 / grok)
function filterAccountsByProvider(sessions, providerKey) {
  const list = Array.isArray(sessions) ? sessions : [];
  if (providerKey === "muse") {
    return list.filter(s => (s.providerId && s.providerId.includes("muse")) || (s.startUrl && s.startUrl.includes("muse.ai")) || (s.provider && s.provider.toLowerCase().includes("muse")));
  }
  if (providerKey === "grok") {
    return list.filter(s => s.providerId === "grok" || (s.startUrl && s.startUrl.includes("x.com")));
  }
  return list.filter(s => s.providerId === "veo3" || (s.startUrl && s.startUrl.includes("google")));
}
function providerKeyOf(providerLabel) {
  const p = (providerLabel || "").toLowerCase();
  if (p.includes("muse")) return "muse";
  if (p.includes("grok")) return "grok";
  return "veo3";
}

function createDefaultProject(index = 1) {
  return {
    id: generateId("proj"),
    name: `Dự Án Kịch Bản ${index}`,
    createdAt: new Date().toISOString(),
    prompts: [
      {
        id: generateId("sc"),
        index: 1,
        prompt: "Một chú mèo lông trắng dễ thương đang ngồi sưởi nắng bên bậu cửa sổ, ánh nắng vàng chiếu lung linh qua rèm cửa.",
        provider: "Muse AI",
        model: "muse-video",
        ratio: "16:9",
        duration: "10s",
        account: "Auto",
        referenceAssetIds: [],
        refImageUrl: "",
        refImageUrls: [],
        status: "Pending",
        progress: 0,
        videoUrl: "",
        assetId: null,
        jobId: null
      },
      {
        id: generateId("sc"),
        index: 2,
        prompt: "Chú mèo đứng dậy vươn vai lười biếng, bước chậm rãi đến đĩa thức ăn bên cạnh và bắt đầu ăn ngon lành.",
        provider: "Muse AI",
        model: "muse-video",
        ratio: "16:9",
        duration: "10s",
        account: "Auto",
        referenceAssetIds: [],
        refImageUrl: "",
        refImageUrls: [],
        status: "Pending",
        progress: 0,
        videoUrl: "",
        assetId: null,
        jobId: null
      }
    ],
    completedVideos: [],
    completedMovie: null,
    isRunning: false,
    activeSceneIndex: 0,
    progressText: "",
    autoMerge: true,
    autoDownload: true,
    waitAllBeforeMerge: false,
    transition: "fade",
    saveDirectory: "",
    // Tài khoản được gán riêng cho dự án này, theo từng loại provider.
    // "auto" nghĩa là để hệ thống tự chọn tài khoản khả dụng đầu tiên như trước.
    accountSelections: { muse: "auto", veo3: "auto", grok: "auto" }
  };
}

// ============================================================================
// STORE MODULE-LEVEL — sống độc lập với vòng đời component React.
// Dây chuyền chạy dự án (runStoryProjectCore) đọc/ghi thẳng vào đây nên dù
// người dùng chuyển sang Studio/Tab khác (component StoryScriptStudio unmount),
// tiến trình tạo video vẫn tiếp tục chạy ngầm không gián đoạn.
// ============================================================================
const StoryStore = (() => {
  function loadInitial() {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          // Chỉ reset các job "Running" dở dang từ phiên trước (app vừa khởi động lại)
          const loadedProjects = parsed.map(p => ({
            ...p,
            isRunning: false,
            isMerging: false,
            progressText: "",
            waitAllBeforeMerge: p.waitAllBeforeMerge ?? false,
            accountSelections: { muse: "auto", veo3: "auto", grok: "auto", ...(p.accountSelections || {}) },
            prompts: (p.prompts || []).map(s => s.status === "Running" ? { ...s, status: "Pending", progress: 0 } : s)
          }));
          return { projects: loadedProjects, activeProjectId: loadedProjects[0]?.id || "" };
        }
      }
    } catch (_) {}
    const def = [createDefaultProject(1)];
    return { projects: def, activeProjectId: def[0].id };
  }

  let state = loadInitial();
  const listeners = new Set();

  function persist() {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state.projects)); } catch (_) {}
  }

  function notify() {
    listeners.forEach(fn => { try { fn(state); } catch (_) {} });
  }

  function getState() { return state; }

  function setProjects(updater) {
    const nextProjects = typeof updater === "function" ? updater(state.projects) : updater;
    state = { ...state, projects: nextProjects };
    persist();
    notify();
  }

  function setActiveProjectId(id) {
    state = { ...state, activeProjectId: id };
    notify();
  }

  function updateProject(projId, updater) {
    setProjects(prev => prev.map(p => {
      if (p.id !== projId) return p;
      return typeof updater === "function" ? updater(p) : { ...p, ...updater };
    }));
  }

  function subscribe(fn) {
    listeners.add(fn);
    return () => listeners.delete(fn);
  }

  return { getState, setProjects, setActiveProjectId, updateProject, subscribe };
})();

// Theo dõi dự án đang chạy — Set module-level, không bị reset khi component unmount/remount
const runningProjects = new Set();
// Dây chuyền còn "sống" (kể cả lúc đang dừng dần), cảnh cần chạy lại sau khi dừng, job đang chạy, dự án đang ghép
const storyLoopAlive = new Set();
const storyPendingRestart = new Map();
const storyActiveJob = new Map();
const storyMerging = new Set();
// Dự án được yêu cầu tạm dừng: cảnh đang tạo vẫn chạy xong, dây chuyền dừng trước cảnh kế tiếp
const storyPauseRequested = new Set();
const STORY_RESTART_FROM_START = "__from_start__";
const STORY_RESET_ONLY = "__reset_only__";

// Tạm dừng: không hủy cảnh đang tạo, chỉ không gửi cảnh kế tiếp → sửa / thêm prompt thoải mái
function pauseStoryProject(projId) {
  if (!storyLoopAlive.has(projId)) return;
  storyPauseRequested.add(projId);
  StoryStore.updateProject(projId, { isPaused: true });
  toast.info("⏸️ Đã tạm dừng: cảnh đang tạo sẽ chạy xong rồi dừng. Sửa / thêm prompt xong bấm \"Tiếp tục\".");
}

// Tiếp tục: nhận thông tin mới nhất của các cảnh chưa tạo rồi chạy tiếp, nối frame cuối cảnh trước
function resumeStoryProject(projId) {
  const proj = StoryStore.getState().projects.find(p => p.id === projId);
  if (!proj) return;
  if (storyLoopAlive.has(projId)) {
    // Cảnh cũ chưa xong → bỏ lệnh dừng, dây chuyền chạy tiếp bình thường
    storyPauseRequested.delete(projId);
    StoryStore.updateProject(projId, { isPaused: false });
    toast.info("▶️ Tiếp tục dây chuyền.");
    return;
  }
  const live = getLiveScenes(projId);
  const at = live.find(s => s.id === proj.pausedAtSceneId && s.status !== "Completed")
    || live.find(s => s.status !== "Completed");
  if (!at) {
    StoryStore.updateProject(projId, { isPaused: false, pausedAtSceneId: null });
    toast.info("Tất cả cảnh đã tạo xong — không còn cảnh nào để tiếp tục.");
    return;
  }
  runStoryProjectCore(projId, { resumeFromSceneId: at.id, continueMode: true });
}

// Đặt lại: dừng dây chuyền, xóa hết video của dự án (giữ prompt, ảnh tham chiếu, cài đặt). KHÔNG tự chạy — bấm TẠO VIDEO khi muốn
function resetStoryProject(projId) {
  const proj = StoryStore.getState().projects.find(p => p.id === projId);
  if (!proj) return;
  const vidCount = (proj.completedVideos || []).length;
  if (!window.confirm(`Đặt lại dự án "${proj.name}": dừng dây chuyền và xóa ${vidCount} video đã tạo khỏi dự án (prompt, ảnh tham chiếu và cài đặt giữ nguyên)?`)) return;
  const now = Date.now();
  storyPauseRequested.delete(projId);
  StoryStore.updateProject(projId, p => ({
    ...p,
    isPaused: false,
    pausedAtSceneId: null,
    completedMovie: null,
    completedVideos: [],
    chainFrameAssetId: null,
    chainFrameUrl: "",
    sceneResetAt: { ...(p.sceneResetAt || {}), ...Object.fromEntries((p.prompts || []).map(s => [s.index, now])) },
    prompts: (p.prompts || []).map(s => ({
      ...s, status: "Pending", progress: 0, videoUrl: "", assetId: null, error: "",
      lastExtractedFrameUrl: "", lastExtractedFrameAssetId: null
    }))
  }));
  if (storyLoopAlive.has(projId)) {
    storyPendingRestart.set(projId, STORY_RESET_ONLY);
    runningProjects.delete(projId);
    const activeJobId = storyActiveJob.get(projId);
    const queueApi = window.aiforge?.queue || window.aivideo?.queue;
    if (activeJobId) {
      Promise.resolve(queueApi?.cancelJobs?.([activeJobId])).catch(err => console.warn("Không hủy được job cũ:", err));
    }
    toast.info("🔁 Đã đặt lại dự án — đang dừng dây chuyền. Bấm \"TẠO VIDEO KỊCH BẢN\" khi muốn chạy lại.");
  } else {
    StoryStore.updateProject(projId, { isRunning: false, progressText: "" });
    toast.info("🔁 Đã đặt lại dự án. Bấm \"TẠO VIDEO KỊCH BẢN\" khi muốn chạy lại.");
  }
}

// Danh sách cảnh có prompt, đọc MỚI từ store (prompt thêm trong lúc chạy vẫn được nối vào dây chuyền)
function getLiveScenes(projId) {
  const p = StoryStore.getState().projects.find(x => x.id === projId);
  return (p?.prompts || []).filter(s => s.prompt && s.prompt.trim().length > 0);
}

// Tạo lại từ 1 cảnh: xóa video từ cảnh đó trở xuống khỏi dự án (giữ prompt), rồi chạy lại từ frame cuối cảnh liền trước
function regenerateStoryScene(projId, sceneId) {
  const proj = StoryStore.getState().projects.find(p => p.id === projId);
  if (!proj) return;
  const k = proj.prompts.findIndex(s => s.id === sceneId);
  if (k < 0) return;
  const tail = proj.prompts.slice(k);
  const tailIdx = new Set(tail.map(s => s.index));
  const vidsBelow = (proj.completedVideos || []).filter(v => tailIdx.has(v.sceneNum)).length;
  if (vidsBelow > 0 && !window.confirm(`Tạo lại Cảnh ${proj.prompts[k].index}: xóa ${vidsBelow} video từ Cảnh ${proj.prompts[k].index} trở xuống khỏi dự án (prompt giữ nguyên) rồi chạy lại từ đây?`)) return;

  const now = Date.now();
  StoryStore.updateProject(projId, p => ({
    ...p,
    completedMovie: null,
    completedVideos: (p.completedVideos || []).filter(v => !tailIdx.has(v.sceneNum)),
    sceneResetAt: { ...(p.sceneResetAt || {}), ...Object.fromEntries([...tailIdx].map(i => [i, now])) },
    prompts: p.prompts.map((s, j) => j < k ? s : {
      ...s, status: "Pending", progress: 0, videoUrl: "", assetId: null, error: "",
      ...(j > k ? { lastExtractedFrameUrl: "", lastExtractedFrameAssetId: null } : {})
    })
  }));

  if (storyLoopAlive.has(projId)) {
    // Đang chạy: dừng dây chuyền hiện tại, hủy job đang tạo, chạy lại từ cảnh sớm nhất được yêu cầu
    const cur = storyPendingRestart.get(projId);
    const curPos = cur ? proj.prompts.findIndex(s => s.id === cur) : -1;
    if (curPos < 0 || k < curPos) storyPendingRestart.set(projId, sceneId);
    runningProjects.delete(projId);
    const activeJobId = storyActiveJob.get(projId);
    const queueApi = window.aiforge?.queue || window.aivideo?.queue;
    if (activeJobId) {
      Promise.resolve(queueApi?.cancelJobs?.([activeJobId])).catch(err => console.warn("Không hủy được job cũ:", err));
    }
    toast.info(`🔄 Đang dừng dây chuyền để tạo lại từ Cảnh ${proj.prompts[k].index}...`);
  } else {
    runStoryProjectCore(projId, { resumeFromSceneId: sceneId });
  }
}

// Ghép phim bằng tay: ghép video đã xong của đúng dự án này, theo thứ tự cảnh
async function mergeStoryProject(projId) {
  const updateProject = StoryStore.updateProject;
  const proj = StoryStore.getState().projects.find(p => p.id === projId);
  if (!proj) return;
  if (storyMerging.has(projId)) { toast.info("Dự án này đang ghép phim, vui lòng chờ..."); return; }

  const byScene = new Map();
  [...(proj.completedVideos || [])]
    .sort((a, b) => String(a.createdAt || "").localeCompare(String(b.createdAt || "")))
    .forEach(v => { if (v && v.id) byScene.set(v.sceneNum, v); });
  const vids = [...byScene.values()].sort((a, b) => a.sceneNum - b.sceneNum);
  if (vids.length < 2) { toast.warning("Cần ít nhất 2 video hoàn tất để ghép phim!"); return; }

  const assetsApi = window.aiforge?.assets || window.aivideo?.assets;
  storyMerging.add(projId);
  updateProject(projId, { isMerging: true });
  toast.info(`🎞️ [${proj.name}] Đang ghép ${vids.length} phân cảnh thành phim dài...`);
  try {
    const videoIdsToMerge = vids.map(v => v.id);
    const safeName = `Phim_${proj.name.replace(/\s+/g, "_")}_${Date.now()}.mp4`;
    const opts = {
      name: safeName,
      outputAspect: proj.prompts[0]?.ratio || "16:9",
      exportDirectory: proj.saveDirectory || "",
      waitAllBeforeMerge: proj.waitAllBeforeMerge ?? false
    };
    let mergedRes = null;
    if (assetsApi?.editAndMergeVideos) {
      mergedRes = await assetsApi.editAndMergeVideos(videoIdsToMerge.map(id => ({ assetId: id, startTime: 0 })), proj.transition || "fade", opts);
    } else if (assetsApi?.mergeVideos) {
      mergedRes = await assetsApi.mergeVideos(videoIdsToMerge, proj.transition || "fade", opts);
    } else {
      throw new Error("Không tìm thấy chức năng ghép video");
    }
    if (!mergedRes) throw new Error("Ghép phim không trả về kết quả");
    updateProject(projId, p => ({
      ...p,
      completedMovie: {
        id: mergedRes.id,
        name: safeName,
        videoUrl: mergedRes.url || mergedRes.videoUrl || "",
        localPath: mergedRes.localPath || "",
        duration: mergedRes.duration || "N/A"
      }
    }));
    toast.success(`🎬 [${proj.name}] Ghép phim hoàn chỉnh thành công!`);
  } catch (mErr) {
    console.error("Lỗi ghép phim:", mErr);
    toast.error("Lỗi ghép phim: " + (mErr?.message || mErr));
  } finally {
    storyMerging.delete(projId);
    updateProject(projId, { isMerging: false });
  }
}

// ==========================================================================
// DÂY CHUYỀN CHẠY DỰ ÁN — module-level, KHÔNG phụ thuộc component đang mount.
// Hỗ trợ options.resumeFromSceneId: tạo lại đúng 1 cảnh bị lỗi rồi tự động
// tiếp tục dây chuyền các cảnh phía sau (nối frame cuối, chạy tiếp, ghép phim).
// Quy tắc nối tiếp cảnh chuẩn:
// - Cảnh 1: Có ảnh -> dùng ảnh. Không ảnh -> Text to Video.
// - Cảnh 2+: Có ảnh tham chiếu riêng -> [Frame cuối cảnh trước + Ảnh tham chiếu].
//            Trống ảnh tham chiếu -> [Frame cuối cảnh trước].
// ==========================================================================
async function runStoryProjectCore(projId, options = {}) {
  const { resumeFromSceneId = null, continueMode = false } = options;
  const updateProject = StoryStore.updateProject;
  const runningRef = { current: runningProjects };

  const proj = StoryStore.getState().projects.find(p => p.id === projId);
  if (!proj) return;

  if (runningRef.current.has(projId)) {
    toast.warning(`Dự án "${proj.name}" đang trong tiến trình chạy!`);
    return;
  }

  const validPrompts = proj.prompts.filter(p => p.prompt && p.prompt.trim().length > 0);
  if (validPrompts.length === 0) {
    toast.warning("Dự án chưa có nội dung prompt nào!");
    return;
  }

  let startIndex = 0;
  if (resumeFromSceneId) {
    const idx = validPrompts.findIndex(s => s.id === resumeFromSceneId);
    if (idx >= 0) startIndex = idx;
  }

  runningRef.current.add(projId);
  storyLoopAlive.add(projId);
  storyPauseRequested.delete(projId);
  updateProject(projId, p => ({
    ...p,
    isRunning: true,
    isPaused: false,
    pausedAtSceneId: null,
    progressText: continueMode ? "Đang tiếp tục dây chuyền..." : (resumeFromSceneId ? "Đang tạo lại cảnh lỗi..." : "Khởi tạo dây chuyền..."),
    prompts: resumeFromSceneId
      ? p.prompts.map(s => s.id === resumeFromSceneId ? { ...s, status: "Running", progress: 10, error: "" } : s)
      : p.prompts
  }));
  toast.info(continueMode
    ? `▶️ [${proj.name}] Tiếp tục dây chuyền từ Cảnh ${validPrompts[startIndex]?.index} với thông tin mới nhất...`
    : resumeFromSceneId
    ? `🔄 [${proj.name}] Đang tạo lại Cảnh ${validPrompts[startIndex]?.index}, dây chuyền sẽ tự động tiếp tục...`
    : `🎬 [${proj.name}] Bắt đầu chạy Chuỗi Kịch Bản (${validPrompts.length} cảnh)...`);

  const assetsApi = window.aiforge?.assets || window.aivideo?.assets;
  const queueApi = window.aiforge?.queue || window.aivideo?.queue;

  // Nạp danh sách sessions từ Browser Hub để lấy đúng tài khoản cho chuỗi
  let chainMuseAccount = null;
  let chainVeoAccount = null;
  let chainGrokAccount = null;

  try {
    const liveSessions = (await window.aiforge?.browser?.listSessions?.()) ||
                         (await window.aivideo?.browser?.listSessions?.()) || [];
    const validSessions = Array.isArray(liveSessions) ? liveSessions.filter(s => !s.disabled) : [];
    const sel = proj.accountSelections || {};

    const museAccounts = filterAccountsByProvider(validSessions, "muse");
    const veoAccounts = filterAccountsByProvider(validSessions, "veo3");
    const grokAccounts = filterAccountsByProvider(validSessions, "grok");

    // Nếu dự án đã được gán tài khoản cụ thể, luôn ưu tiên dùng đúng tài khoản đó
    // (để dễ chia việc & dễ kiểm tra lại đúng account đã tạo ra video của dự án này).
    // Nếu để "auto" hoặc tài khoản đã gán không còn khả dụng -> rơi về tài khoản đầu tiên như cũ.
    chainMuseAccount = (sel.muse && sel.muse !== "auto" && museAccounts.find(s => s.accountId === sel.muse)) || museAccounts[0] || null;
    chainVeoAccount = (sel.veo3 && sel.veo3 !== "auto" && veoAccounts.find(s => s.accountId === sel.veo3)) || veoAccounts[0] || null;
    chainGrokAccount = (sel.grok && sel.grok !== "auto" && grokAccounts.find(s => s.accountId === sel.grok)) || grokAccounts[0] || null;
  } catch (_) {}

  const newCompletedVideos = [];

  try {
    // Tạo lại giữa chừng: lấy frame cuối của ĐÚNG cảnh liền trước (trích lại từ video cảnh đó),
    // dự phòng frame đã lưu trên cảnh, rồi mới tới frame nối gần nhất của dự án (cách cũ).
    let lastExtractedFrameAsset = null;
    if (startIndex > 0) {
      const targetScene = validPrompts[startIndex];
      const prevScene = validPrompts[startIndex - 1];
      if (prevScene?.assetId) {
        try {
          updateProject(projId, { progressText: `Đang lấy frame cuối Cảnh ${prevScene.index}...` });
          const ex = await assetsApi?.extractLastFrame?.({ assetId: prevScene.assetId, promptOrder: prevScene.index });
          if (ex?.id) lastExtractedFrameAsset = ex;
        } catch (fErr) {
          console.warn("Không trích lại được frame cảnh trước:", fErr);
        }
      }
      if (!lastExtractedFrameAsset && targetScene?.lastExtractedFrameAssetId) {
        lastExtractedFrameAsset = { id: targetScene.lastExtractedFrameAssetId, url: targetScene.lastExtractedFrameUrl || "" };
      }
      if (!lastExtractedFrameAsset && proj.chainFrameAssetId) {
        lastExtractedFrameAsset = { id: proj.chainFrameAssetId, url: proj.chainFrameUrl };
      }
      if (!lastExtractedFrameAsset) {
        toast.warning(`Không lấy được frame cuối Cảnh ${prevScene?.index} — Cảnh ${targetScene?.index} sẽ chạy với ảnh tham chiếu riêng.`);
      }
    }

    // Đi theo id cảnh, đọc danh sách MỚI mỗi lượt → prompt thêm trong lúc chạy được nối tiếp vào dây chuyền
    let curSceneId = validPrompts[startIndex]?.id || null;
    let doneCount = 0;
    let pausedAtId = null;
    while (curSceneId) {
      if (!runningRef.current.has(projId)) {
        throw new Error("Người dùng đã dừng tiến trình chạy kịch bản.");
      }
      if (storyPauseRequested.has(projId)) { pausedAtId = curSceneId; break; }

      const liveList = getLiveScenes(projId);
      const i = liveList.findIndex(s => s.id === curSceneId);
      if (i < 0) break;
      const curScene = liveList[i];
      const sceneNum = curScene.index || (i + 1);

      updateProject(projId, p => ({
        ...p,
        activeSceneIndex: sceneNum,
        progressText: `Đang render Cảnh ${sceneNum}/${liveList.length}...`,
        prompts: p.prompts.map(s => s.id === curScene.id ? { ...s, status: "Running", progress: 10, error: "" } : s)
      }));

      toast.info(`⚡ [${proj.name}] Bắt đầu Cảnh ${sceneNum}: "${curScene.prompt.slice(0, 35)}..."`);

      // ====================================================================
      // QUY TẮC NỐI TIẾP CẢNH THÔNG MINH CỦA TRIS:
      // Cảnh 1: Lấy ảnh tham chiếu riêng (nếu có).
      // Cảnh 2+: Có ảnh riêng -> [Frame cuối + Ảnh riêng]
      //          Không ảnh riêng -> [Frame cuối]
      // ====================================================================
      let refIds = [];
      const userOwnRefs = Array.isArray(curScene.referenceAssetIds) ? curScene.referenceAssetIds : [];

      if (i === 0) {
        refIds = [...userOwnRefs];
      } else {
        if (lastExtractedFrameAsset?.id) {
          if (userOwnRefs.length > 0) {
            refIds = [lastExtractedFrameAsset.id, ...userOwnRefs.filter(id => id !== lastExtractedFrameAsset.id)];
          } else {
            refIds = [lastExtractedFrameAsset.id];
          }
        } else {
          refIds = [...userOwnRefs];
        }
      }

      // Chọn tài khoản phù hợp
      const isMuse = (curScene.provider || "").toLowerCase().includes("muse");
      const isGrok = (curScene.provider || "").toLowerCase().includes("grok");
      const providerId = isGrok ? "grok" : (isMuse ? "muse" : "veo3");

      const liveProj = StoryStore.getState().projects.find(p => p.id === projId) || proj;
      const targetAccount = isMuse ? chainMuseAccount : (isGrok ? chainGrokAccount : chainVeoAccount);
      const singleJobRunId = `story-run-${projId}-${sceneNum}-${Date.now()}`;

      const jobBatch = [{
        title: `[${proj.name}] Cảnh ${sceneNum}`,
        type: "Video",
        providerId: providerId,
        provider: curScene.provider || (isMuse ? "Muse AI" : (isGrok ? "Grok" : "Veo3")),
        ...(targetAccount ? {
          accountId: targetAccount.accountId,
          account: targetAccount.accountName || targetAccount.displayName || targetAccount.email || "AI Account"
        } : {}),
        payload: {
          title: `[${proj.name}] Cảnh ${sceneNum}`,
          promptId: curScene.id,
          prompt: curScene.prompt,
          ratio: curScene.ratio || "16:9",
          mode: "Components",
          flowVideoMode: refIds.length > 0 ? "R2V" : "T2V",
          duration: curScene.duration || (isMuse ? "10s" : "8s"),
          model: isMuse ? "muse-video" : (isGrok ? "grok-imagine-video" : curScene.model),
          resolution: "720p",
          resolutionName: "720p",
          generationRunId: singleJobRunId,
          generationRunCreatedAt: new Date().toISOString(),
          promptOrder: sceneNum,
          sceneIndex: sceneNum,
          sceneName: `Cảnh ${sceneNum}`,
          account: targetAccount ? (targetAccount.accountName || targetAccount.displayName || "Auto") : "Auto",
          accountSelection: targetAccount ? "manual" : "auto",
          referenceAssetIds: refIds,
          ...(!isMuse && !isGrok && liveProj.flowVoice && refIds.length > 0 ? { voice: liveProj.flowVoice } : {}),
          preset: "custom",
          studioSource: "story-script-studio",
          autoMerge: false,
          autoDownload: liveProj.autoDownload ?? true
        }
      }];

      const submitRes = await queueApi?.addJobs?.(jobBatch) || await queueApi?.enqueueJobs?.(jobBatch);
      const queuedJob = submitRes?.results?.[0] || submitRes?.[0];
      const jobId = queuedJob?.job?.id || queuedJob?.id || queuedJob?.jobId;

      if (!jobId) {
        throw new Error("Không thể khởi tạo hàng đợi cho Cảnh " + sceneNum);
      }
      storyActiveJob.set(projId, jobId);

      // Chờ job hoàn tất bằng onChanged event (giống useWorkflowRunner) + fallback poll
      const findJobInPayload = (payload) => {
        if (!payload) return null;
        const jobs = Array.isArray(payload) ? payload : (payload.jobs || payload.state?.jobs || []);
        // Chỉ nhận đúng job vừa gửi (theo jobId). Không khớp theo promptId: bấm "Tạo lại" thì
        // job cũ cùng cảnh vẫn nằm trong hàng đợi và sẽ bị nhận nhầm video cũ.
        return jobs.find(x => x && (x.id === jobId || x.jobId === jobId)) || null;
      };

      const completedJob = await new Promise((resolve, reject) => {
        let settled = false;
        let unsubOnChanged = null;
        let pollTimer = null;

        const settle = (job, err) => {
          if (settled) return;
          settled = true;
          try { unsubOnChanged?.(); } catch (_) {}
          if (pollTimer) clearInterval(pollTimer);
          if (err) reject(err);
          else resolve(job);
        };

        const checkJob = (j) => {
          if (!j) return;
          if (j.status === "Completed") { settle(j); return; }
          if (j.status === "Failed" || j.status === "Canceled") {
            settle(null, new Error(j.error || j.statusReason || `Cảnh ${sceneNum} render thất bại`));
            return;
          }
          if (typeof j.progress === "number" && j.progress > 0) {
            updateProject(projId, p => ({
              ...p,
              prompts: p.prompts.map(s => s.id === curScene.id ? { ...s, progress: j.progress } : s)
            }));
          }
        };

        // 1) Subscribe onChanged - nhận push event khi job thay đổi
        if (typeof queueApi?.onChanged === "function") {
          try {
            unsubOnChanged = queueApi.onChanged((snapshot) => {
              if (settled) return;
              if (!runningRef.current.has(projId)) {
                settle(null, new Error("Người dùng đã dừng tiến trình tạo video."));
                return;
              }
              checkJob(findJobInPayload(snapshot));
            });
          } catch (_) {}
        }

        // 2) Fallback poll mỗi 3s (dự phòng khi onChanged không fire hoặc không có)
        pollTimer = setInterval(async () => {
          if (settled) { clearInterval(pollTimer); return; }
          if (!runningRef.current.has(projId)) {
            settle(null, new Error("Người dùng đã dừng tiến trình tạo video."));
            return;
          }
          try {
            const listRes = await (queueApi?.listQueue?.() || queueApi?.list?.());
            checkJob(findJobInPayload(listRes));
          } catch (_) {}
        }, 3000);

        // 3) Hard timeout 15 phút
        setTimeout(() => {
          settle(null, new Error(`Hết thời gian chờ tạo video Cảnh ${sceneNum}`));
        }, 900000);
      });

      storyActiveJob.delete(projId);
      // Bị dừng / bấm tạo lại trong lúc chờ → không ghi kết quả cũ đè lên cảnh đã được đặt lại
      if (!runningRef.current.has(projId)) {
        throw new Error("Người dùng đã dừng tiến trình chạy kịch bản.");
      }

      const videoAsset = (completedJob.result?.assets || []).find(a => a.type === "video") || null;
      const resultVideoAssetId = videoAsset?.assetId || videoAsset?.id || completedJob.result?.assetId || completedJob.assetId || completedJob.payload?.assetId || jobId;
      let resultVideoUrl = videoAsset?.url || completedJob.result?.videoUrl || completedJob.videoUrl || "";
      let resultLocalPath = videoAsset?.localPath || completedJob.result?.localPath || completedJob.localPath || "";
      let resultThumbnailUrl = videoAsset?.thumbnailUrl || completedJob.result?.thumbnailUrl || completedJob.thumbnailUrl || "";

      // Nếu chưa có url hoặc localPath, truy xuất từ assetsApi
      if (!resultVideoUrl || !resultLocalPath) {
        try {
          const assetObj = await assetsApi?.getAsset?.(resultVideoAssetId);
          if (assetObj) {
            if (!resultVideoUrl) resultVideoUrl = assetObj.url || "";
            if (!resultLocalPath) resultLocalPath = assetObj.localPath || "";
            if (!resultThumbnailUrl) resultThumbnailUrl = assetObj.thumbnailUrl || "";
          }
        } catch (_) {}
      }

      if (!resultVideoUrl && resultVideoAssetId) {
        resultVideoUrl = `aivideo-asset://asset/${resultVideoAssetId}`;
      }

      const videoItem = {
        id: resultVideoAssetId,
        sceneNum: sceneNum,
        prompt: curScene.prompt,
        videoUrl: resultVideoUrl,
        thumbnailUrl: resultThumbnailUrl,
        localPath: resultLocalPath,
        duration: curScene.duration || (isMuse ? "10s" : "8s"),
        createdAt: new Date().toISOString()
      };

      newCompletedVideos.push(videoItem);

      // Cập nhật Cảnh thành công và hiển thị video vào danh sách kết quả của dự án ngay lập tức!
      updateProject(projId, p => ({
        ...p,
        completedVideos: [...(p.completedVideos || []).filter(v => v.sceneNum !== sceneNum), videoItem],
        prompts: p.prompts.map(s => s.id === curScene.id ? {
          ...s,
          status: "Completed",
          progress: 100,
          videoUrl: resultVideoUrl,
          assetId: resultVideoAssetId,
          error: ""
        } : s)
      }));

      toast.success(`🎉 [${proj.name}] Cảnh ${sceneNum} hoàn tất xuất sắc!`);

      // Trích xuất Frame cuối để nạp sang Cảnh tiếp theo — luôn trích (prompt có thể được thêm sau),
      // lưu cả id frame lên cảnh kế tiếp để bấm "Tạo lại" dùng đúng frame
      try {
        updateProject(projId, { progressText: `Đang trích xuất frame cuối Cảnh ${sceneNum}...` });
        const extracted = await assetsApi?.extractLastFrame?.({
          assetId: resultVideoAssetId,
          jobId: jobId,
          promptOrder: sceneNum
        });
        if (extracted?.id) {
          lastExtractedFrameAsset = extracted;
          const afterList = getLiveScenes(projId);
          const nextScene = afterList[afterList.findIndex(s => s.id === curScene.id) + 1];
          const frameUrl = extracted.url || extracted.thumbnailUrl || "";
          updateProject(projId, p => ({
            ...p,
            chainFrameAssetId: extracted.id,
            chainFrameUrl: frameUrl,
            prompts: nextScene
              ? p.prompts.map(s => s.id === nextScene.id ? { ...s, lastExtractedFrameUrl: frameUrl, lastExtractedFrameAssetId: extracted.id } : s)
              : p.prompts
          }));
          if (nextScene) toast.success(`✨ Đã sẵn sàng Frame cuối Cảnh ${sceneNum} nối tiếp sang Cảnh ${nextScene.index}!`);
        }
      } catch (fErr) {
        console.warn("Không trích xuất được frame:", fErr);
      }

      doneCount++;
      // Cảnh kế tiếp lấy từ danh sách MỚI NHẤT (kể cả prompt vừa thêm trong lúc chạy)
      const nextList = getLiveScenes(projId);
      const pos = nextList.findIndex(s => s.id === curScene.id);
      curSceneId = pos >= 0 ? (nextList[pos + 1]?.id || null) : null;
    }

    if (pausedAtId) {
      const pausedScene = getLiveScenes(projId).find(s => s.id === pausedAtId);
      updateProject(projId, { isPaused: true, pausedAtSceneId: pausedAtId });
      toast.info(`⏸️ [${proj.name}] Đã dừng trước Cảnh ${pausedScene?.index ?? ""}. Sửa / thêm prompt rồi bấm "Tiếp tục".`);
    } else {
      toast.success(`🏆 [XUẤT SẮC] Đã hoàn thành ${doneCount} cảnh của ${proj.name}! Bấm "Ghép Phim" khi muốn ghép.`);
    }

  } catch (err) {
    const errMsg = err?.message || String(err);
    const isUserStop = errMsg.includes("dừng");
    if (isUserStop) {
      if (!storyPendingRestart.has(projId)) toast.info(`⏸️ [${proj.name}] Đã tạm dừng dây chuyền.`);
    } else {
      // KHÔNG dừng hẳn toàn bộ dự án — chuyển cảnh lỗi sang trạng thái CHỜ TẠO LẠI,
      // giữ nguyên toàn bộ cảnh đã hoàn tất để người dùng bấm "Tạo lại" tiếp tục dây chuyền.
      console.error("[StoryScriptRunner Error]:", err);
      toast.error(`⚠️ [${proj.name}] Một cảnh gặp sự cố — dây chuyền đang CHỜ. Bấm "Tạo lại" ở cảnh lỗi để tiếp tục tự động: ` + errMsg);
      updateProject(projId, p => ({
        ...p,
        prompts: p.prompts.map(s => s.status === "Running" ? { ...s, status: "Failed", progress: 0, error: errMsg } : s)
      }));
    }
  } finally {
    runningRef.current.delete(projId);
    storyLoopAlive.delete(projId);
    storyActiveJob.delete(projId);
    storyPauseRequested.delete(projId);
    updateProject(projId, p => ({ ...p, isRunning: false, progressText: "", isPaused: !!(p.isPaused && p.pausedAtSceneId) }));
    // Bấm "Tạo lại" trong lúc đang chạy → chạy lại từ cảnh đó sau khi dây chuyền cũ dừng hẳn
    const restartId = storyPendingRestart.get(projId);
    if (restartId) {
      storyPendingRestart.delete(projId);
      if (restartId !== STORY_RESET_ONLY) setTimeout(() => restartId === STORY_RESTART_FROM_START
        ? runStoryProjectCore(projId)
        : runStoryProjectCore(projId, { resumeFromSceneId: restartId }), 300);
    }
  }
}

export default function StoryScriptStudio() {
  // 1. Subscribe vào Store module-level — sống độc lập với vòng đời component.
  // Dây chuyền chạy ngầm (runStoryProjectCore) ghi thẳng vào Store nên dù người dùng
  // lỡ tay chuyển sang Studio khác, tiến trình tạo video vẫn tiếp tục chạy không gián đoạn.
  const [storeState, setStoreState] = React.useState(() => StoryStore.getState());
  React.useEffect(() => StoryStore.subscribe(setStoreState), []);
  const projects = storeState.projects;
  const setProjects = StoryStore.setProjects;
  const activeProjectId = storeState.activeProjectId;
  const setActiveProjectId = StoryStore.setActiveProjectId;
  const updateProject = StoryStore.updateProject;
  const runningRef = { current: runningProjects };

  // Modal xem video phóng to
  const [selectedVideo, setSelectedVideo] = React.useState(null);

  // Modal xem ảnh tham chiếu / frame cuối phóng to
  const [selectedImage, setSelectedImage] = React.useState(null);

  // Bảng dựng phim (Biên Tập Video) nhúng trực tiếp tại đây — nạp lười (lazy) component
  // thật từ VideoStudio, chỉ mở với đúng video của dự án đang chọn.
  const [MergeModalComp, setMergeModalComp] = React.useState(null);
  const [mergeEditorAssetIds, setMergeEditorAssetIds] = React.useState(null);

  const openProjectMergeEditor = (assetIds) => {
    setMergeEditorAssetIds(assetIds);
    if (!MergeModalComp) {
      import("./VideoStudio-frcr8V6s.js")
        .then(mod => setMergeModalComp(() => mod.MergeModal))
        .catch(() => toast.error("Không thể nạp bảng dựng phim, thử tải lại app."));
    }
  };

  // Danh sách tài khoản Browser Hub — dùng để gán riêng tài khoản chạy cho từng dự án
  const [browserAccounts, setBrowserAccounts] = React.useState([]);
  React.useEffect(() => {
    let cancelled = false;
    async function loadAccounts() {
      try {
        const listSessions = window.aiforge?.browser?.listSessions || window.aivideo?.browser?.listSessions;
        if (!listSessions) return;
        const sessions = await listSessions();
        if (!cancelled) setBrowserAccounts(Array.isArray(sessions) ? sessions.filter(s => !s.disabled) : []);
      } catch (_) {}
    }
    loadAccounts();
    const interval = setInterval(loadAccounts, 8000);
    return () => { cancelled = true; clearInterval(interval); };
  }, []);

  const handleSelectProjectAccount = (projId, providerKey, accId) => {
    updateProject(projId, p => ({
      ...p,
      accountSelections: { muse: "auto", veo3: "auto", grok: "auto", ...(p.accountSelections || {}), [providerKey]: accId }
    }));
  };

  // Modal nhập hàng loạt prompt
  const [isBulkImportOpen, setIsBulkImportOpen] = React.useState(false);
  const [bulkPromptText, setBulkPromptText] = React.useState("");

  // Tìm kiếm cảnh
  const [searchQuery, setSearchQuery] = React.useState("");

  // Modal đổi tên dự án
  const [editingProjectId, setEditingProjectId] = React.useState(null);
  const [editingProjectName, setEditingProjectName] = React.useState("");

  // Dự án hiện tại đang mở
  const currentProject = React.useMemo(() => {
    return projects.find(p => p.id === activeProjectId) || projects[0] || null;
  }, [projects, activeProjectId]);

  // Danh sách cảnh đã lọc theo searchQuery (stable, không tạo closure mới mỗi render)
  const filteredScenes = React.useMemo(() => {
    if (!currentProject) return [];
    if (!searchQuery.trim()) return currentProject.prompts;
    const q = searchQuery.toLowerCase();
    return currentProject.prompts.filter(s => s.prompt.toLowerCase().includes(q));
  }, [currentProject, searchQuery]);

  // Thêm dự án mới
  const handleAddNewProject = () => {
    const newProj = createDefaultProject(projects.length + 1);
    setProjects(prev => [...prev, newProj]);
    setActiveProjectId(newProj.id);
    toast.success(`✨ Đã tạo "${newProj.name}" thành công!`);
  };

  // Xóa dự án
  const handleDeleteProject = (projId, e) => {
    e?.stopPropagation();
    if (projects.length <= 1) {
      toast.warning("Dự án cuối cùng không thể xóa!");
      return;
    }
    const target = projects.find(p => p.id === projId);
    if (!window.confirm(`Bạn có chắc chắn muốn xóa "${target?.name || 'dự án này'}" không?`)) return;

    setProjects(prev => {
      const filtered = prev.filter(p => p.id !== projId);
      if (activeProjectId === projId) {
        setActiveProjectId(filtered[0]?.id || "");
      }
      return filtered;
    });
    toast.info("Đã xóa dự án.");
  };

  // Đổi tên dự án
  const handleStartRename = (proj, e) => {
    e?.stopPropagation();
    setEditingProjectId(proj.id);
    setEditingProjectName(proj.name);
  };

  const handleSaveRename = () => {
    if (editingProjectId && editingProjectName.trim()) {
      updateProject(editingProjectId, { name: editingProjectName.trim() });
      toast.success("Đã đổi tên dự án!");
    }
    setEditingProjectId(null);
  };

  // Thêm 1 cảnh vào dự án hiện tại
  const handleAddScene = () => {
    if (!currentProject) return;
    const nextIdx = currentProject.prompts.length + 1;
    const newScene = {
      id: generateId("sc"),
      index: nextIdx,
      prompt: "",
      provider: currentProject.prompts[0]?.provider || "Muse AI",
      model: currentProject.prompts[0]?.model || "muse-video",
      ratio: currentProject.prompts[0]?.ratio || "16:9",
      duration: currentProject.prompts[0]?.duration || "10s",
      account: "Auto",
      referenceAssetIds: [],
      refImageUrl: "",
      refImageUrls: [],
      status: "Pending",
      progress: 0,
      videoUrl: "",
      assetId: null,
      jobId: null
    };

    updateProject(currentProject.id, p => ({
      ...p,
      prompts: [...p.prompts, newScene]
    }));
    toast.success(`Đã thêm Cảnh ${nextIdx}!`);
  };

  // Xóa 1 cảnh
  const handleDeleteScene = (sceneId) => {
    if (!currentProject) return;
    updateProject(currentProject.id, p => {
      const remaining = p.prompts.filter(s => s.id !== sceneId);
      const reIndexed = remaining.map((s, idx) => ({ ...s, index: idx + 1 }));
      return { ...p, prompts: reIndexed };
    });
  };

  // Cập nhật 1 cảnh
  const handleUpdateScene = (sceneId, patch) => {
    if (!currentProject) return;
    updateProject(currentProject.id, p => ({
      ...p,
      prompts: p.prompts.map(s => s.id === sceneId ? { ...s, ...patch } : s)
    }));
  };

  // Dán từ Clipboard (1-Click)
  const handlePasteClipboard = async () => {
    try {
      const text = await navigator.clipboard.readText();
      if (text && text.trim()) {
        setBulkPromptText(text);
        toast.success("📋 Đã dán nội dung từ Clipboard!");
      } else {
        toast.warning("Clipboard của bạn đang trống!");
      }
    } catch (err) {
      toast.error("Không thể đọc Clipboard: " + err.message);
    }
  };

  // Nạp kịch bản mẫu thử (3 Cảnh)
  const handlePasteSample = () => {
    setBulkPromptText(
      "Cảnh 1: Chú mèo lông trắng dễ thương đang ngồi sưởi nắng bên bậu cửa sổ, ánh nắng vàng chiếu qua rèm cửa lung linh.\n" +
      "Cảnh 2: Chú mèo đứng dậy vươn vai lười biếng, bước chậm rãi đến đĩa thức ăn bên cạnh và bắt đầu ăn ngon lành.\n" +
      "Cảnh 3: Chú mèo nằm cuộn tròn trên tấm thảm len ấm áp ngủ say sưa, đuôi khẽ đung đưa nhịp nhàng."
    );
    toast.info("Đã nạp kịch bản mẫu 3 cảnh!");
  };

  // Nhập hàng loạt prompt
  const handleBulkImport = () => {
    if (!currentProject || !bulkPromptText.trim()) return;
    const rawLines = bulkPromptText.split("\n")
      .map(l => l.trim())
      .filter(l => l.length > 0);

    if (rawLines.length === 0) return;

    // Luôn NỐI THÊM sau các prompt cũ (có 20 cảnh → cảnh mới bắt đầu từ 21). Đang chạy thì dây chuyền chạy tiếp luôn.
    // Chỉ thay mới khi dự án chưa có prompt thật (toàn cảnh mẫu mặc định / cảnh trống chưa có video).
    const isRunningNow = !!currentProject.isRunning || storyLoopAlive.has(currentProject.id);
    const samplePrompts = new Set(createDefaultProject(1).prompts.map(s => s.prompt));
    const isPlaceholder = s => !s.videoUrl && !s.assetId && (s.status || "Pending") === "Pending"
      && !(s.referenceAssetIds || []).length
      && (!(s.prompt || "").trim() || samplePrompts.has(s.prompt));
    const appendMode = isRunningNow || currentProject.prompts.some(s => !isPlaceholder(s));
    // Bỏ các cảnh trống ở cuối danh sách (bấm "Thêm cảnh" mà chưa gõ) để cảnh mới nối liền
    const keptScenes = [...currentProject.prompts];
    if (!isRunningNow) {
      while (keptScenes.length && !(keptScenes[keptScenes.length - 1].prompt || "").trim() && isPlaceholder(keptScenes[keptScenes.length - 1])) keptScenes.pop();
    }
    const baseIndex = appendMode ? keptScenes.reduce((m, s) => Math.max(m, s.index || 0), 0) : 0;

    const newScenes = rawLines.map((line, idx) => {
      const cleaned = line.replace(/^(cảnh|phân cảnh|scene)\s*\d+[:.-]?\s*/i, "").trim();
      return {
        id: generateId("sc"),
        index: baseIndex + idx + 1,
        prompt: cleaned || line,
        provider: currentProject.prompts[0]?.provider || "Muse AI",
        model: currentProject.prompts[0]?.model || "muse-video",
        ratio: currentProject.prompts[0]?.ratio || "16:9",
        duration: currentProject.prompts[0]?.duration || "10s",
        account: "Auto",
        referenceAssetIds: [],
        refImageUrl: "",
        refImageUrls: [],
        status: "Pending",
        progress: 0,
        videoUrl: "",
        assetId: null,
        jobId: null
      };
    });

    const keptIds = new Set(keptScenes.map(s => s.id));
    updateProject(currentProject.id, p => {
      const kept = isRunningNow ? p.prompts : p.prompts.filter(s => keptIds.has(s.id));
      const start = kept.reduce((m, s) => Math.max(m, s.index || 0), 0);
      return {
        ...p,
        prompts: appendMode
          ? [...kept, ...newScenes.map((s, idx) => ({ ...s, index: start + idx + 1 }))]
          : newScenes
      };
    });

    setIsBulkImportOpen(false);
    setBulkPromptText("");
    toast.success(isRunningNow
      ? `🔗 Đã nối thêm ${newScenes.length} cảnh vào dây chuyền đang chạy — sẽ tiếp tục từ frame cuối cảnh trước!`
      : appendMode
      ? `📥 Đã thêm ${newScenes.length} cảnh nối tiếp (Cảnh ${baseIndex + 1} → ${baseIndex + newScenes.length}), prompt cũ giữ nguyên.`
      : `🎉 Đã nhập thành công ${newScenes.length} phân cảnh cho dự án!`);
  };

  // Chọn thư mục lưu cho dự án
  const handlePickDirectory = async () => {
    if (!currentProject) return;
    try {
      const dir = await window.aiforge?.assets?.selectExportDirectory?.("", "Chọn thư mục lưu video cho " + currentProject.name);
      if (dir) {
        updateProject(currentProject.id, { saveDirectory: dir });
        toast.success(`Đã chọn thư mục lưu: ${dir}`);
      }
    } catch (err) {
      console.warn("Lỗi chọn thư mục:", err);
    }
  };

  // Chọn ảnh tham chiếu cho cảnh — hỗ trợ nhiều ảnh, append vào array
  const handlePickReferenceImage = async (sceneId) => {
    const projId = currentProject?.id;
    if (!projId) return;
    try {
      const input = document.createElement("input");
      input.type = "file";
      input.accept = "image/*";
      input.multiple = true;
      input.onchange = async (e) => {
        const files = Array.from(e.target.files || []);
        if (files.length === 0) return;
        const assetsApi = window.aiforge?.assets || window.aivideo?.assets;
        let addedCount = 0;
        for (const file of files) {
          try {
            const dataUrl = await new Promise((resolve, reject) => {
              const reader = new FileReader();
              reader.onload = () => resolve(reader.result);
              reader.onerror = reject;
              reader.readAsDataURL(file);
            });
            if (assetsApi?.importReference) {
              const imported = await assetsApi.importReference({
                name: file.name,
                mimeType: file.type || "image/jpeg",
                dataUrl
              });
              if (imported?.id) {
                updateProject(projId, p => ({
                  ...p,
                  prompts: p.prompts.map(s => {
                    if (s.id !== sceneId) return s;
                    const prevUrls = Array.isArray(s.refImageUrls) ? s.refImageUrls : (s.refImageUrl ? [s.refImageUrl] : []);
                    return {
                      ...s,
                      referenceAssetIds: [...(s.referenceAssetIds || []), imported.id],
                      refImageUrls: [...prevUrls, dataUrl],
                      refImageUrl: prevUrls[0] || dataUrl
                    };
                  })
                }));
                addedCount++;
              }
            }
          } catch (_) {}
        }
        if (addedCount > 0) toast.success(`Đã nạp ${addedCount} ảnh tham chiếu!`);
      };
      input.click();
    } catch (err) {
      toast.error("Không thể tải ảnh: " + err.message);
    }
  };

  // Xóa 1 ảnh tham chiếu tại vị trí imgIdx
  const handleClearOneRefImage = (sceneId, imgIdx, e) => {
    e?.stopPropagation();
    const projId = currentProject?.id;
    if (!projId) return;
    updateProject(projId, p => ({
      ...p,
      prompts: p.prompts.map(s => {
        if (s.id !== sceneId) return s;
        const prevUrls = Array.isArray(s.refImageUrls) ? s.refImageUrls : (s.refImageUrl ? [s.refImageUrl] : []);
        const newUrls = prevUrls.filter((_, i) => i !== imgIdx);
        const newIds = (s.referenceAssetIds || []).filter((_, i) => i !== imgIdx);
        return { ...s, refImageUrls: newUrls, referenceAssetIds: newIds, refImageUrl: newUrls[0] || "" };
      })
    }));
    toast.info("Đã xóa ảnh tham chiếu.");
  };

  // Xóa tất cả ảnh tham chiếu của cảnh
  const handleClearReferenceImage = (sceneId, e) => {
    e?.stopPropagation();
    handleUpdateScene(sceneId, {
      referenceAssetIds: [],
      refImageUrls: [],
      refImageUrl: ""
    });
    toast.info("Đã xóa tất cả ảnh tham chiếu của cảnh này.");
  };

  // ==========================================================================
  // Dây chuyền chạy dự án (runStoryProjectCore) đã chuyển ra module-level phía trên
  // file để sống độc lập với vòng đời component — xem phần đầu file.
  // ==========================================================================

  // Hủy / Đặt lại trạng thái khi đang chạy hoặc bị treo
  const handleCancelProject = React.useCallback((projId) => {
    runningRef.current.delete(projId);
    updateProject(projId, p => ({
      ...p,
      isRunning: false,
      progressText: "",
      prompts: (p.prompts || []).map(s => s.status === "Running" ? { ...s, status: "Pending", progress: 0 } : s)
    }));
    toast.info("Đã dừng và đặt lại dự án thành công!");
  }, [updateProject]);

  // Tự động đồng bộ các video đã hoàn tất từ Queue vào dự án
  React.useEffect(() => {
    if (!currentProject || currentProject.isRunning) return;
    const queueApi = window.aiforge?.queue || window.aivideo?.queue;
    if (!queueApi) return;

    let isMounted = true;
    (async () => {
      try {
        const listRes = await (queueApi.listQueue?.() || queueApi.list?.());
        const rawJobs = Array.isArray(listRes) ? listRes : (listRes?.jobs || []);
        if (!Array.isArray(rawJobs) || rawJobs.length === 0) return;

        const projName = currentProject.name;
        const matchedJobs = rawJobs.filter(j => 
          j && j.status === "Completed" && 
          (j.title?.includes(`[${projName}]`) || (j.payload?.studioSource === "story-script-studio" && j.payload?.title?.includes(`[${projName}]`)))
        );

        if (matchedJobs.length > 0 && isMounted) {
          const recovered = [];
          for (const j of matchedJobs) {
            const m = j.title?.match(/Cảnh\s+(\d+)/i) || (j.payload?.promptOrder ? ["", j.payload.promptOrder] : null);
            const sceneNum = m ? parseInt(m[1], 10) : 1;
            // Cảnh đã bấm "Tạo lại": bỏ qua video cũ tạo trước lúc đặt lại
            const resetAt = currentProject.sceneResetAt?.[sceneNum];
            if (resetAt && new Date(j.createdAt || 0).getTime() <= resetAt) continue;
            const videoAsset = (j.result?.assets || []).find(a => a.type === "video") || null;
            const assetId = videoAsset?.assetId || videoAsset?.id || j.result?.assetId || j.assetId || j.id;
            const videoUrl = videoAsset?.url || j.result?.videoUrl || (assetId ? `aivideo-asset://asset/${assetId}` : "");
            
            recovered.push({
              id: assetId,
              sceneNum: sceneNum,
              prompt: j.payload?.prompt || j.title || "",
              videoUrl: videoUrl,
              thumbnailUrl: videoAsset?.thumbnailUrl || "",
              localPath: videoAsset?.localPath || "",
              duration: j.payload?.duration || "10s",
              createdAt: j.createdAt || new Date().toISOString()
            });
          }

          if (recovered.length > 0 && isMounted) {
            updateProject(currentProject.id, p => {
              const existingIds = new Set((p.completedVideos || []).map(v => v.id));
              const toAdd = recovered.filter(r => !existingIds.has(r.id));
              if (toAdd.length === 0) return p;
              return {
                ...p,
                completedVideos: [...(p.completedVideos || []), ...toAdd].sort((a, b) => a.sceneNum - b.sceneNum),
                prompts: p.prompts.map(s => {
                  const matchVid = recovered.find(r => r.sceneNum === s.index);
                  if (matchVid && s.status !== "Completed") {
                    return { ...s, status: "Completed", progress: 100, videoUrl: matchVid.videoUrl, assetId: matchVid.id };
                  }
                  return s;
                })
              };
            });
          }
        }
      } catch (_) {}
    })();

    return () => { isMounted = false; };
  }, [currentProject?.id, updateProject]);

  // Chạy dự án — logic thực tế nằm ở module-level runStoryProjectCore (sống độc lập component)
  const handleRunProject = runStoryProjectCore;

  // Tạo lại 1 cảnh (lỗi hay đã xong): xóa video từ cảnh đó trở xuống, chạy lại từ frame cuối cảnh liền trước
  const handleRetryScene = (sceneId) => {
    if (!currentProject) return;
    regenerateStoryScene(currentProject.id, sceneId);
  };

  const handleOpenFolder = (localPath) => {
    if (localPath) {
      window.aiforge?.assets?.showPathInFolder?.(localPath) ||
      window.aivideo?.assets?.showPathInFolder?.(localPath);
    } else {
      toast.info("Tệp đang được lưu trong thư mục Downloads!");
    }
  };

  return React.createElement("div", {
    className: "flex flex-col h-full w-full bg-[#0B0F17] text-slate-100 overflow-hidden font-sans"
  },
    // ========================================================================
    // HEADER: TIÊU ĐỀ & THANH QUẢN LÝ DỰ ÁN (PROJECT TABS BAR)
    // ========================================================================
    React.createElement("div", {
      className: "border-b border-white/[0.08] bg-[#0E1424] px-5 py-3 shrink-0"
    },
      React.createElement("div", {
        className: "flex items-center justify-between mb-2.5"
      },
        React.createElement("div", { className: "flex items-center gap-3" },
          React.createElement("div", {
            className: "w-8 h-8 rounded-lg bg-gradient-to-tr from-violet-600 to-indigo-500 flex items-center justify-center text-lg shadow-[0_0_15px_rgba(139,92,246,0.5)]"
          }, "🎬"),
          React.createElement("div", null,
            React.createElement("h1", {
              className: "text-sm font-bold tracking-wide text-white uppercase flex items-center gap-2"
            },
              "Studio Kịch Bản Phim",
              React.createElement("span", {
                className: "text-[10px] bg-violet-500/20 text-violet-300 border border-violet-500/30 px-2 py-0.5 rounded-full font-semibold lowercase tracking-normal"
              }, "nối tiếp cảnh đa dự án")
            ),
            React.createElement("p", { className: "text-[11px] text-slate-400" },
              "Tự động nạp Frame cuối cảnh trước • Ghép phim dài hoàn chỉnh • Chạy độc lập từng dự án"
            )
          )
        ),

        // Nút thêm dự án mới
        React.createElement("button", {
          onClick: handleAddNewProject,
          className: "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white text-xs font-semibold shadow-[0_2px_12px_rgba(124,58,237,0.35)] transition-all cursor-pointer hover:scale-[1.02]"
        },
          React.createElement("span", { className: "text-sm leading-none font-bold" }, "+"),
          "Thêm Dự Án Mới"
        )
      ),

      // DANH SÁCH CÁC TAB DỰ ÁN (PROJECT TABS)
      React.createElement("div", {
        className: "flex items-center gap-2 overflow-x-auto pb-1 [scrollbar-width:thin]"
      },
        projects.map(proj => {
          const isActive = proj.id === activeProjectId;
          const isEditing = editingProjectId === proj.id;
          const isRunning = proj.isRunning;

          return React.createElement("div", {
            key: proj.id,
            onClick: () => setActiveProjectId(proj.id),
            className: `group relative flex items-center gap-2 px-3 py-1.5 rounded-lg border text-xs font-semibold transition-all cursor-pointer shrink-0 ${
              isActive
                ? "border-violet-500/80 bg-violet-600/20 text-violet-200 shadow-[0_0_16px_rgba(139,92,246,0.25)]"
                : "border-white/[0.08] bg-white/[0.03] text-slate-400 hover:border-white/20 hover:text-slate-200"
            }`
          },
            isRunning
              ? React.createElement("span", { className: "w-2 h-2 rounded-full bg-amber-400 animate-pulse shadow-[0_0_8px_#f59e0b]" })
              : React.createElement("span", { className: "text-sm" }, "🎬"),

            isEditing
              ? React.createElement("input", {
                  type: "text",
                  value: editingProjectName,
                  onChange: e => setEditingProjectName(e.target.value),
                  onBlur: handleSaveRename,
                  onKeyDown: e => { if (e.key === "Enter") handleSaveRename(); if (e.key === "Escape") setEditingProjectId(null); },
                  onClick: e => e.stopPropagation(),
                  autoFocus: true,
                  className: "bg-[#0f172a] text-white border border-violet-500 px-1.5 py-0.5 rounded text-xs outline-none w-32 select-text"
                })
              : React.createElement("span", {
                  onDoubleClick: e => handleStartRename(proj, e),
                  className: "truncate max-w-[140px]"
                }, proj.name),

            React.createElement("span", {
              className: "text-[10px] bg-white/[0.06] text-slate-400 px-1.5 py-0.2 rounded font-mono"
            }, `${proj.prompts.length} cảnh`),

            !isEditing && React.createElement("button", {
              onClick: e => handleStartRename(proj, e),
              title: "Đổi tên dự án",
              className: "opacity-0 group-hover:opacity-100 hover:text-white transition-opacity p-0.5 cursor-pointer"
            }, "✏️"),

            projects.length > 1 && React.createElement("button", {
              onClick: e => handleDeleteProject(proj.id, e),
              title: "Xóa dự án",
              className: "opacity-0 group-hover:opacity-100 hover:text-red-400 transition-opacity p-0.5 ml-0.5 text-slate-500 cursor-pointer"
            }, "×")
          );
        })
      )
    ),

    // ========================================================================
    // BODY: NỘI DUNG DỰ ÁN HIỆN TẠI (STORYBOARD & CONTROLS)
    // ========================================================================
    currentProject && React.createElement("div", {
      className: "flex-1 flex flex-col min-h-0 px-5 gap-4",
      style: { paddingTop: 16 }
    },
      // THANH CÔNG CỤ DỰ ÁN — cố định ở trên khi lăn chuột
      React.createElement("div", {
        className: "flex flex-wrap items-center justify-between gap-3 bg-[#131B2B] p-3 rounded-xl border border-white/[0.08]",
        style: { flexShrink: 0, background: "#131B2B", zIndex: 30, boxShadow: "0 8px 18px rgba(0,0,0,0.45)" }
      },
        React.createElement("div", { className: "flex flex-wrap items-center gap-2" },
          // Nút nhập hàng loạt prompt
          React.createElement("button", {
            onClick: () => setIsBulkImportOpen(true),
            className: "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600/20 border border-emerald-500/40 text-emerald-300 hover:bg-emerald-500/30 text-xs font-semibold cursor-pointer transition-all"
          }, "📥 Nhập Danh Sách Prompt"),

          // Nút thêm cảnh mới
          React.createElement("button", {
            onClick: handleAddScene,
            className: "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/[0.05] border border-white/10 text-slate-300 hover:bg-white/10 text-xs font-semibold cursor-pointer transition-all"
          }, "➕ Thêm Cảnh"),

          // Nút xóa tất cả
          React.createElement("button", {
            onClick: () => {
              if (window.confirm("Bạn có muốn dọn sạch tất cả các cảnh của dự án này không?")) {
                updateProject(currentProject.id, { prompts: [] });
              }
            },
            className: "inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 hover:bg-red-500/20 text-xs font-semibold cursor-pointer transition-all"
          }, "🗑️ Dọn Cảnh"),

          // Nút Ghép Phim (bấm mới ghép) — ghép video đã xong của đúng dự án này, theo thứ tự cảnh
          React.createElement("button", {
            onClick: () => mergeStoryProject(currentProject.id),
            disabled: !!currentProject.isMerging,
            title: "Ghép các video đã hoàn tất của dự án này thành 1 phim (theo thứ tự cảnh, dùng hiệu ứng chuyển cảnh đang chọn)",
            className: `inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-semibold transition-all ${
              currentProject.isMerging
                ? "border-cyan-400/40 bg-cyan-500/10 text-cyan-300 cursor-wait animate-pulse"
                : "border-cyan-400 bg-cyan-500/20 text-cyan-200 hover:bg-cyan-500/30 cursor-pointer shadow-[0_0_12px_rgba(6,182,212,0.25)]"
            }`
          },
            currentProject.isMerging ? "⏳ Đang ghép phim..." : "🔗 Ghép Phim",
            !currentProject.isMerging && React.createElement("span", {
              className: "bg-white/15 text-white px-1.5 py-0.5 rounded text-[10px]"
            }, `${new Set((currentProject.completedVideos || []).map(v => v.sceneNum)).size} clip`)
          ),

          // Toggle Tự động tải
          React.createElement("button", {
            onClick: () => updateProject(currentProject.id, p => ({ ...p, autoDownload: !p.autoDownload })),
            className: `inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-semibold cursor-pointer transition-all ${
              currentProject.autoDownload
                ? "border-amber-400/60 bg-amber-500/15 text-amber-200 shadow-[0_0_10px_rgba(245,158,11,0.2)]"
                : "border-white/10 bg-white/5 text-slate-400"
            }`
          },
            React.createElement("span", { className: `w-2 h-2 rounded-full ${currentProject.autoDownload ? "bg-amber-400 animate-pulse" : "bg-slate-500"}` }),
            "⚡ Tự Động Tải: ", currentProject.autoDownload ? "BẬT" : "TẮT"
          ),

          // Toggle Chờ xong hết mới ghép
          React.createElement("button", {
            onClick: () => updateProject(currentProject.id, p => ({ ...p, waitAllBeforeMerge: !p.waitAllBeforeMerge })),
            className: `inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-semibold cursor-pointer transition-all ${
              currentProject.waitAllBeforeMerge
                ? "border-sky-400/60 bg-sky-500/15 text-sky-200 shadow-[0_0_10px_rgba(14,165,233,0.2)]"
                : "border-white/10 bg-white/5 text-slate-400"
            }`
          }, currentProject.waitAllBeforeMerge ? "✂ Chờ Xong Hết Mới Ghép" : "✂ Chờ xong hết mới ghép"),

          // Giọng Flow (Veo3): một giọng cho cả dự án, chỉ áp cho cảnh có ảnh tham chiếu
          React.createElement("div", { className: "flex items-center gap-1.5", title: "Giọng Flow cho cảnh Veo3: chỉ áp dụng khi cảnh có ảnh tham chiếu. Nên dùng Omni 1.2 Flash. Để trống = Flow tự chọn giọng như cũ." },
            React.createElement("span", { className: "text-xs text-slate-400 font-semibold whitespace-nowrap" }, "🎙️ Giọng Flow:"),
            React.createElement("select", {
              value: currentProject.flowVoice || "",
              onChange: e => updateProject(currentProject.id, { flowVoice: e.target.value }),
              className: "bg-[#0B0F17] text-sky-200 text-xs border border-sky-500/30 rounded-lg px-2 py-1.5 outline-none cursor-pointer font-semibold"
            },
              React.createElement("option", { key: "none", value: "", style: { background: "#0B0F17", color: "#e2e8f0" } }, "Tự động (như cũ)"),
              React.createElement("option", { key: "achernar", value: "achernar", style: { background: "#0B0F17", color: "#e2e8f0" } }, "Achernar — Nữ, mềm, cao"),
              React.createElement("option", { key: "achird", value: "achird", style: { background: "#0B0F17", color: "#e2e8f0" } }, "Achird — Nam, thân thiện"),
              React.createElement("option", { key: "algenib", value: "algenib", style: { background: "#0B0F17", color: "#e2e8f0" } }, "Algenib — Nam, khàn, trầm"),
              React.createElement("option", { key: "algieba", value: "algieba", style: { background: "#0B0F17", color: "#e2e8f0" } }, "Algieba — Nam, thoải mái"),
              React.createElement("option", { key: "alnilam", value: "alnilam", style: { background: "#0B0F17", color: "#e2e8f0" } }, "Alnilam — Nam, chắc giọng"),
              React.createElement("option", { key: "aoede", value: "aoede", style: { background: "#0B0F17", color: "#e2e8f0" } }, "Aoede — Nữ, nhẹ nhàng"),
              React.createElement("option", { key: "autonoe", value: "autonoe", style: { background: "#0B0F17", color: "#e2e8f0" } }, "Autonoe — Nữ, tươi sáng"),
              React.createElement("option", { key: "callirrhoe", value: "callirrhoe", style: { background: "#0B0F17", color: "#e2e8f0" } }, "Callirrhoe — Nữ, thoải mái"),
              React.createElement("option", { key: "charon", value: "charon", style: { background: "#0B0F17", color: "#e2e8f0" } }, "Charon — Nam, kể chuyện, trầm"),
              React.createElement("option", { key: "despina", value: "despina", style: { background: "#0B0F17", color: "#e2e8f0" } }, "Despina — Nữ, mượt"),
              React.createElement("option", { key: "enceladus", value: "enceladus", style: { background: "#0B0F17", color: "#e2e8f0" } }, "Enceladus — Nam, hơi thở, trầm"),
              React.createElement("option", { key: "erinome", value: "erinome", style: { background: "#0B0F17", color: "#e2e8f0" } }, "Erinome — Nữ, rõ ràng"),
              React.createElement("option", { key: "fenrir", value: "fenrir", style: { background: "#0B0F17", color: "#e2e8f0" } }, "Fenrir — Nam, hào hứng, trẻ"),
              React.createElement("option", { key: "gacrux", value: "gacrux", style: { background: "#0B0F17", color: "#e2e8f0" } }, "Gacrux — Nữ, trưởng thành"),
              React.createElement("option", { key: "iapetus", value: "iapetus", style: { background: "#0B0F17", color: "#e2e8f0" } }, "Iapetus — Nam, rõ ràng"),
              React.createElement("option", { key: "kore", value: "kore", style: { background: "#0B0F17", color: "#e2e8f0" } }, "Kore — Nữ, chắc giọng"),
              React.createElement("option", { key: "laomedeia", value: "laomedeia", style: { background: "#0B0F17", color: "#e2e8f0" } }, "Laomedeia — Nữ, vui tươi"),
              React.createElement("option", { key: "leda", value: "leda", style: { background: "#0B0F17", color: "#e2e8f0" } }, "Leda — Nữ, trẻ trung"),
              React.createElement("option", { key: "orus", value: "orus", style: { background: "#0B0F17", color: "#e2e8f0" } }, "Orus — Nam, chắc giọng"),
              React.createElement("option", { key: "puck", value: "puck", style: { background: "#0B0F17", color: "#e2e8f0" } }, "Puck — Nam, vui tươi"),
              React.createElement("option", { key: "pulcherrima", value: "pulcherrima", style: { background: "#0B0F17", color: "#e2e8f0" } }, "Pulcherrima — Trung tính, cao"),
              React.createElement("option", { key: "rasalgethi", value: "rasalgethi", style: { background: "#0B0F17", color: "#e2e8f0" } }, "Rasalgethi — Nam, kể chuyện"),
              React.createElement("option", { key: "sadachbia", value: "sadachbia", style: { background: "#0B0F17", color: "#e2e8f0" } }, "Sadachbia — Nam, sôi nổi, trầm"),
              React.createElement("option", { key: "sadaltager", value: "sadaltager", style: { background: "#0B0F17", color: "#e2e8f0" } }, "Sadaltager — Nam, hiểu biết"),
              React.createElement("option", { key: "schedar", value: "schedar", style: { background: "#0B0F17", color: "#e2e8f0" } }, "Schedar — Nam, đều giọng"),
              React.createElement("option", { key: "sulafat", value: "sulafat", style: { background: "#0B0F17", color: "#e2e8f0" } }, "Sulafat — Nữ, ấm áp"),
              React.createElement("option", { key: "umbriel", value: "umbriel", style: { background: "#0B0F17", color: "#e2e8f0" } }, "Umbriel — Nam, mượt, trầm"),
              React.createElement("option", { key: "vindemiatrix", value: "vindemiatrix", style: { background: "#0B0F17", color: "#e2e8f0" } }, "Vindemiatrix — Nữ, dịu dàng"),
              React.createElement("option", { key: "zephyr", value: "zephyr", style: { background: "#0B0F17", color: "#e2e8f0" } }, "Zephyr — Nữ, tươi sáng"),
              React.createElement("option", { key: "zubenelgenubi", value: "zubenelgenubi", style: { background: "#0B0F17", color: "#e2e8f0" } }, "Zubenelgenubi — Nam, tự nhiên")
            )
          ),

          // Dropdown Chuyển cảnh dùng khi bấm Ghép Phim (chữ trong danh sách có nền tối để luôn đọc được)
          React.createElement("div", { className: "flex items-center gap-1.5" },
            React.createElement("span", { className: "text-xs text-slate-400 font-semibold whitespace-nowrap" }, "Chuyển cảnh:"),
            React.createElement("select", {
              value: currentProject.transition || "fade",
              onChange: e => updateProject(currentProject.id, { transition: e.target.value }),
              className: "bg-[#0B0F17] text-violet-200 text-xs border border-violet-500/30 rounded-lg px-2 py-1.5 outline-none cursor-pointer font-semibold"
            },
              [
                ["fade", "🌊 Hòa tan (Fade) — mặc định"],
                ["none", "✂️ Cắt thẳng (không hiệu ứng)"],
                ["fadeblack", "🌑 Mờ đen (Fade Black)"],
                ["dissolve", "✨ Mờ dần (Dissolve)"],
                ["slideleft", "◀ Trượt trái"],
                ["slideright", "▶ Trượt phải"],
                ["wipeleft", "⬅ Quét trái"],
                ["wiperight", "➡ Quét phải"],
                ["circleopen", "⭕ Vòng tròn mở"],
                ["circleclose", "🔘 Vòng tròn đóng"]
              ].map(([v, label]) => React.createElement("option", {
                key: v, value: v, style: { background: "#0B0F17", color: "#e2e8f0" }
              }, label))
            )
          ),

          // Chọn thư mục lưu
          React.createElement("button", {
            onClick: handlePickDirectory,
            className: "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/[0.04] border border-white/10 text-slate-300 hover:bg-white/10 text-xs font-semibold cursor-pointer transition-all"
          },
            "📁 ",
            currentProject.saveDirectory ? currentProject.saveDirectory.split(/[\\/]/).pop() : "Thư mục lưu..."
          ),

          // Chọn tài khoản chạy riêng cho dự án này (dễ chia việc, dễ kiểm tra đúng account đã tạo video)
          (() => {
            const providerMeta = {
              muse: { icon: "⚡", label: "Muse" },
              veo3: { icon: "🎬", label: "Veo3" },
              grok: { icon: "🤖", label: "Grok" }
            };
            const usedProviderKeys = Array.from(new Set((currentProject.prompts || []).map(s => providerKeyOf(s.provider))));
            const keysToShow = usedProviderKeys.length > 0 ? usedProviderKeys : ["veo3"];
            return keysToShow.map(pk => {
              const accs = filterAccountsByProvider(browserAccounts, pk);
              const meta = providerMeta[pk];
              const sel = (currentProject.accountSelections || {})[pk] || "auto";
              return React.createElement("div", {
                key: pk,
                title: `Tài khoản ${meta.label} sẽ dùng để chạy dự án "${currentProject.name}" — chọn đúng account để dễ chia việc & kiểm tra lại sau`,
                className: "flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-white/[0.04] border border-white/10"
              },
                React.createElement("span", { className: "text-xs" }, meta.icon),
                accs.length > 0 ? React.createElement("select", {
                  value: accs.some(a => a.accountId === sel) ? sel : "auto",
                  onChange: e => handleSelectProjectAccount(currentProject.id, pk, e.target.value),
                  className: "bg-transparent text-xs font-semibold text-slate-200 outline-none cursor-pointer max-w-[130px] truncate"
                },
                  React.createElement("option", { value: "auto", className: "bg-[#0B0F17] text-amber-300" }, "🔄 Tự động chia"),
                  accs.map(a => React.createElement("option", { key: a.accountId, value: a.accountId, className: "bg-[#0B0F17] text-slate-200" }, a.accountName || a.accountDisplayName || a.accountEmail || a.accountId))
                ) : React.createElement("span", { className: "text-xs text-slate-500" }, `Chưa có ${meta.label}`)
              );
            });
          })()
        ),

        // NÚT CHẠY TẠO VIDEO CHO DỰ ÁN NÀY (LUÔN SÁNG VÀ SẴN SÀNG CHẠY)
        React.createElement("div", { className: "flex items-center gap-3" },
          currentProject.isRunning && React.createElement("div", {
            className: "text-xs font-semibold text-amber-300 flex items-center gap-2 animate-pulse"
          },
            React.createElement("span", { className: "w-2.5 h-2.5 rounded-full bg-amber-400" }),
            currentProject.progressText || "Đang xử lý kịch bản..."
          ),

          currentProject.isPaused && React.createElement("div", {
            className: "text-xs font-semibold text-sky-300 flex items-center gap-2"
          }, currentProject.isRunning ? "⏸️ Đang tạm dừng — chờ cảnh đang tạo xong" : "⏸️ Đã tạm dừng — sửa / thêm prompt rồi bấm Tiếp tục"),

          // Tạm dừng ↔ Tiếp tục
          currentProject.isRunning && !currentProject.isPaused && React.createElement("button", {
            onClick: () => pauseStoryProject(currentProject.id),
            title: "Cảnh đang tạo vẫn chạy xong, dây chuyền dừng trước cảnh kế tiếp để sửa / thêm prompt",
            className: "inline-flex items-center gap-1 px-3 py-2 rounded-xl text-xs font-bold text-amber-200 bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/40 cursor-pointer shadow transition-all"
          }, "⏸️ Tạm dừng"),
          currentProject.isPaused && React.createElement("button", {
            onClick: () => resumeStoryProject(currentProject.id),
            title: "Nhận prompt / thông tin mới nhất rồi tạo tiếp, nối frame cuối cảnh trước",
            className: "inline-flex items-center gap-1 px-3 py-2 rounded-xl text-xs font-bold text-emerald-200 bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-500/40 cursor-pointer shadow transition-all"
          }, "▶️ Tiếp tục"),

          // Đặt lại: xóa hết video, tạo lại từ Cảnh 1 với nguyên thông tin
          (currentProject.isRunning || currentProject.isPaused || (currentProject.completedVideos || []).length > 0) && React.createElement("button", {
            onClick: () => resetStoryProject(currentProject.id),
            title: "Dừng và xóa toàn bộ video của dự án (giữ prompt, ảnh, cài đặt) — không tự chạy",
            className: "inline-flex items-center gap-1 px-3 py-2 rounded-xl text-xs font-bold text-rose-300 bg-rose-500/20 hover:bg-rose-500/30 border border-rose-500/30 cursor-pointer shadow transition-all"
          }, "🔁 Đặt lại"),

          // Nút Biên Tập Video — mở Video Editor với các video của dự án này
          React.createElement("button", {
            onClick: () => {
              const assetIds = (currentProject.completedVideos || [])
                .slice().sort((a, b) => a.sceneNum - b.sceneNum)
                .map(v => v.id).filter(Boolean);
              if (assetIds.length === 0) {
                toast.warning("Dự án chưa có video hoàn tất nào để biên tập!");
                return;
              }
              // Mở bảng dựng phim NGAY tại Studio Kịch Bản — không điều hướng đi đâu cả.
              // Mỗi dự án có bảng dựng phim riêng, chỉ chứa đúng video của dự án đó.
              openProjectMergeEditor(assetIds);
            },
            disabled: currentProject.completedVideos.length === 0,
            title: currentProject.completedVideos.length === 0
              ? "Cần có ít nhất 1 video hoàn tất để biên tập"
              : `Mở phòng dựng với ${currentProject.completedVideos.length} video của dự án này`,
            className: `inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold shadow transition-all cursor-pointer ${
              currentProject.completedVideos.length === 0
                ? "bg-slate-700/50 text-slate-500 cursor-not-allowed opacity-50"
                : "bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white shadow-[0_2px_12px_rgba(79,70,229,0.4)] hover:scale-[1.02]"
            }`
          },
            "🎞️ Biên Tập Video",
            currentProject.completedVideos.length > 0 && React.createElement("span", {
              className: "bg-white/20 text-white px-1.5 py-0.5 rounded text-[10px]"
            }, `${currentProject.completedVideos.length} clip`)
          ),

          React.createElement("button", {
            onClick: () => handleRunProject(currentProject.id),
            disabled: currentProject.isRunning || currentProject.isPaused || currentProject.prompts.length === 0,
            className: `inline-flex items-center gap-2 px-5 py-2 rounded-xl text-xs font-bold text-white shadow-lg transition-all cursor-pointer ${
              currentProject.isRunning || currentProject.isPaused
                ? "bg-slate-700 opacity-60 cursor-not-allowed"
                : "bg-gradient-to-r from-violet-600 via-purple-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 shadow-[0_4px_20px_rgba(124,58,237,0.45)] hover:scale-[1.03]"
            }`
          },
            "🎬 TẠO VIDEO KỊCH BẢN",
            React.createElement("span", {
              className: "bg-white/20 text-white px-1.5 py-0.5 rounded text-[10px]"
            }, `${currentProject.prompts.length} cảnh`)
          )
        )
      ),

      // VÙNG CẢNH CUỘN RIÊNG — thanh công cụ đứng yên phía trên
      React.createElement("div", {
        className: "flex-1 min-h-0 overflow-y-auto flex flex-col gap-4",
        style: { paddingBottom: 16, paddingRight: 4 }
      },

      // THANH TÌM KIẾM & THỐNG KÊ
      React.createElement("div", {
        className: "flex items-center gap-3 flex-wrap"
      },
        React.createElement("div", { className: "relative flex-1 min-w-[200px]" },
          React.createElement("span", {
            className: "absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-500 text-xs pointer-events-none"
          }, "🔍"),
          React.createElement("input", {
            type: "text",
            value: searchQuery,
            onChange: e => setSearchQuery(e.target.value),
            placeholder: "Tìm kiếm prompt video...",
            className: "w-full bg-[#0B0F17] text-white text-xs border border-white/10 rounded-lg pl-7 pr-3 py-1.5 outline-none focus:border-violet-500 transition-colors"
          })
        ),
        React.createElement("div", { className: "flex items-center gap-2 text-xs font-mono shrink-0" },
          React.createElement("span", { className: "px-2.5 py-1 rounded-md bg-white/[0.05] border border-white/10 text-slate-400" },
            `${currentProject.prompts.length} prompt`
          ),
          React.createElement("span", { className: "px-2.5 py-1 rounded-md bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 font-semibold" },
            `${currentProject.completedVideos.length} video`
          )
        )
      ),

      // DANH SÁCH CÁC CẢNH PHIM TRONG DỰ ÁN (TỐI GIẢN - NỐI TIẾP CẢNH CHUẨN)
      // LƯỚI Ô CẢNH: mỗi cảnh một ô nhỏ, xếp ngang, hết chỗ thì xuống hàng
      React.createElement("div", {
        className: "flex flex-col gap-3",
        style: filteredScenes.length > 0 ? { display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(360px, 1fr))", gap: 12, alignItems: "start" } : undefined
      },
        currentProject.prompts.length === 0
          ? React.createElement("div", {
              className: "p-12 text-center border-2 border-dashed border-white/10 rounded-2xl bg-white/[0.01]"
            },
              React.createElement("p", { className: "text-slate-400 text-sm mb-3" }, "Dự án này chưa có cảnh phim nào."),
              React.createElement("button", {
                onClick: () => setIsBulkImportOpen(true),
                className: "px-4 py-2 bg-violet-600 text-white rounded-lg text-xs font-semibold shadow hover:bg-violet-500 transition-all cursor-pointer"
              }, "📥 Bấm vào đây để nhập danh sách prompt")
            )
          : filteredScenes.length === 0
          ? React.createElement("div", {
              className: "p-6 text-center border border-dashed border-white/10 rounded-xl text-slate-500 text-xs"
            }, `Không tìm thấy cảnh nào với từ khóa "${searchQuery}"`)
          : filteredScenes.map((scene, idx) => {
              const refImgs = Array.isArray(scene.refImageUrls) && scene.refImageUrls.length > 0
                ? scene.refImageUrls
                : (scene.refImageUrl ? [scene.refImageUrl] : []);
              const completedVid = (currentProject.completedVideos || []).find(v => v.sceneNum === scene.index);

              return React.createElement("div", {
                key: scene.id,
                className: `flex flex-col gap-2 p-3 rounded-xl border transition-all ${
                  scene.status === "Running"
                    ? "border-amber-400/80 bg-amber-500/10 shadow-[0_0_15px_rgba(245,158,11,0.2)]"
                    : scene.status === "Failed"
                    ? "border-red-500/60 bg-red-500/5 shadow-[0_0_15px_rgba(239,68,68,0.15)]"
                    : scene.status === "Completed"
                    ? "border-emerald-500/40 bg-emerald-500/5"
                    : "border-white/[0.08] bg-[#101726]"
                }`,
                style: { minWidth: 0 }
              },
                // Cột 1: Thứ tự cảnh & Nhãn chế độ tự động
                React.createElement("div", { className: "flex items-center gap-2" },
                  React.createElement("div", { className: "flex items-center gap-2" },
                    React.createElement("span", {
                      className: "w-6 h-6 rounded-md bg-violet-600/30 text-violet-300 border border-violet-500/40 flex items-center justify-center text-xs font-bold font-mono"
                    }, scene.index),
                    React.createElement("span", { className: "text-xs font-bold text-white" }, `Cảnh ${scene.index}`)
                  ),
                  React.createElement("span", {
                    className: "text-[10px] text-slate-400 font-semibold"
                  }, idx === 0 ? "Mở đầu" : "🔗 Nối tiếp")
                ),

                // Hàng ảnh tham chiếu (trái) — video, tạo lại, xóa (phải)
                React.createElement("div", { style: { display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 8 } },
                // Cột 2: Ảnh tham chiếu — nhiều ảnh không giới hạn
                React.createElement("div", { className: "shrink-0 flex flex-col gap-1 max-w-[220px]" },
                  React.createElement("div", { className: "flex items-center justify-between" },
                    React.createElement("span", { className: "text-[10px] text-slate-500 font-semibold" },
                      idx === 0 ? "Ảnh đầu vào" : "Ảnh tham chiếu"
                    ),
                    refImgs.length > 0 && React.createElement("button", {
                      onClick: e => handleClearReferenceImage(scene.id, e),
                      title: "Xóa tất cả ảnh tham chiếu",
                      className: "text-[9px] text-red-400 hover:text-red-300 cursor-pointer"
                    }, "Xóa hết")
                  ),
                  React.createElement("div", { className: "flex items-center gap-1 flex-wrap" },
                    // Frame cuối cảnh trước (auto, chỉ hiện cảnh 2+)
                    idx > 0 && scene.lastExtractedFrameUrl && React.createElement("div", {
                      className: "relative w-10 h-10 rounded-md overflow-hidden border border-amber-400/60 shrink-0 cursor-pointer",
                      onClick: () => setSelectedImage(scene.lastExtractedFrameUrl),
                      title: "Frame cuối cảnh trước (tự động nối tiếp) — bấm để xem to"
                    },
                      React.createElement("img", {
                        src: scene.lastExtractedFrameUrl,
                        alt: "Frame cuối",
                        className: "w-full h-full object-cover"
                      }),
                      React.createElement("div", {
                        className: "absolute bottom-0 left-0 right-0 bg-amber-500/85 text-black text-[7px] font-bold text-center"
                      }, "auto")
                    ),
                    // Các ảnh tham chiếu user đã nạp
                    ...refImgs.map((url, imgIdx) =>
                      React.createElement("div", {
                        key: imgIdx,
                        className: "relative w-10 h-10 rounded-md overflow-hidden border border-violet-400/50 shrink-0 group/img cursor-pointer",
                        onClick: () => setSelectedImage(url),
                        title: "Bấm để xem ảnh to"
                      },
                        React.createElement("img", {
                          src: url,
                          alt: `Ảnh ${imgIdx + 1}`,
                          className: "w-full h-full object-cover"
                        }),
                        React.createElement("button", {
                          onClick: e => handleClearOneRefImage(scene.id, imgIdx, e),
                          title: "Xóa ảnh này",
                          className: "absolute top-0 right-0 w-3.5 h-3.5 bg-red-600/90 text-white flex items-center justify-center text-[9px] font-bold rounded-bl-md opacity-0 group-hover/img:opacity-100 transition-opacity cursor-pointer"
                        }, "×")
                      )
                    ),
                    // Nút thêm ảnh
                    React.createElement("button", {
                      onClick: () => handlePickReferenceImage(scene.id),
                      title: "Thêm ảnh tham chiếu (có thể chọn nhiều ảnh cùng lúc)",
                      className: "w-10 h-10 rounded-md border border-dashed border-white/20 bg-black/40 hover:border-violet-400 hover:bg-violet-500/10 flex items-center justify-center text-slate-500 hover:text-violet-300 transition-colors cursor-pointer text-xl shrink-0 font-light"
                    }, "+")
                  )
                ),

                // Cột 5: Thumbnail video kết quả + Trạng thái + Thao tác
                React.createElement("div", { className: "flex items-center gap-2 shrink-0 justify-end", style: { paddingTop: 16 } },
                  // Thumbnail video kết quả (chỉ hiện khi đã có video)
                  scene.videoUrl
                    ? React.createElement("div", {
                        className: "relative w-10 h-10 rounded-md overflow-hidden border border-emerald-500/60 cursor-pointer shrink-0 group/vid shadow-[0_0_8px_rgba(16,185,129,0.3)]",
                        onClick: () => setSelectedVideo(scene.videoUrl),
                        title: `Xem video kết quả Cảnh ${scene.index}`
                      },
                        React.createElement("video", {
                          src: scene.videoUrl,
                          className: "w-full h-full object-cover"
                        }),
                        React.createElement("div", {
                          className: "absolute inset-0 bg-black/40 group-hover/vid:bg-black/10 flex items-center justify-center text-white text-sm transition-all"
                        }, "▶")
                      )
                    : scene.status === "Running"
                    ? React.createElement("div", {
                        className: "w-10 h-10 rounded-md border border-amber-400/40 bg-amber-500/10 flex items-center justify-center shrink-0"
                      },
                        React.createElement("span", { className: "text-amber-300 text-xs animate-pulse" }, "⚡")
                      )
                    : scene.status === "Failed"
                    ? React.createElement("div", {
                        className: "w-10 h-10 rounded-md border border-red-500/50 bg-red-500/10 flex items-center justify-center shrink-0",
                        title: scene.error || "Cảnh gặp lỗi"
                      },
                        React.createElement("span", { className: "text-red-400 text-xs" }, "❌")
                      )
                    : null,

                  // Label trạng thái
                  scene.status === "Running" && React.createElement("span", {
                    className: "text-xs text-amber-300 font-semibold animate-pulse"
                  }, "Đang tạo"),

                  scene.status === "Completed" && !scene.videoUrl && React.createElement("span", {
                    className: "text-xs text-emerald-400 font-semibold"
                  }, "✓ Xong"),

                  scene.status === "Pending" && React.createElement("span", {
                    className: "text-xs text-slate-500 font-semibold"
                  }, "Chờ"),

                  // Nút Tạo lại cho mọi cảnh đã tạo xong (lỗi hay thành công): xóa video từ cảnh này trở xuống,
                  // giữ prompt, chạy lại từ frame cuối cảnh liền trước
                  (scene.status === "Failed" || scene.status === "Completed" || !!scene.videoUrl) && React.createElement("button", {
                    onClick: () => handleRetryScene(scene.id),
                    title: scene.status === "Failed"
                      ? (scene.error ? `Lỗi: ${scene.error} — bấm để tạo lại từ cảnh này` : "Cảnh này gặp lỗi, bấm để tạo lại từ cảnh này")
                      : "Tạo lại từ cảnh này: xóa video cảnh này và các cảnh phía dưới (giữ prompt), chạy lại từ frame cuối cảnh trước",
                    className: scene.status === "Failed"
                      ? "inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-red-600/20 border border-red-500/50 text-red-300 hover:bg-red-600/30 hover:text-red-200 text-[10px] font-bold transition-colors cursor-pointer whitespace-nowrap"
                      : "inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-violet-600/20 border border-violet-500/50 text-violet-200 hover:bg-violet-600/30 hover:text-white text-[10px] font-bold transition-colors cursor-pointer whitespace-nowrap"
                  }, "🔄 Tạo lại"),

                  React.createElement("button", {
                    onClick: () => handleDeleteScene(scene.id),
                    title: "Xóa cảnh này",
                    className: "p-1.5 text-slate-500 hover:text-red-400 rounded-lg hover:bg-white/5 transition-colors cursor-pointer text-sm"
                  }, "🗑️")
                )
                ),

                // Cột 3: Khung Prompt (Gõ trực tiếp thoải mái select-text)
                React.createElement("div", { className: "flex-1 min-w-0 w-full" },
                  React.createElement("textarea", {
                    value: scene.prompt,
                    onChange: e => handleUpdateScene(scene.id, { prompt: e.target.value }),
                    placeholder: `Mô tả nội dung cho Cảnh ${scene.index}...`,
                    rows: 3,
                    className: "w-full bg-[#0B0F17] text-white text-xs border border-white/10 rounded-lg p-2 outline-none focus:border-violet-500 transition-colors resize-none leading-relaxed select-text"
                  })
                ),

                // Cột 4: Nền tảng, Tỷ lệ, Thời lượng
                React.createElement("div", { className: "flex items-center gap-2 flex-wrap" },
                  React.createElement("select", {
                    value: scene.provider,
                    onChange: e => handleUpdateScene(scene.id, {
                      provider: e.target.value,
                      model: e.target.value === "Muse AI" ? "muse-video" : (e.target.value === "Grok" ? "grok-imagine-video" : "Veo 3.1 - Fast"),
                      duration: e.target.value === "Muse AI" ? "10s" : (e.target.value === "Grok" ? "6s" : "8s")
                    }),
                    className: "bg-[#0B0F17] text-white text-xs border border-white/10 rounded-lg px-2 py-1.5 outline-none cursor-pointer font-semibold"
                  },
                    React.createElement("option", { value: "Muse AI" }, "Muse AI"),
                    React.createElement("option", { value: "Veo3" }, "Veo 3"),
                    React.createElement("option", { value: "Grok" }, "Grok")
                  ),

                  !scene.provider.includes("Muse") && !scene.provider.includes("Grok") && React.createElement("select", {
                    value: scene.model || "Veo 3.1 - Fast",
                    onChange: e => handleUpdateScene(scene.id, { model: e.target.value }),
                    className: "bg-[#0B0F17] text-slate-300 text-xs border border-white/10 rounded-lg px-2 py-1.5 outline-none cursor-pointer"
                  },
                    React.createElement("option", { value: "Omni 1.2 Flash" }, "Omni 1.2 Flash"),
                    React.createElement("option", { value: "Omni 1.1 Flash" }, "Omni Flash"),
                    React.createElement("option", { value: "Veo 3.1 - Lite" }, "3.1 Lite"),
                    React.createElement("option", { value: "Veo 3.1 Lite [LowPriority]" }, "3.1 Lite LP"),
                    React.createElement("option", { value: "Veo 3.1 - Fast" }, "3.1 Fast"),
                    React.createElement("option", { value: "Veo 3.1 - Quality" }, "3.1 Quality")
                  ),

                  React.createElement("select", {
                    value: scene.ratio,
                    onChange: e => handleUpdateScene(scene.id, { ratio: e.target.value }),
                    className: "bg-[#0B0F17] text-white text-xs border border-white/10 rounded-lg px-2 py-1.5 outline-none cursor-pointer"
                  },
                    React.createElement("option", { value: "16:9" }, "16:9"),
                    React.createElement("option", { value: "9:16" }, "9:16"),
                    React.createElement("option", { value: "1:1" }, "1:1")
                  ),

                  React.createElement("select", {
                    value: scene.duration || (scene.provider === "Muse AI" ? "10s" : "8s"),
                    onChange: e => handleUpdateScene(scene.id, { duration: e.target.value }),
                    className: "bg-[#0B0F17] text-slate-300 text-xs border border-white/10 rounded-lg px-2 py-1.5 outline-none cursor-pointer font-mono"
                  },
                    React.createElement("option", { value: "5s" }, "5s"),
                    React.createElement("option", { value: "6s" }, "6s"),
                    React.createElement("option", { value: "8s" }, "8s"),
                    React.createElement("option", { value: "10s" }, "10s")
                  )
                )
              );
            })
      ),

      // ======================================================================
      // PHẦN KẾT QUẢ: CHỈ HIỆN PHIM GHÉP HOÀN CHỈNH
      // ======================================================================
      currentProject.completedMovie && React.createElement("div", {
        className: "mt-4 border-t border-white/[0.08] pt-4"
      },
        React.createElement("div", {
          className: "p-5 rounded-2xl bg-gradient-to-r from-violet-950/50 via-indigo-950/40 to-purple-950/50 border border-violet-500/50 shadow-[0_0_30px_rgba(139,92,246,0.3)] flex flex-col md:flex-row items-center gap-5"
        },
          React.createElement("div", {
            className: "w-full md:w-72 h-40 rounded-xl bg-black overflow-hidden relative group cursor-pointer shrink-0 shadow-lg border border-violet-500/30",
            onClick: () => setSelectedVideo(currentProject.completedMovie.videoUrl)
          },
            React.createElement("video", {
              src: currentProject.completedMovie.videoUrl,
              className: "w-full h-full object-cover"
            }),
            React.createElement("div", {
              className: "absolute inset-0 bg-black/40 flex items-center justify-center text-4xl text-white group-hover:scale-110 transition-transform"
            }, "▶")
          ),
          React.createElement("div", { className: "flex-1 min-w-0" },
            React.createElement("div", { className: "flex items-center gap-2 mb-1.5" },
              React.createElement("span", { className: "text-xs font-bold bg-amber-400 text-black px-2.5 py-0.5 rounded-md shadow" }, "🏆 PHIM HOÀN CHỈNH (GHÉP TỰ ĐỘNG)"),
              React.createElement("span", { className: "text-xs text-slate-400 font-mono" }, currentProject.completedMovie.duration + "s")
            ),
            React.createElement("h3", { className: "text-base font-bold text-white truncate mb-2" }, currentProject.completedMovie.name),
            React.createElement("p", { className: "text-xs text-slate-300 mb-3" },
              `Đã tự động ghép toàn bộ ${currentProject.completedVideos.length} phân cảnh với hiệu ứng chuyển cảnh chuẩn điện ảnh.`
            ),
            React.createElement("div", { className: "flex items-center gap-2.5" },
              React.createElement("button", {
                onClick: () => setSelectedVideo(currentProject.completedMovie.videoUrl),
                className: "px-4 py-2 bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white rounded-lg text-xs font-bold cursor-pointer shadow-lg"
              }, "▶ Xem Phim Toàn Màn Hình"),
              React.createElement("button", {
                onClick: () => handleOpenFolder(currentProject.completedMovie.localPath),
                className: "px-3.5 py-2 bg-white/10 hover:bg-white/20 text-slate-200 rounded-lg text-xs font-semibold cursor-pointer border border-white/10"
              }, "📁 Mở Thư Mục Chứa Phim")
            )
          )
        )
      )
    
      )),

    // ========================================================================
    // MODAL XEM VIDEO PHÓNG TO (FULLSCREEN VIDEO VIEWER)
    // ========================================================================
    selectedVideo && React.createElement("div", {
      className: "fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-4",
      onClick: () => setSelectedVideo(null)
    },
      React.createElement("div", {
        className: "relative max-w-4xl w-full bg-[#0F172A] rounded-2xl overflow-hidden border border-white/20 shadow-2xl",
        onClick: e => e.stopPropagation()
      },
        React.createElement("video", {
          src: selectedVideo,
          controls: true,
          autoPlay: true,
          className: "w-full max-h-[75vh] object-contain bg-black"
        }),
        React.createElement("button", {
          onClick: () => setSelectedVideo(null),
          className: "absolute top-3 right-3 w-8 h-8 rounded-full bg-black/60 text-white flex items-center justify-center text-lg border border-white/20 hover:bg-black/90 cursor-pointer"
        }, "×")
      )
    ),

    // ========================================================================
    // MODAL XEM ẢNH THAM CHIẾU / FRAME CUỐI PHÓNG TO
    // ========================================================================
    selectedImage && React.createElement("div", {
      className: "fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-4",
      onClick: () => setSelectedImage(null)
    },
      React.createElement("div", {
        className: "relative max-w-4xl w-full bg-[#0F172A] rounded-2xl overflow-hidden border border-white/20 shadow-2xl",
        onClick: e => e.stopPropagation()
      },
        React.createElement("img", {
          src: selectedImage,
          className: "w-full max-h-[75vh] object-contain bg-black"
        }),
        React.createElement("button", {
          onClick: () => setSelectedImage(null),
          className: "absolute top-3 right-3 w-8 h-8 rounded-full bg-black/60 text-white flex items-center justify-center text-lg border border-white/20 hover:bg-black/90 cursor-pointer"
        }, "×")
      )
    ),

    // ========================================================================
    // BẢNG DỰNG PHIM (BIÊN TẬP VIDEO) — nhúng trực tiếp, riêng cho từng dự án,
    // chỉ chứa đúng video của dự án đang mở, không lẫn video dự án khác.
    // ========================================================================
    mergeEditorAssetIds && MergeModalComp && React.createElement(MergeModalComp, {
      key: mergeEditorAssetIds.join(":"),
      isOpen: true,
      initialAssetIds: mergeEditorAssetIds,
      allowedAssetIds: mergeEditorAssetIds,
      onClose: () => setMergeEditorAssetIds(null)
    }),

    // ========================================================================
    // MODAL NHẬP HÀNG LOẠT PROMPT CHO DỰ ÁN (HỖ TRỢ DÁN CLIPBOARD & GÕ CHUẨN)
    // ========================================================================
    isBulkImportOpen && React.createElement("div", {
      className: "fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4",
      onClick: () => setIsBulkImportOpen(false)
    },
      React.createElement("div", {
        className: "relative max-w-2xl w-full bg-[#101726] rounded-2xl overflow-hidden border border-white/20 shadow-2xl p-5 flex flex-col gap-4 select-text",
        onClick: e => e.stopPropagation()
      },
        React.createElement("div", { className: "flex items-center justify-between border-b border-white/10 pb-3" },
          React.createElement("h3", { className: "text-sm font-bold text-white flex items-center gap-2" },
            "📥 Nhập Danh Sách Prompt Kịch Bản Cho:",
            React.createElement("span", { className: "text-violet-400" }, currentProject?.name)
          ),
          React.createElement("button", {
            onClick: () => setIsBulkImportOpen(false),
            className: "text-slate-400 hover:text-white text-lg cursor-pointer"
          }, "×")
        ),

        React.createElement("div", { className: "flex items-center justify-between text-xs text-slate-400" },
          React.createElement("span", null, "Mỗi dòng là một cảnh phim (hoặc Cảnh 1, Cảnh 2...)."),
          React.createElement("div", { className: "flex items-center gap-2" },
            React.createElement("button", {
              onClick: handlePasteClipboard,
              className: "px-2.5 py-1 bg-emerald-600/20 text-emerald-300 border border-emerald-500/30 rounded-md font-semibold hover:bg-emerald-600/30 cursor-pointer transition-all flex items-center gap-1"
            }, "📋 Dán Clipboard"),
            React.createElement("button", {
              onClick: handlePasteSample,
              className: "px-2.5 py-1 bg-violet-600/20 text-violet-300 border border-violet-500/30 rounded-md font-semibold hover:bg-violet-600/30 cursor-pointer transition-all flex items-center gap-1"
            }, "✨ Dán Mẫu Thử (3 Cảnh)")
          )
        ),

        React.createElement("textarea", {
          value: bulkPromptText,
          onChange: e => setBulkPromptText(e.target.value),
          placeholder: "Dán hoặc gõ danh sách prompt vào đây:\n\nCảnh 1: Cô gái mặc áo len xám đi dạo công viên mùa thu lá vàng rơi...\nCảnh 2: Máy quay lia cận cảnh nụ cười rạng rỡ của cô gái ngắm nhìn hồ nước...\nCảnh 3: Cô gái ngồi xuống ghế gỗ dài đọc sách yên bình...",
          rows: 9,
          autoFocus: true,
          className: "w-full bg-[#0B0F17] text-white text-xs border border-white/15 rounded-xl p-3 outline-none focus:border-violet-500 font-sans leading-relaxed resize-none select-text focus:ring-1 focus:ring-violet-500"
        }),

        React.createElement("div", { className: "flex items-center justify-end gap-3 pt-2" },
          React.createElement("button", {
            onClick: () => setIsBulkImportOpen(false),
            className: "px-4 py-2 rounded-lg bg-white/5 hover:bg-white/10 text-slate-300 text-xs font-semibold cursor-pointer"
          }, "Hủy"),
          React.createElement("button", {
            onClick: handleBulkImport,
            disabled: !bulkPromptText.trim(),
            className: "px-5 py-2 rounded-lg bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white text-xs font-bold cursor-pointer shadow disabled:opacity-50"
          }, "✓ Nạp Vào Dự Án")
        )
      )
    )
  );
}
