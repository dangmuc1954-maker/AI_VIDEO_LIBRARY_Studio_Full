/**
 * ==============================================================================================
 * AIFORGE STUDIO - DEDICATED VIDEO EDITOR & AUTO-MERGE ENGINE
 * Module độc lập, chuyên biệt: "Ghép tự động" & "Biên tập video"
 * Tương thích 100% giao diện, phong cách và nghiệp vụ của AIForge Studio gốc.
 * Được tối ưu hóa cho AIForge_Veo3_Studio (Bản thương mại của Tris).
 * ==============================================================================================
 */

(function () {
  'use strict';

  // Tránh nạp trùng lặp module
  if (window.__AIFORGE_VIDEO_EDITOR_AUTOMERGE_INITIALIZED__) {
    console.log('[VideoEditor] Module already initialized.');
    return;
  }
  window.__AIFORGE_VIDEO_EDITOR_AUTOMERGE_INITIALIZED__ = true;
  function getSceneTitleForAsset(asset, idx) {
    if (!asset) return 'Cảnh ' + (idx != null ? (idx + 1) : 1);
    const aid = asset.id || asset.assetId || '';
    const jid = asset.jobId || '';
    let map = {};
    try {
      if (typeof window !== 'undefined') {
        map = window.__aiforge_scene_names || {};
        if ((!aid || !map[aid]) && (!jid || !map[jid]) && window.localStorage) {
          const loc = JSON.parse(window.localStorage.getItem('vs_scene_names') || '{}');
          Object.assign(map, loc);
        }
      }
    } catch (_) {}
    const resolved = (aid && map[aid]) || (jid && map[jid]) || asset.sceneName || asset.title || '';
    if (resolved && resolved.trim()) return resolved.trim();
    if (asset.name && !asset.name.startsWith('generated-video-') && !asset.name.startsWith('video-')) {
      return asset.name.replace(/\.[a-zA-Z0-9]+$/, '');
    }
    return 'Cảnh ' + (idx != null ? (idx + 1) : 1);
  }


  // --------------------------------------------------------------------------------------------
  // 1. STATE MANAGEMENT TOÀN CỤC CỦA MODULE
  // --------------------------------------------------------------------------------------------
  const STORAGE_KEY_AUTO_MERGE = 'aiforge_auto_merge_enabled';
  let isAutoMergeEnabled = false; // Tris: Luôn mặc định TẮT khi mở app // Mặc định ON

  let isEditorModalOpen = false;
  let timelineClips = []; // [{ id, assetId, name, prompt, url, localPath, duration, startTime, endTime, thumbnailUrl, width, height, aspectRatio }]
  let selectedClipId = null;
  let activeRatio = '16:9'; // '16:9' | '9:16' | '1:1' | 'fit'
  let activeTransition = 'none'; // 11 hiệu ứng FFmpeg
  let activeTab = 'media'; // 'media' | 'transitions'
  let searchQuery = '';
  let isExporting = false;
  let lastExportedAsset = null;
  let showExportCompleteDialog = false;

  // Player & Timeline State
  let isPlaying = false;
  let currentPlayheadTime = 0; // thời gian hiện tại trên toàn bộ timeline (giây)
  let activePlaybackEngineIndex = 0; // 0: Player A, 1: Player B (Dual Player Engine)
  let undoHistory = [];
  let redoHistory = [];

  // Auto-Merge Engine State
  let previousActiveJobsCount = 0;
  let isAutoMergeInProgress = false;
  let videoAssetsCache = [];

  // --------------------------------------------------------------------------------------------
  // 2. DANH SÁCH 11 HIỆU ỨNG CHUYỂN CẢNH ĐIỆN ẢNH CHUẨN FFMPEG
  // --------------------------------------------------------------------------------------------
  const TRANSITIONS = [
    { id: 'none', label: 'Không chuyển cảnh', desc: 'Cắt nối tiếp tự nhiên trực tiếp giữa các phân đoạn' },
    { id: 'dissolve', label: 'Hòa tan (Crossfade)', desc: 'Hai cảnh mờ dần và hòa quyện vào nhau mượt mà' },
    { id: 'fade', label: 'Chuyển mờ (Fade)', desc: 'Mờ chuyển cảnh qua màu xám trung tính điện ảnh' },
    { id: 'fadeblack', label: 'Mờ đen (Fade to Black)', desc: 'Chuyển tiếp tối đen phong cách phim Hollywood' },
    { id: 'slideleft', label: 'Trượt trái (Slide Left)', desc: 'Cảnh mới trượt từ phải sang trái đẩy cảnh trước' },
    { id: 'slideright', label: 'Trượt phải (Slide Right)', desc: 'Cảnh mới trượt từ trái sang phải' },
    { id: 'wipeleft', label: 'Gạt trái (Wipe Left)', desc: 'Hiệu ứng gạt ngang quét sạch sang trái' },
    { id: 'wiperight', label: 'Gạt phải (Wipe Right)', desc: 'Hiệu ứng gạt ngang quét sạch sang phải' },
    { id: 'circleopen', label: 'Vòng tròn mở (Circle Open)', desc: 'Hiệu ứng mở rộng từ tâm hình tròn' },
    { id: 'circleclose', label: 'Vòng tròn đóng (Circle Close)', desc: 'Hiệu ứng thu hẹp về tâm hình tròn' },
    { id: 'wipeup', label: 'Gạt lên (Wipe Up)', desc: 'Quét màn hình từ dưới lên trên' }
  ];

  // --------------------------------------------------------------------------------------------
  // 3. TOAST NOTIFICATION HỆ THỐNG
  // --------------------------------------------------------------------------------------------
  function showToast(message, type = 'info', duration = 4500) {
    let container = document.getElementById('aiforge-toast-container');
    if (!container) {
      container = document.createElement('div');
      container.id = 'aiforge-toast-container';
      container.className = 'fixed bottom-5 right-5 z-[999999] flex flex-col gap-2.5 pointer-events-none';
      document.body.appendChild(container);
    }

    const toast = document.createElement('div');
    toast.className = `pointer-events-auto flex items-center gap-3 px-4 py-3 rounded-xl border text-xs font-semibold shadow-2xl transition-all duration-300 transform translate-y-3 opacity-0 ${
      type === 'success'
        ? 'bg-[#064e3b]/95 border-emerald-500/50 text-emerald-100 shadow-emerald-950/60'
        : type === 'error'
        ? 'bg-[#4c0519]/95 border-rose-500/50 text-rose-100 shadow-rose-950/60'
        : 'bg-[#1e1b4b]/95 border-indigo-500/50 text-indigo-100 shadow-indigo-950/60'
    }`;

    const iconSvg =
      type === 'success'
        ? '<svg class="w-4 h-4 text-emerald-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.2" d="M5 13l4 4L19 7"/></svg>'
        : type === 'error'
        ? '<svg class="w-4 h-4 text-rose-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.2" d="M6 18L18 6M6 6l12 12"/></svg>'
        : '<svg class="w-4 h-4 text-indigo-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>';

    toast.innerHTML = `${iconSvg}<span class="leading-relaxed">${message}</span>`;
    container.appendChild(toast);

    requestAnimationFrame(() => {
      toast.classList.remove('translate-y-3', 'opacity-0');
    });

    setTimeout(() => {
      toast.classList.add('opacity-0', 'translate-x-4');
      setTimeout(() => toast.remove(), 350);
    }, duration);
  }

  // --------------------------------------------------------------------------------------------
  // 4. TIỆN ÍCH THỜI GIAN & TOÁN HỌC TIMELINE
  // --------------------------------------------------------------------------------------------
  function formatTime(seconds) {
    if (!Number.isFinite(seconds) || seconds < 0) return '00:00.0';
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    const ms = Math.floor((seconds % 1) * 10);
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}.${ms}`;
  }

  function formatTimeShort(seconds) {
    if (!Number.isFinite(seconds) || seconds < 0) return '00:00';
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  }

  function calculateTotalDuration() {
    if (timelineClips.length === 0) return 0;
    let total = 0;
    timelineClips.forEach(c => {
      const start = Number(c.startTime) || 0;
      const end = Number(c.endTime) || Number(c.duration) || 5;
      total += Math.max(0.1, end - start);
    });
    return Math.max(0.1, total);
  }

  function getGlobalTimelineSegments() {
    let cursor = 0;
    return timelineClips.map((c, i) => {
      const start = Number(c.startTime) || 0;
      const end = Number(c.endTime) || Number(c.duration) || 5;
      const dur = Math.max(0.1, end - start);
      const gStart = cursor;
      const gEnd = cursor + dur;
      cursor += dur;
      return {
        index: i,
        clip: c,
        globalStart: gStart,
        globalEnd: gEnd,
        duration: dur
      };
    });
  }

  function pushHistory() {
    undoHistory.push(JSON.stringify(timelineClips));
    if (undoHistory.length > 50) undoHistory.shift();
    redoHistory = []; // Reset redo
  }

  function handleUndo() {
    if (undoHistory.length === 0) return;
    redoHistory.push(JSON.stringify(timelineClips));
    const previous = JSON.parse(undoHistory.pop());
    timelineClips = previous;
    showToast('↩️ Đã hoàn tác thao tác gần nhất', 'info', 1500);
    renderModalDOM();
  }

  function handleRedo() {
    if (redoHistory.length === 0) return;
    undoHistory.push(JSON.stringify(timelineClips));
    const next = JSON.parse(redoHistory.pop());
    timelineClips = next;
    showToast('↪️ Đã làm lại thao tác', 'info', 1500);
    renderModalDOM();
  }

  // --------------------------------------------------------------------------------------------
  // 5. TẢI DANH SÁCH VIDEO ASSETS TỪ BACKEND
  // --------------------------------------------------------------------------------------------
  async function loadVideoAssets() {
    try {
      const api = window.aiforge?.assets || window.aivideo?.assets;
      if (!api?.list) return [];
      const list = await api.list();
      videoAssetsCache = (list || []).filter(a => a.type === 'video');
      return videoAssetsCache;
    } catch (e) {
      console.warn('[VideoEditor] loadVideoAssets error:', e);
      return [];
    }
  }

  // --------------------------------------------------------------------------------------------
  // 6. CƠ CHẾ GHÉP TỰ ĐỘNG (AUTO-MERGE RUNNER)
  // --------------------------------------------------------------------------------------------
  async function checkAndRunAutoMerge() {
    if (!isAutoMergeEnabled || isAutoMergeInProgress) return;

    const queueApi = window.aiforge?.queue || window.aivideo?.queue;
    const assetsApi = window.aiforge?.assets || window.aivideo?.assets;
    if (!queueApi?.list || !assetsApi?.mergeVideos) return;

    try {
      const jobs = await queueApi.list();
      const videoJobs = (jobs || []).filter(j => j.type === 'Video' || j.input?.type === 'Video');
      const activeJobs = videoJobs.filter(j => j.status === 'Running' || j.status === 'Queued');

      // Khi đợt tạo vừa kết thúc: trước đó có jobs đang chạy (> 0), hiện tại về 0
      if (previousActiveJobsCount > 0 && activeJobs.length === 0) {
        const completedJobs = videoJobs.filter(j => j.status === 'Completed');
        if (completedJobs.length >= 2) {
          const allAssets = await assetsApi.list();
          const videoAssets = (allAssets || []).filter(a => a.type === 'video');

          // Lấy đúng số lượng video hoàn tất gần nhất
          const targetAssets = videoAssets.slice(0, Math.min(completedJobs.length, 12)).reverse();
          if (targetAssets.length >= 2) {
            isAutoMergeInProgress = true;
            const assetIds = targetAssets.map(a => a.id);
            const now = new Date();
            const timeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}:${String(now.getSeconds()).padStart(2, '0')}`;
            const mergedName = `Tự động ghép ${assetIds.length} video - ${timeStr}.mp4`;

            showToast(`🎬 Đang tự động ghép nối ${assetIds.length} video theo đúng thứ tự prompt...`, 'info', 7000);

            try {
              const res = await assetsApi.mergeVideos(assetIds, 'none', {
                name: mergedName,
                source: 'video-studio'
              });
              lastExportedAsset = res;
              showToast(`✨ Tự động ghép hoàn tất ${assetIds.length} video! Tệp đã lưu vào thư viện.`, 'success', 8000);
            } catch (mergeErr) {
              console.error('[AutoMerge] Merge failed:', mergeErr);
              showToast(`❌ Tự động ghép thất bại: ${mergeErr.message || mergeErr}`, 'error', 6000);
            } finally {
              isAutoMergeInProgress = false;
            }
          }
        }
      }
      previousActiveJobsCount = activeJobs.length;
    } catch (err) {
      console.warn('[AutoMerge] Check error:', err);
    }
  }

  // Khởi động chu kỳ kiểm tra tự động ghép mỗi 3 giây
  // setInterval(checkAndRunAutoMerge, 3000); // Tắt tính năng tự động ghép ngầm không ổn định

  // --------------------------------------------------------------------------------------------
  // 7. RENDER NÚT "GHÉP TỰ ĐỘNG" & "BIÊN TẬP VIDEO" VÀO THANH CÔNG CỤ HÀNG ĐỢI
  // --------------------------------------------------------------------------------------------
  function injectStudioToolbarControls() {
    // Dọn dẹp các nút cũ nếu có
    const oldSwitch = document.getElementById('aiforge-automerge-switch-btn');
    if (oldSwitch) oldSwitch.remove();
    const oldEditor = document.getElementById('aiforge-open-editor-btn');
    if (oldEditor) oldEditor.remove();
    // Nút "Biên tập video" đã được tích hợp chuẩn xác trực tiếp trong React VideoStudio
    return;
  }

  // --------------------------------------------------------------------------------------------
  // 8. MỞ PHÒNG DỰNG VIDEO EDITOR STUDIO
  // --------------------------------------------------------------------------------------------
  async function openVideoEditorStudio(initialAssetIds = []) {
    // Giao diện HTML độc lập của module này chưa được build/biên dịch CSS đầy đủ
    // (các class Tailwind dạng z-[99999], w-[98vw]... không có trong file CSS đã build
    // nên hiển thị vỡ layout). Bảng dựng phim thật — đã test ổn định, đúng style —
    // nằm trong VideoStudio (React). Luôn ưu tiên gọi qua đó.
    if (typeof window.__openAiforgeVideoEditorModal === 'function') {
      window.__openAiforgeVideoEditorModal(initialAssetIds);
      return;
    }
    return;

    isEditorModalOpen = true;
    await loadVideoAssets();

    // Nếu được gọi kèm danh sách assetIds cụ thể (vd: 1 dự án trong Studio Kịch Bản),
    // LUÔN reset timeline đúng theo danh sách đó — tuyệt đối không lẫn video của dự án
    // khác hay phiên làm việc trước còn sót lại trên timeline.
    if (initialAssetIds && initialAssetIds.length > 0) {
      timelineClips = initialAssetIds.map((aid, i) => {
        const a = videoAssetsCache.find(v => v.id === aid);
        return {
          id: 'seg-' + Date.now() + '-' + i + '-' + Math.random().toString(36).slice(2, 6),
          assetId: aid,
          name: getSceneTitleForAsset(a, i),
          prompt: a?.prompt || a?.name || '',
          url: a?.localPath ? `file://${a.localPath}` : (a?.thumbnailUrl || ''),
          localPath: a?.localPath || '',
          duration: a?.duration || 5,
          startTime: 0,
          endTime: a?.duration || 5,
          thumbnailUrl: a?.thumbnailUrl || '',
          width: a?.width || 1280,
          height: a?.height || 720,
          aspectRatio: a?.width && a?.height ? a.width / a.height : 16 / 9
        };
      });
      selectedClipId = timelineClips[0]?.id || null;
    }

    if (timelineClips.length > 0 && !selectedClipId) {
      selectedClipId = timelineClips[0].id;
    }

    currentPlayheadTime = 0;
    isPlaying = false;
    renderModalDOM();
    bindGlobalKeyShortcuts();
  }

  function closeVideoEditorStudio() {
    isEditorModalOpen = false;
    isPlaying = false;
    const modal = document.getElementById('aiforge-video-editor-modal');
    if (modal) modal.remove();
    unbindGlobalKeyShortcuts();
  }

  // --------------------------------------------------------------------------------------------
  // 9. RENDER GIAO DIỆN PHÒNG DỰNG VIDEO STUDIO TOÀN MÀN HÌNH (MODAL)
  // --------------------------------------------------------------------------------------------
  function renderModalDOM() {
    if (!isEditorModalOpen) return;

    let modal = document.getElementById('aiforge-video-editor-modal');
    if (!modal) {
      modal = document.createElement('div');
      modal.id = 'aiforge-video-editor-modal';
      document.body.appendChild(modal);
    }

    const totalDuration = calculateTotalDuration();
    const segments = getGlobalTimelineSegments();
    const currentActiveClip = timelineClips.find(c => c.id === selectedClipId) || timelineClips[0] || null;

    modal.className = 'fixed inset-0 z-[99999] flex items-center justify-center bg-black/80 backdrop-blur-md p-2 sm:p-4 animate-in fade-in duration-200';
    modal.innerHTML = `
      <div id="aiforge-editor-window" class="relative flex flex-col w-[98vw] max-w-[1700px] h-[95vh] max-h-[1050px] bg-[#0d121f] border border-white/10 rounded-2xl shadow-2xl overflow-hidden font-sans select-none text-slate-100">
        
        <!-- 9.1 HEADER STUDIO BAR -->
        <div class="flex items-center justify-between px-5 py-3 border-b border-white/[0.1] bg-[#111827]">
          <div class="flex items-center gap-3">
            <div class="flex items-center justify-center w-8 h-8 rounded-xl bg-gradient-to-tr from-indigo-500 via-purple-500 to-pink-500 text-white shadow-md shadow-indigo-500/30">
              <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"/>
              </svg>
            </div>
            <div>
              <div class="flex items-center gap-2">
                <h1 class="text-sm font-bold text-slate-100 tracking-wide">Biên tập Video</h1>
                <span class="text-[10px] font-mono px-2 py-0.5 rounded-full bg-indigo-500/20 border border-indigo-500/30 text-indigo-300 font-bold">
                  ${timelineClips.length} phân đoạn
                </span>
              </div>
              <p class="text-[11px] text-slate-400">Kéo thả sắp xếp thứ tự trước - sau, cắt tỉa phân đoạn và tạo hiệu ứng chuyển cảnh</p>
            </div>
          </div>

          <div class="flex items-center gap-3">
            <!-- RATIO PICKER -->
            <div class="flex items-center gap-1 p-1 rounded-xl bg-slate-900/90 border border-white/[0.08] text-xs">
              ${['16:9', '9:16', '1:1', 'fit'].map(r => `
                <button type="button" data-ratio="${r}" class="ratio-btn px-2.5 py-1 rounded-lg text-xs font-semibold transition-all ${
                  activeRatio === r
                    ? 'bg-gradient-to-r from-indigo-500 to-purple-600 text-white shadow-md shadow-indigo-500/25'
                    : 'text-slate-300 hover:text-white hover:bg-white/[0.06]'
                }">${r === 'fit' ? 'Original' : r}</button>
              `).join('')}
            </div>

            <!-- NÚT XEM VIDEO VỪA XUẤT -->
            ${lastExportedAsset ? `
              <button id="editor-view-last-btn" type="button" class="inline-flex h-8 shrink-0 cursor-pointer items-center gap-1.5 rounded-lg border border-cyan-400/30 bg-cyan-500/[0.08] px-2.5 text-[11px] font-semibold text-cyan-200 transition-colors hover:border-cyan-300/60 hover:bg-cyan-500/[0.16] focus:outline-none focus:ring-2 focus:ring-cyan-400/40">
                <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/></svg>
                <span>Xem video vừa xuất</span>
              </button>
            ` : ''}

            <!-- TỔNG THỜI LƯỢNG -->
            <div class="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-950/80 border border-indigo-500/20 text-xs">
              <svg class="w-3.5 h-3.5 text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/>
              </svg>
              <span class="text-slate-400">Tổng:</span>
              <span class="font-mono text-cyan-400 font-bold text-xs tracking-wider">${formatTimeShort(totalDuration)}</span>
            </div>

            <!-- NÚT GHÉP & XUẤT VIDEO -->
            <button id="editor-export-submit-btn" type="button" ${timelineClips.length === 0 || isExporting ? 'disabled' : ''} class="flex items-center gap-2 px-4 py-1.5 text-xs font-bold text-white bg-gradient-to-r from-indigo-500 via-purple-600 to-pink-600 hover:from-indigo-600 hover:to-pink-700 rounded-xl shadow-lg shadow-indigo-500/25 transition-all disabled:opacity-40 active:scale-95">
              ${isExporting ? `
                <svg class="w-3.5 h-3.5 animate-spin" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"></path></svg>
                <span>Đang render & ghép...</span>
              ` : `
                <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"/></svg>
                <span>Ghép & Xuất video</span>
              `}
            </button>

            <!-- NÚT ĐÓNG MODAL -->
            <button id="editor-close-modal-btn" type="button" class="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-white/[0.08] transition-colors ml-1">
              <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/></svg>
            </button>
          </div>
        </div>

        <!-- 9.2 BODY CHÍNH (3 CỘT STUDIO RESIZABLE) -->
        <div class="flex-1 min-h-0 min-w-0 flex overflow-hidden">
          
          <!-- CỘT TRÁI: THƯ VIỆN & CHUYỂN CẢNH (W: 300px) -->
          <div class="w-72 sm:w-80 bg-[#111827] flex min-w-[260px] max-w-[380px] flex-col flex-shrink-0 border-r border-white/[0.08]">
            <!-- TABS -->
            <div class="flex items-center border-b border-white/[0.08] bg-[#0e1626] p-1.5 gap-1.5">
              <button id="tab-btn-media" type="button" class="flex-1 py-1.5 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-all ${
                activeTab === 'media' ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30' : 'text-slate-400 hover:text-slate-200 hover:bg-white/[0.04]'
              }">
                <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"/></svg>
                <span>Thư viện</span>
                <span class="text-[10px] px-1.5 py-0.2 rounded-full bg-black/40 text-slate-300 font-mono">${videoAssetsCache.length}</span>
              </button>
              <button id="tab-btn-transitions" type="button" class="flex-1 py-1.5 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-all ${
                activeTab === 'transitions' ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30' : 'text-slate-400 hover:text-slate-200 hover:bg-white/[0.04]'
              }">
                <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z"/></svg>
                <span>Chuyển cảnh</span>
              </button>
            </div>

            <!-- TAB 1: MEDIA LIBRARY -->
            ${activeTab === 'media' ? `
              <div class="flex-1 min-h-0 flex flex-col">
                <div class="p-3 border-b border-white/[0.06] space-y-2 bg-[#0e1626]/50">
                  <div class="relative">
                    <svg class="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/></svg>
                    <input id="media-search-input" type="text" placeholder="Tìm video trong kho..." value="${searchQuery}" class="w-full pl-8 pr-3 py-1.5 text-xs bg-[#0b101c] border border-white/[0.1] rounded-xl text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-indigo-400 transition-colors" />
                  </div>
                  <button id="add-all-to-timeline-btn" type="button" class="w-full py-1 text-[11px] font-semibold text-indigo-300 bg-indigo-500/10 hover:bg-indigo-500/20 border border-indigo-500/20 rounded-lg transition-colors">
                    + Thêm tất cả video vào timeline
                  </button>
                </div>
                <div class="flex-1 overflow-y-auto p-3 space-y-2.5 custom-scrollbar">
                  ${videoAssetsCache.length === 0 ? `
                    <div class="py-12 text-center text-xs text-slate-500">Chưa có video nào trong thư viện tài nguyên</div>
                  ` : videoAssetsCache.filter(a => !searchQuery || (a.name || '').toLowerCase().includes(searchQuery.toLowerCase()) || (a.prompt || '').toLowerCase().includes(searchQuery.toLowerCase())).map(asset => `
                    <div class="group relative flex items-center gap-2.5 p-2 rounded-xl bg-[#162032] border border-white/[0.08] hover:border-indigo-400/50 hover:bg-[#1e2a40] transition-all shadow-sm">
                      <div class="relative w-16 h-12 rounded-lg bg-black overflow-hidden flex-shrink-0 border border-white/[0.08]">
                        ${asset.thumbnailUrl ? `
                          <img src="${asset.thumbnailUrl}" alt="" class="w-full h-full object-cover" />
                        ` : `
                          <div class="w-full h-full flex items-center justify-center text-slate-500">
                            <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z"/></svg>
                          </div>
                        `}
                        <span class="absolute bottom-0.5 right-0.5 px-1 py-0.2 rounded bg-black/80 font-mono text-[9px] text-slate-200 font-bold border border-white/10">
                          ${asset.duration ? asset.duration + 's' : '5s'}
                        </span>
                      </div>
                      <div class="flex-1 min-w-0">
                        <div class="text-xs font-semibold text-slate-200 truncate">${getSceneTitleForAsset(asset)}</div>
                        <div class="text-[11px] text-slate-400 truncate">${asset.prompt || asset.name || 'Không có mô tả prompt'}</div>
                      </div>
                      <button type="button" data-add-asset-id="${asset.id}" title="Thêm vào dải Timeline" class="add-clip-to-timeline-btn p-1.5 rounded-lg bg-indigo-500/20 text-indigo-300 hover:bg-indigo-600 hover:text-white transition-all opacity-80 group-hover:opacity-100 flex-shrink-0 shadow-sm">
                        <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"/></svg>
                      </button>
                    </div>
                  `).join('')}
                </div>
              </div>
            ` : `
              <!-- TAB 2: TRANSITIONS -->
              <div class="flex-1 min-h-0 flex flex-col p-3 overflow-y-auto space-y-2 custom-scrollbar">
                <div class="text-[11px] font-bold uppercase tracking-wider text-slate-400 px-1 mb-1">
                  11 Hiệu Ứng Chuyển Cảnh FFmpeg
                </div>
                ${TRANSITIONS.map(tr => `
                  <div data-transition-id="${tr.id}" class="transition-item-card p-2.5 rounded-xl border cursor-pointer transition-all flex items-center justify-between ${
                    activeTransition === tr.id
                      ? 'bg-gradient-to-r from-indigo-950/90 to-purple-950/90 border-indigo-400 ring-2 ring-indigo-500 shadow-md'
                      : 'bg-[#162032] border-white/[0.08] hover:border-white/20 hover:bg-[#1e2a40]'
                  }">
                    <div>
                      <div class="text-xs font-semibold text-slate-200">${tr.label}</div>
                      <div class="text-[11px] text-slate-400 mt-0.5">${tr.desc}</div>
                    </div>
                    ${activeTransition === tr.id ? `
                      <span class="w-2.5 h-2.5 rounded-full bg-indigo-400 shadow-[0_0_10px_#818cf8]"></span>
                    ` : ''}
                  </div>
                `).join('')}
              </div>
            `}
          </div>

          <!-- CỘT GIỮA: PREVIEW MÀN HÌNH & THANH ĐIỀU KHIỂN CHUYÊN NGHIỆP -->
          <div class="flex-1 min-h-0 min-w-0 flex flex-col bg-[#0b0f19] overflow-hidden">
            
            <!-- KHUNG HIỂN THỊ VIDEO PREVIEW -->
            <div class="relative flex-1 min-h-0 min-w-0 flex items-center justify-center p-3 overflow-hidden bg-black/40">
              ${timelineClips.length === 0 ? `
                <div class="text-center p-8 space-y-3">
                  <div class="w-16 h-16 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 flex items-center justify-center mx-auto">
                    <svg class="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"/></svg>
                  </div>
                  <div class="text-sm font-bold text-slate-300">Dải Timeline đang trống</div>
                  <div class="text-xs text-slate-500 max-w-sm">Nhấp vào biểu tượng (+) ở các video bên trái để đưa phân đoạn vào timeline</div>
                </div>
              ` : `
                <div class="relative flex items-center justify-center overflow-hidden max-h-full rounded-xl bg-black border border-white/15 shadow-[0_20px_60px_rgba(0,0,0,0.8)]" style="${
                  activeRatio === '16:9' ? 'aspect-ratio: 16/9; width: min(100%, 820px);' :
                  activeRatio === '9:16' ? 'aspect-ratio: 9/16; height: min(100%, 460px);' :
                  activeRatio === '1:1' ? 'aspect-ratio: 1/1; height: min(100%, 460px);' :
                  'max-width: 90%; max-height: 90%;'
                }">
                  <video id="editor-primary-video" src="${currentActiveClip?.url || ''}" class="w-full h-full object-contain" />
                  <span class="pointer-events-none absolute left-3 top-3 z-20 rounded-md border border-white/20 bg-slate-950/75 px-2 py-1 font-mono text-[10px] font-bold tracking-wide text-slate-200 backdrop-blur-sm">
                    ${activeRatio.toUpperCase()} • ${activeTransition.toUpperCase()}
                  </span>
                </div>
              `}
            </div>

            <!-- THANH ĐIỀU KHIỂN PREVIEW (TRANSPORT BAR) -->
            <div class="flex items-center justify-between px-5 py-2.5 bg-[#111827] border-t border-b border-white/[0.08]">
              <div class="flex items-center gap-2">
                <!-- NÚT PHÁT / TẠM DỪNG -->
                <button id="editor-play-pause-btn" type="button" class="w-8 h-8 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white flex items-center justify-center shadow-md transition-all active:scale-95">
                  ${isPlaying ? `
                    <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M10 9v6m4-6v6"/></svg>
                  ` : `
                    <svg class="w-4 h-4 ml-0.5" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>
                  `}
                </button>
                <button id="editor-step-back-btn" type="button" title="Lùi 1 giây" class="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/[0.06] transition-colors">
                  <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12.066 11.2a1 1 0 000 1.6l5.334 4A1 1 0 0019 16V8a1 1 0 00-1.6-.8l-5.334 4zM4.066 11.2a1 1 0 000 1.6l5.334 4A1 1 0 0011 16V8a1 1 0 00-1.6-.8l-5.334 4z"/></svg>
                </button>
                <button id="editor-step-fwd-btn" type="button" title="Tiến 1 giây" class="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/[0.06] transition-colors">
                  <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11.934 12.8a1 1 0 000-1.6l-5.334-4A1 1 0 005 8v8a1 1 0 001.6.8l5.334-4zM19.934 12.8a1 1 0 000-1.6l-5.334-4A1 1 0 0013 8v8a1 1 0 001.6.8l5.334-4z"/></svg>
                </button>
                <div class="font-mono text-xs text-slate-300 ml-2">
                  <span id="editor-timecode-cur" class="text-cyan-400 font-bold">${formatTime(currentPlayheadTime)}</span>
                  <span class="text-slate-500"> / </span>
                  <span class="text-slate-400">${formatTime(totalDuration)}</span>
                </div>
              </div>

              <!-- CÁC NÚT THAO TÁC NHANH: TÁCH ĐOẠN, NHÂN BẢN, HOÀN TÁC -->
              <div class="flex items-center gap-2">
                <button id="editor-split-btn" type="button" title="Tách phân đoạn tại vị trí con trỏ (Phím S)" class="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold text-slate-200 bg-white/[0.06] hover:bg-white/[0.12] transition-colors">
                  <svg class="w-3.5 h-3.5 text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M14.121 14.121L19 19m-7-7l7-7m-7 7l-2.879 2.879M12 12L9.121 9.121m0 5.758a3 3 0 10-4.243 4.243 3 3 0 004.243-4.243zm0-5.758a3 3 0 10-4.243-4.243 3 3 0 004.243 4.243z"/></svg>
                  <span>Tách đoạn (S)</span>
                </button>
                <button id="editor-duplicate-btn" type="button" title="Nhân bản phân đoạn đang chọn" class="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold text-slate-200 bg-white/[0.06] hover:bg-white/[0.12] transition-colors">
                  <svg class="w-3.5 h-3.5 text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"/></svg>
                  <span>Nhân bản</span>
                </button>
                <button id="editor-delete-selected-btn" type="button" title="Xóa phân đoạn đang chọn (Phím Delete)" class="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold text-rose-300 bg-rose-500/10 hover:bg-rose-500/20 transition-colors">
                  <svg class="w-3.5 h-3.5 fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg>
                  <span>Xóa (Del)</span>
                </button>
                <div class="h-4 w-px bg-white/10 mx-1"></div>
                <button id="editor-undo-btn" type="button" title="Hoàn tác (Ctrl + Z)" class="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/[0.06] transition-colors">
                  <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6"/></svg>
                </button>
                <button id="editor-redo-btn" type="button" title="Làm lại (Ctrl + Y)" class="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/[0.06] transition-colors">
                  <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 10h-10a8 8 0 00-8 8v2m18-10l-6 6m6-6l-6-6"/></svg>
                </button>
              </div>
            </div>

          </div>

          <!-- CỘT PHẢI: CHI TIẾT PHÂN ĐOẠN (INSPECTOR PANEL - W: 280px) -->
          <div class="w-72 bg-[#111827] flex min-w-[240px] max-w-[320px] flex-col flex-shrink-0 border-l border-white/[0.08] p-4 overflow-y-auto custom-scrollbar">
            <div class="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3">
              Chi tiết phân đoạn
            </div>

            ${currentActiveClip ? `
              <div class="space-y-4">
                <!-- THUMBNAIL & TIÊU ĐỀ -->
                <div class="rounded-xl bg-[#162032] border border-white/[0.08] p-3 space-y-2">
                  <div class="w-full h-28 rounded-lg bg-black overflow-hidden border border-white/[0.08]">
                    ${currentActiveClip.thumbnailUrl ? `
                      <img src="${currentActiveClip.thumbnailUrl}" alt="" class="w-full h-full object-cover" />
                    ` : `
                      <div class="w-full h-full flex items-center justify-center text-slate-500 font-mono text-xs">Video Clip</div>
                    `}
                  </div>
                  <div class="text-xs font-bold text-slate-200 truncate">${currentActiveClip.name}</div>
                  <div class="text-[11px] text-slate-400 line-clamp-2">${currentActiveClip.prompt || 'Không có mô tả prompt'}</div>
                </div>

                <!-- BỘ ĐIỀU CHỈNH CẮT TỈA (TRIM IN / OUT) -->
                <div class="rounded-xl bg-[#162032] border border-white/[0.08] p-3 space-y-3">
                  <div class="text-[11px] font-bold text-slate-300 uppercase tracking-wider">Cắt tỉa thời lượng</div>
                  <div class="grid grid-cols-2 gap-2 text-xs">
                    <div>
                      <span class="text-[10px] text-slate-400 block mb-1">Bắt đầu:</span>
                      <div class="flex items-center gap-1">
                        <input type="number" min="0" step="0.1" id="inspector-trim-start" value="${Number(currentActiveClip.startTime || 0).toFixed(1)}" class="w-full px-2 py-1 rounded-lg bg-[#0b101c] border border-white/10 text-slate-200 font-mono text-xs text-center" />
                        <span class="text-slate-400 text-xs">s</span>
                      </div>
                    </div>
                    <div>
                      <span class="text-[10px] text-slate-400 block mb-1">Kết thúc:</span>
                      <div class="flex items-center gap-1">
                        <input type="number" min="0.1" step="0.1" id="inspector-trim-end" value="${Number(currentActiveClip.endTime || currentActiveClip.duration || 5).toFixed(1)}" class="w-full px-2 py-1 rounded-lg bg-[#0b101c] border border-white/10 text-slate-200 font-mono text-xs text-center" />
                        <span class="text-slate-400 text-xs">s</span>
                      </div>
                    </div>
                  </div>

                  <div class="flex items-center justify-between pt-1 border-t border-white/[0.06] text-xs">
                    <span class="text-slate-400">Thời lượng sau cắt:</span>
                    <span class="font-mono font-bold text-cyan-400">${((currentActiveClip.endTime || currentActiveClip.duration || 5) - (currentActiveClip.startTime || 0)).toFixed(1)}s</span>
                  </div>

                  <button id="inspector-reset-trim-btn" type="button" class="w-full py-1 text-[11px] font-semibold text-slate-300 hover:text-white bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.08] rounded-lg transition-colors">
                    Đặt lại độ dài gốc
                  </button>
                </div>

                <!-- THÔNG TIN KỸ THUẬT -->
                <div class="rounded-xl bg-[#162032] border border-white/[0.08] p-3 space-y-2 text-xs">
                  <div class="text-[11px] font-bold text-slate-300 uppercase tracking-wider mb-1">Thông số kỹ thuật</div>
                  <div class="flex justify-between text-slate-400">
                    <span>Độ phân giải:</span>
                    <span class="text-slate-200 font-mono">${currentActiveClip.width || 1280}x${currentActiveClip.height || 720}</span>
                  </div>
                  <div class="flex justify-between text-slate-400">
                    <span>Tỷ lệ gốc:</span>
                    <span class="text-slate-200 font-mono">${currentActiveClip.width && currentActiveClip.height ? (currentActiveClip.width / currentActiveClip.height).toFixed(2) : '16:9'}</span>
                  </div>
                  <div class="flex justify-between text-slate-400">
                    <span>Thời lượng gốc:</span>
                    <span class="text-slate-200 font-mono">${Number(currentActiveClip.duration || 5).toFixed(1)}s</span>
                  </div>
                </div>

              </div>
            ` : `
              <div class="py-12 text-center text-xs text-slate-500">Chưa chọn phân đoạn nào</div>
            `}
          </div>

        </div>

        <!-- 9.3 ĐÁY: DÒNG THỜI GIAN TUẦN TỰ (TIMELINE TRACK - H: 230px) -->
        <div class="h-56 bg-[#0a0e1a] border-t border-white/[0.1] flex flex-col">
          
          <!-- TIMELINE HEADER -->
          <div class="flex items-center justify-between px-4 py-2 border-b border-white/[0.08] bg-[#111827]">
            <div class="flex items-center gap-3">
              <span class="text-xs font-bold uppercase tracking-wider text-slate-300">Dải Timeline tuần tự</span>
              <span class="text-[11px] text-slate-500">• Kéo thẻ để đổi thứ tự, chỉnh giây để cắt tỉa (Phím S để tách đoạn)</span>
            </div>
            <div class="flex items-center gap-2">
              <button id="timeline-reverse-btn" type="button" class="px-2.5 py-1 rounded-lg text-[11px] font-semibold text-slate-300 hover:text-white bg-white/[0.05] hover:bg-white/[0.1] border border-white/[0.08] transition-colors">
                Đảo ngược thứ tự
              </button>
              <button id="timeline-clear-btn" type="button" class="px-2.5 py-1 rounded-lg text-[11px] font-semibold text-rose-300 hover:text-rose-200 bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/20 transition-colors">
                Xóa tất cả
              </button>
            </div>
          </div>

          <!-- DẢI THẺ PHÂN ĐOẠN (TIMELINE CARDS STRIP) -->
          <div id="timeline-strip-container" class="flex-1 overflow-x-auto p-3 flex items-center gap-3 custom-scrollbar">
            ${timelineClips.length === 0 ? `
              <div class="w-full text-center text-xs text-slate-500 italic">Dải timeline đang trống. Nhấn (+) ở video bất kỳ trong kho bên trái để thêm.</div>
            ` : timelineClips.map((clip, idx) => `
              <div data-clip-id="${clip.id}" class="timeline-clip-card relative w-60 shrink-0 p-2.5 rounded-xl border transition-all flex flex-col gap-2 cursor-pointer ${
                clip.id === selectedClipId
                  ? 'bg-[#1b263b] border-indigo-400 ring-2 ring-indigo-500/60 shadow-lg shadow-indigo-950/50'
                  : 'bg-[#131b2c] border-white/[0.1] hover:border-indigo-400/40'
              }">
                <div class="flex items-center justify-between">
                  <div class="flex items-center gap-1.5">
                    <span class="w-5 h-5 rounded-full bg-indigo-600/80 text-white font-mono text-[10px] font-bold flex items-center justify-center">#${idx + 1}</span>
                    <span class="text-xs font-semibold text-slate-200 truncate w-28">${getSceneTitleForAsset(clip, idx)}</span>
                  </div>
                  <div class="flex items-center gap-1">
                    <button type="button" data-move-clip="${idx}" data-dir="-1" ${idx === 0 ? 'disabled' : ''} class="move-clip-btn p-1 text-slate-400 hover:text-white disabled:opacity-20">◀</button>
                    <button type="button" data-move-clip="${idx}" data-dir="1" ${idx === timelineClips.length - 1 ? 'disabled' : ''} class="move-clip-btn p-1 text-slate-400 hover:text-white disabled:opacity-20">▶</button>
                    <button type="button" data-delete-clip="${idx}" class="delete-clip-btn p-1 text-rose-400 hover:text-rose-300">🗑️</button>
                  </div>
                </div>

                <!-- THUMBNAIL & DURATION -->
                <div class="relative w-full h-16 rounded-lg bg-black/60 overflow-hidden border border-white/[0.06]">
                  ${clip.thumbnailUrl ? `
                    <img src="${clip.thumbnailUrl}" alt="" class="w-full h-full object-cover" />
                  ` : `
                    <div class="w-full h-full flex items-center justify-center text-slate-500 font-mono text-xs">Video Clip</div>
                  `}
                  <span class="absolute bottom-1 right-1 px-1.5 py-0.5 rounded bg-black/85 font-mono text-[10px] font-bold text-cyan-300">
                    ${((clip.endTime || clip.duration || 5) - (clip.startTime || 0)).toFixed(1)}s
                  </span>
                </div>

                <!-- TRIM QUICK INPUTS -->
                <div class="flex items-center justify-between gap-1 text-[11px] text-slate-300">
                  <div class="flex items-center gap-1">
                    <span class="text-slate-500">Từ:</span>
                    <input type="number" min="0" step="0.1" data-trim-clip="${idx}" data-field="startTime" value="${Number(clip.startTime || 0).toFixed(1)}" class="trim-input w-12 px-1 py-0.5 rounded bg-slate-900 border border-white/10 text-slate-200 font-mono text-center text-[11px]" />
                    <span>s</span>
                  </div>
                  <div class="flex items-center gap-1">
                    <span class="text-slate-500">Đến:</span>
                    <input type="number" min="0.1" step="0.1" data-trim-clip="${idx}" data-field="endTime" value="${Number(clip.endTime || clip.duration || 5).toFixed(1)}" class="trim-input w-12 px-1 py-0.5 rounded bg-slate-900 border border-white/10 text-slate-200 font-mono text-center text-[11px]" />
                    <span>s</span>
                  </div>
                </div>
              </div>
            `).join('')}
          </div>
        </div>

      </div>

      <!-- 9.4 MODAL THÔNG BÁO HOÀN TẤT XUẤT FILE -->
      ${showExportCompleteDialog && lastExportedAsset ? `
        <div class="fixed inset-0 z-[999999] flex items-center justify-center bg-black/75 backdrop-blur-sm p-4 animate-in fade-in duration-150">
          <div class="relative w-full max-w-md p-5 rounded-2xl bg-[#111827] border border-white/15 shadow-2xl space-y-4 text-slate-100">
            <div class="flex items-center justify-between border-b border-white/10 pb-3">
              <div class="flex items-center gap-2">
                <div class="w-7 h-7 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
                  <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.2" d="M5 13l4 4L19 7"/></svg>
                </div>
                <h3 class="text-sm font-bold">Video đã sẵn sàng!</h3>
              </div>
              <button id="export-dialog-close-btn" type="button" class="text-slate-400 hover:text-white p-1 rounded-lg">
                <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/></svg>
              </button>
            </div>

            <div class="space-y-2 text-xs">
              <div class="p-3 rounded-xl bg-black/50 border border-white/10 space-y-1.5">
                <div class="text-slate-200 font-bold truncate">${lastExportedAsset.name}</div>
                <div class="text-[11px] text-slate-400 font-mono truncate">${lastExportedAsset.localPath || lastExportedAsset.id}</div>
              </div>
              <p class="text-[11px] text-slate-400 leading-relaxed">
                Video đã ghép hoàn tất và được lưu an toàn trong Thư viện tài nguyên. Bạn có thể lưu bản sao ra máy hoặc mở xem ngay bên dưới:
              </p>
            </div>

            <div class="grid grid-cols-2 gap-2.5 pt-2">
              <button id="export-action-save-btn" type="button" class="flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl text-xs font-bold text-white bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 shadow-md shadow-indigo-600/30 transition-all">
                <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4"/></svg>
                <span>Lưu vào máy tính</span>
              </button>
              <button id="export-action-open-folder-btn" type="button" class="flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl text-xs font-semibold text-slate-200 bg-white/[0.08] hover:bg-white/[0.14] border border-white/10 transition-colors">
                <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 19a2 2 0 01-2-2V7a2 2 0 012-2h4l2 2h4a2 2 0 012 2v1M5 19h14a2 2 0 002-2v-5a2 2 0 00-2-2H9a2 2 0 00-2 2v5a2 2 0 01-2 2z"/></svg>
                <span>Mở thư mục chứa</span>
              </button>
            </div>
          </div>
        </div>
      ` : ''}
    `;

    // Gắn sự kiện DOM tương tác
    attachModalEvents();
  }

  // --------------------------------------------------------------------------------------------
  // 10. GẮN CÁC SỰ KIỆN TƯƠNG TÁC CỦA MODAL STUDIO
  // --------------------------------------------------------------------------------------------
  function attachModalEvents() {
    const modal = document.getElementById('aiforge-video-editor-modal');
    if (!modal) return;

    // Đóng Modal
    document.getElementById('editor-close-modal-btn')?.addEventListener('click', closeVideoEditorStudio);

    // Chuyển Tab Thư viện / Chuyển cảnh
    document.getElementById('tab-btn-media')?.addEventListener('click', () => {
      activeTab = 'media';
      renderModalDOM();
    });
    document.getElementById('tab-btn-transitions')?.addEventListener('click', () => {
      activeTab = 'transitions';
      renderModalDOM();
    });

    // Đổi Ratio
    modal.querySelectorAll('.ratio-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        activeRatio = btn.getAttribute('data-ratio');
        renderModalDOM();
      });
    });

    // Chọn Transition
    modal.querySelectorAll('.transition-item-card').forEach(card => {
      card.addEventListener('click', () => {
        activeTransition = card.getAttribute('data-transition-id');
        const tr = TRANSITIONS.find(t => t.id === activeTransition);
        showToast(`✨ Đã chọn hiệu ứng: ${tr ? tr.label : activeTransition}`, 'info', 1800);
        renderModalDOM();
      });
    });

    // Thêm clip từ kho vào timeline
    modal.querySelectorAll('.add-clip-to-timeline-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        pushHistory();
        const aid = btn.getAttribute('data-add-asset-id');
        const asset = videoAssetsCache.find(a => a.id === aid);
        if (asset) {
          const newClip = {
            id: 'seg-' + Date.now() + '-' + Math.random().toString(36).slice(2, 6),
            assetId: asset.id,
            name: getSceneTitleForAsset(asset, timelineClips.length),
            prompt: asset.prompt || asset.name || '',
            url: asset.localPath ? `file://${asset.localPath}` : (asset.thumbnailUrl || ''),
            localPath: asset.localPath || '',
            duration: asset.duration || 5,
            startTime: 0,
            endTime: asset.duration || 5,
            thumbnailUrl: asset.thumbnailUrl || '',
            width: asset.width || 1280,
            height: asset.height || 720,
            aspectRatio: asset.width && asset.height ? asset.width / asset.height : 16 / 9
          };
          timelineClips.push(newClip);
          selectedClipId = newClip.id;
          showToast(`+ Đã thêm "${newClip.name}" vào dải Timeline`, 'success', 2000);
          renderModalDOM();
        }
      });
    });

    // Thêm tất cả vào timeline
    document.getElementById('add-all-to-timeline-btn')?.addEventListener('click', () => {
      if (videoAssetsCache.length === 0) return;
      pushHistory();
      videoAssetsCache.forEach((asset, i) => {
        timelineClips.push({
          id: 'seg-' + Date.now() + '-' + i + '-' + Math.random().toString(36).slice(2, 6),
          assetId: asset.id,
          name: getSceneTitleForAsset(asset, timelineClips.length),
          prompt: asset.prompt || asset.name || '',
          url: asset.localPath ? `file://${asset.localPath}` : (asset.thumbnailUrl || ''),
          localPath: asset.localPath || '',
          duration: asset.duration || 5,
          startTime: 0,
          endTime: asset.duration || 5,
          thumbnailUrl: asset.thumbnailUrl || '',
          width: asset.width || 1280,
          height: asset.height || 720,
          aspectRatio: asset.width && asset.height ? asset.width / asset.height : 16 / 9
        });
      });
      showToast(`+ Đã thêm tất cả ${videoAssetsCache.length} video vào timeline!`, 'success', 2500);
      renderModalDOM();
    });

    // Tìm kiếm trong media library
    const searchInput = document.getElementById('media-search-input');
    if (searchInput) {
      searchInput.addEventListener('input', (e) => {
        searchQuery = e.target.value;
        renderModalDOM();
        const inputRef = document.getElementById('media-search-input');
        if (inputRef) {
          inputRef.focus();
          inputRef.selectionStart = inputRef.selectionEnd = inputRef.value.length;
        }
      });
    }

    // Chọn clip trên timeline
    modal.querySelectorAll('.timeline-clip-card').forEach(card => {
      card.addEventListener('click', () => {
        selectedClipId = card.getAttribute('data-clip-id');
        renderModalDOM();
      });
    });

    // Di chuyển clip ◀ / ▶
    modal.querySelectorAll('.move-clip-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        pushHistory();
        const idx = parseInt(btn.getAttribute('data-move-clip'), 10);
        const dir = parseInt(btn.getAttribute('data-dir'), 10);
        const target = idx + dir;
        if (target >= 0 && target < timelineClips.length) {
          const temp = timelineClips[idx];
          timelineClips[idx] = timelineClips[target];
          timelineClips[target] = temp;
          renderModalDOM();
        }
      });
    });

    // Xóa clip
    modal.querySelectorAll('.delete-clip-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        pushHistory();
        const idx = parseInt(btn.getAttribute('data-delete-clip'), 10);
        timelineClips.splice(idx, 1);
        if (timelineClips.length > 0) {
          selectedClipId = timelineClips[Math.min(idx, timelineClips.length - 1)].id;
        } else {
          selectedClipId = null;
        }
        renderModalDOM();
      });
    });

    // Trim input trên thẻ timeline
    modal.querySelectorAll('.trim-input').forEach(input => {
      input.addEventListener('change', (e) => {
        e.stopPropagation();
        pushHistory();
        const idx = parseInt(input.getAttribute('data-trim-clip'), 10);
        const field = input.getAttribute('data-field');
        const val = Math.max(0, parseFloat(input.value) || 0);
        if (timelineClips[idx]) {
          timelineClips[idx][field] = val;
          renderModalDOM();
        }
      });
    });

    // Trim input trong Inspector
    const inspStart = document.getElementById('inspector-trim-start');
    const inspEnd = document.getElementById('inspector-trim-end');
    if (inspStart && inspEnd && selectedClipId) {
      inspStart.addEventListener('change', () => {
        pushHistory();
        const clip = timelineClips.find(c => c.id === selectedClipId);
        if (clip) {
          clip.startTime = Math.max(0, parseFloat(inspStart.value) || 0);
          renderModalDOM();
        }
      });
      inspEnd.addEventListener('change', () => {
        pushHistory();
        const clip = timelineClips.find(c => c.id === selectedClipId);
        if (clip) {
          clip.endTime = Math.max(0.1, parseFloat(inspEnd.value) || 5);
          renderModalDOM();
        }
      });
    }

    // Đặt lại độ dài gốc trong Inspector
    document.getElementById('inspector-reset-trim-btn')?.addEventListener('click', () => {
      if (!selectedClipId) return;
      pushHistory();
      const clip = timelineClips.find(c => c.id === selectedClipId);
      if (clip) {
        clip.startTime = 0;
        clip.endTime = clip.duration || 5;
        showToast('↺ Đã đặt lại thời lượng gốc', 'info', 1500);
        renderModalDOM();
      }
    });

    // Tách đoạn (Split Button)
    document.getElementById('editor-split-btn')?.addEventListener('click', executeSplitAtPlayhead);

    // Nhân bản (Duplicate Button)
    document.getElementById('editor-duplicate-btn')?.addEventListener('click', executeDuplicateSegment);

    // Xóa đoạn đang chọn (Delete Button)
    document.getElementById('editor-delete-selected-btn')?.addEventListener('click', executeDeleteSelectedSegment);

    // Hoàn tác / Làm lại
    document.getElementById('editor-undo-btn')?.addEventListener('click', handleUndo);
    document.getElementById('editor-redo-btn')?.addEventListener('click', handleRedo);

    // Đảo ngược timeline
    document.getElementById('timeline-reverse-btn')?.addEventListener('click', () => {
      pushHistory();
      timelineClips.reverse();
      renderModalDOM();
    });

    // Xóa tất cả timeline
    document.getElementById('timeline-clear-btn')?.addEventListener('click', () => {
      if (timelineClips.length === 0) return;
      pushHistory();
      timelineClips = [];
      selectedClipId = null;
      renderModalDOM();
    });

    // Play / Pause video
    const playBtn = document.getElementById('editor-play-pause-btn');
    const videoEl = document.getElementById('editor-primary-video');
    if (playBtn && videoEl) {
      playBtn.addEventListener('click', () => {
        if (videoEl.paused) {
          videoEl.play().catch(() => {});
          isPlaying = true;
        } else {
          videoEl.pause();
          isPlaying = false;
        }
        renderModalDOM();
      });
    }

    // Step Back / Forward
    document.getElementById('editor-step-back-btn')?.addEventListener('click', () => {
      if (videoEl) {
        videoEl.currentTime = Math.max(0, videoEl.currentTime - 1);
        currentPlayheadTime = videoEl.currentTime;
        renderTimecodeDisplay();
      }
    });
    document.getElementById('editor-step-fwd-btn')?.addEventListener('click', () => {
      if (videoEl) {
        videoEl.currentTime = Math.min(videoEl.duration || 999, videoEl.currentTime + 1);
        currentPlayheadTime = videoEl.currentTime;
        renderTimecodeDisplay();
      }
    });

    // Bấm xuất video ghép
    document.getElementById('editor-export-submit-btn')?.addEventListener('click', handleExportProcess);

    // Xem video đã xuất gần nhất
    document.getElementById('editor-view-last-btn')?.addEventListener('click', () => {
      showExportCompleteDialog = true;
      renderModalDOM();
    });

    // Đóng hộp thoại xuất
    document.getElementById('export-dialog-close-btn')?.addEventListener('click', () => {
      showExportCompleteDialog = false;
      renderModalDOM();
    });

    // Hành động trong hộp thoại xuất: Lưu vào máy tính
    document.getElementById('export-action-save-btn')?.addEventListener('click', async () => {
      if (!lastExportedAsset) return;
      const api = window.aiforge?.assets || window.aivideo?.assets;
      if (api?.exportAsset) {
        try {
          const res = await api.exportAsset(lastExportedAsset.id);
          if (res?.exported) {
            showToast(`💾 Đã lưu video vào: ${res.path}`, 'success', 5000);
          }
        } catch (e) {
          showToast(`❌ Lỗi lưu video: ${e.message}`, 'error', 4000);
        }
      }
    });

    // Hành động trong hộp thoại xuất: Mở thư mục chứa
    document.getElementById('export-action-open-folder-btn')?.addEventListener('click', () => {
      if (!lastExportedAsset) return;
      const api = window.aiforge?.assets || window.aivideo?.assets;
      if (api?.showInFolder) {
        api.showInFolder(lastExportedAsset.id);
        showToast('📂 Đã mở thư mục chứa video!', 'success', 2500);
      }
    });
  }

  function renderTimecodeDisplay() {
    const el = document.getElementById('editor-timecode-cur');
    if (el) el.textContent = formatTime(currentPlayheadTime);
  }

  // --------------------------------------------------------------------------------------------
  // 11. CÁC THAO TÁC BIÊN TẬP NÂNG CAO: TÁCH ĐOẠN, NHÂN BẢN, XÓA, PHÍM TẮT
  // --------------------------------------------------------------------------------------------
  function executeSplitAtPlayhead() {
    if (timelineClips.length === 0) return;
    const clipIndex = timelineClips.findIndex(c => c.id === selectedClipId);
    if (clipIndex === -1) {
      showToast('⚠️ Vui lòng chọn một phân đoạn để tách!', 'info', 2000);
      return;
    }

    pushHistory();
    const clip = timelineClips[clipIndex];
    const start = Number(clip.startTime) || 0;
    const end = Number(clip.endTime) || Number(clip.duration) || 5;
    const mid = start + (end - start) / 2; // Tách ở vị trí nửa thời lượng hiện tại

    const clipA = {
      ...clip,
      id: 'seg-' + Date.now() + '-a-' + Math.random().toString(36).slice(2, 6),
      endTime: Number(mid.toFixed(2))
    };
    const clipB = {
      ...clip,
      id: 'seg-' + Date.now() + '-b-' + Math.random().toString(36).slice(2, 6),
      startTime: Number(mid.toFixed(2))
    };

    timelineClips.splice(clipIndex, 1, clipA, clipB);
    selectedClipId = clipB.id;
    showToast('✂️ Đã tách phân đoạn thành công!', 'success', 2000);
    renderModalDOM();
  }

  function executeDuplicateSegment() {
    if (!selectedClipId || timelineClips.length === 0) return;
    const clipIndex = timelineClips.findIndex(c => c.id === selectedClipId);
    if (clipIndex === -1) return;

    pushHistory();
    const clip = timelineClips[clipIndex];
    const duplicate = {
      ...clip,
      id: 'seg-' + Date.now() + '-dup-' + Math.random().toString(36).slice(2, 6)
    };

    timelineClips.splice(clipIndex + 1, 0, duplicate);
    selectedClipId = duplicate.id;
    showToast('📋 Đã nhân bản phân đoạn!', 'info', 2000);
    renderModalDOM();
  }

  function executeDeleteSelectedSegment() {
    if (!selectedClipId || timelineClips.length === 0) return;
    const clipIndex = timelineClips.findIndex(c => c.id === selectedClipId);
    if (clipIndex === -1) return;

    pushHistory();
    timelineClips.splice(clipIndex, 1);
    selectedClipId = timelineClips.length > 0 ? timelineClips[Math.min(clipIndex, timelineClips.length - 1)].id : null;
    showToast('🗑️ Đã xóa phân đoạn', 'info', 1800);
    renderModalDOM();
  }

  // Quản lý Phím tắt Toàn cục (Space, S, Delete, Ctrl+Z, Ctrl+Y)
  function handleKeyDownShortcuts(e) {
    if (!isEditorModalOpen) return;

    // Không kích hoạt nếu đang gõ trong input text
    const tag = (e.target && e.target.tagName) ? e.target.tagName.toLowerCase() : '';
    if (tag === 'input' || tag === 'textarea') return;

    // Space: Play / Pause
    if (e.code === 'Space') {
      e.preventDefault();
      const videoEl = document.getElementById('editor-primary-video');
      if (videoEl) {
        if (videoEl.paused) {
          videoEl.play().catch(() => {});
          isPlaying = true;
        } else {
          videoEl.pause();
          isPlaying = false;
        }
        renderModalDOM();
      }
    }
    // S: Tách đoạn
    else if (e.code === 'KeyS') {
      e.preventDefault();
      executeSplitAtPlayhead();
    }
    // Delete: Xóa đoạn
    else if (e.code === 'Delete' || e.code === 'Backspace') {
      e.preventDefault();
      executeDeleteSelectedSegment();
    }
    // Ctrl + Z: Undo
    else if (e.ctrlKey && e.code === 'KeyZ') {
      e.preventDefault();
      handleUndo();
    }
    // Ctrl + Y: Redo
    else if (e.ctrlKey && e.code === 'KeyY') {
      e.preventDefault();
      handleRedo();
    }
    // Escape: Đóng modal
    else if (e.code === 'Escape') {
      closeVideoEditorStudio();
    }
  }

  function bindGlobalKeyShortcuts() {
    window.removeEventListener('keydown', handleKeyDownShortcuts);
    window.addEventListener('keydown', handleKeyDownShortcuts);
  }

  function unbindGlobalKeyShortcuts() {
    window.removeEventListener('keydown', handleKeyDownShortcuts);
  }

  // --------------------------------------------------------------------------------------------
  // 12. QUY TRÌNH XUẤT VIDEO GHÉP (FFMPEG BACKEND INTEGRATION)
  // --------------------------------------------------------------------------------------------
  async function handleExportProcess() {
    if (timelineClips.length === 0 || isExporting) return;

    const assetsApi = window.aiforge?.assets || window.aivideo?.assets;
    if (!assetsApi?.editAndMergeVideos && !assetsApi?.mergeVideos) {
      showToast('❌ Backend chưa sẵn sàng API editAndMergeVideos!', 'error', 4000);
      return;
    }

    const now = new Date();
    const dateStr = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}`;
    const timeStr = `${String(now.getHours()).padStart(2, '0')}${String(now.getMinutes()).padStart(2, '0')}${String(now.getSeconds()).padStart(2, '0')}`;
    const defaultName = `AIForge_Video_Edited_${dateStr}_${timeStr}.mp4`;

    const userGivenName = prompt('Đặt tên cho file video xuất:', defaultName);
    if (!userGivenName) return; // Người dùng bấm Hủy

    isExporting = true;
    renderModalDOM();
    showToast(`🎬 Đang tiến hành cắt ghép và áp dụng hiệu ứng chuyển cảnh "${activeTransition}"...`, 'info', 7000);

    try {
      let res;
      if (assetsApi.editAndMergeVideos) {
        const payloadClips = timelineClips.map(c => ({
          assetId: c.assetId,
          startTime: Number(c.startTime) || 0,
          endTime: c.endTime ? Number(c.endTime) : undefined
        }));

        res = await assetsApi.editAndMergeVideos(payloadClips, activeTransition === "dissolve" ? "fade" : activeTransition, {
          name: userGivenName.trim() || defaultName,
          outputAspect: activeRatio === 'fit' ? null : activeRatio,
          source: 'video-studio'
        });
      } else {
        const assetIds = timelineClips.map(c => c.assetId);
        res = await assetsApi.mergeVideos(assetIds, activeTransition === "dissolve" ? "fade" : activeTransition, {
          name: userGivenName.trim() || defaultName,
          outputAspect: activeRatio === 'fit' ? null : activeRatio,
          source: 'video-studio'
        });
      }

      lastExportedAsset = res;
      showExportCompleteDialog = true;
      showToast(`🎉 Ghép & Xuất video thành công! File "${res?.name || userGivenName}" đã sẵn sàng.`, 'success', 7000);
    } catch (err) {
      console.error('[VideoEditor] Export failed:', err);
      showToast(`❌ Xuất video thất bại: ${err.message || err}`, 'error', 6000);
    } finally {
      isExporting = false;
      renderModalDOM();
    }
  }

  // --------------------------------------------------------------------------------------------
  // 13. MUTATION OBSERVER & KHỞI ĐỘNG HỆ THỐNG
  // --------------------------------------------------------------------------------------------
  function observeAndInject() {
    injectStudioToolbarControls();
  }

  const observer = new MutationObserver(observeAndInject);
  observer.observe(document.body, { childList: true, subtree: true });

  window.addEventListener('DOMContentLoaded', observeAndInject);
  setTimeout(observeAndInject, 800);
  setTimeout(observeAndInject, 2000);
  setTimeout(observeAndInject, 4000);

  // Expose API ra window để Tris có thể gọi bằng script / console bất kỳ lúc nào
  window.aiforgeVideoEditor = {
    open: openVideoEditorStudio,
    close: closeVideoEditorStudio,
    setAutoMerge: (val) => {
      isAutoMergeEnabled = !!val;
      localStorage.setItem(STORAGE_KEY_AUTO_MERGE, isAutoMergeEnabled ? 'true' : 'false'); localStorage.setItem('aiforge_auto_merge_queue_enabled', isAutoMergeEnabled ? 'true' : 'false'); localStorage.setItem('aiforge.videoStudio.autoMerge.v1', isAutoMergeEnabled ? 'true' : 'false');
    },
    isAutoMergeEnabled: () => isAutoMergeEnabled
  };

  console.log('🌟 [AIForge Studio] Video Editor & Auto-Merge Engine initialized successfully!');
})();
