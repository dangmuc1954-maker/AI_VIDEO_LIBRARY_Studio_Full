class MuseVideoRuntime {
  providerId = "muse";

  constructor(sessions, assets, browserViewManager) {
    this.sessions = sessions;
    this.assets = assets;
    this.browserViewManager = browserViewManager;
  }

  supports(type) {
    return type === "Video" || type === "video" || type === "Image" || type === "image";
  }

  async validateJob(job) {
    return true;
  }

  isSupported(job) {
    return true;
  }

  async runJob(job, tracker) {
    const isImageJob = (job.type === "Image" || job.type === "image");
    const electron = require('electron');
    const fs = nodeFs;
    const path = nodePath;
    const os = { homedir: Jo, tmpdir: Aa };

    const logDebug = (msg, obj) => {
      try {
        const line = "[" + new Date().toISOString() + "] [Job " + job.id + "] " + msg + " " + (obj ? JSON.stringify(obj) : "") + "\n";
        fs.appendFileSync(path.join(os.homedir(), "Desktop", "MUSE_DEBUG.log"), line);
      } catch (e) {}
    };

    // Stagger vi mô 0-800ms để nhiều cửa sổ mở đồng thời mượt mà không nghẽn socket
    await new Promise(r => setTimeout(r, Math.floor(Math.random() * 800)));

    logDebug("Starting Muse video job (Mascot-Proof Shield)", { jobId: job.id, accountId: job.accountId });
    tracker.updateProgress(5, isImageJob ? "Đang kết nối tài khoản Muse AI tạo ảnh..." : "Đang kết nối tài khoản Muse AI tạo video...");

    // 1. THU THẬP TẤT CẢ TÀI KHOẢN MUSE TRONG BROWSER HUB & XÁC ĐỊNH TÀI KHOẢN ĐANG HOẠT ĐỘNG
    const allMuseSessions = (this.sessions?.listSessions ? this.sessions.listSessions() : (typeof T !== 'undefined' && T.listSessions ? T.listSessions() : [])).filter(s => (s.providerId === "muse" || s.providerId === "muse-ai" || (s.provider && s.provider.toLowerCase().includes("muse")) || (s.startUrl && s.startUrl.includes("muse.ai"))) && !s.disabled);

    const activeMuseSessions = [];
    for (const s of allMuseSessions) {
      if (s.partition) {
        try {
          if (typeof ct === "function" && ct(s)) continue;
          const ses = electron.session.fromPartition(s.partition);
          const c = await ses.cookies.get({ domain: 'muse.ai' }).catch(() => []);
          if (c && c.length > 0) {
            activeMuseSessions.push({ ...s, cookieCount: c.length });
          }
        } catch(ce) {}
      }
    }

    logDebug("Active Muse sessions check", { 
      totalFound: activeMuseSessions.length, 
      activeList: activeMuseSessions.map(a => ({ id: a.accountId, name: a.accountName || a.accountDisplayName, cookies: a.cookieCount })) 
    });

    let session = null;

    if (job.accountId && job.payload?.accountSelection === "manual") {
      session = activeMuseSessions.find(s => s.accountId === job.accountId) || 
                allMuseSessions.find(s => s.accountId === job.accountId);
    }

    if (!session || job.payload?.accountSelection !== "manual" || job.accountId === "auto" || job.account === "Auto") {
      if (activeMuseSessions.length > 0) {
        global.__muse_dispatch_counter = (global.__muse_dispatch_counter || 0) + 1;
        session = activeMuseSessions[(global.__muse_dispatch_counter - 1) % activeMuseSessions.length];
        logDebug("Dynamic load balancing selected session", { 
          chosenAccount: session.accountName || session.accountDisplayName || session.accountId,
          activeCount: activeMuseSessions.length,
          dispatchIndex: global.__muse_dispatch_counter
        });
      } else if (allMuseSessions.length > 0) {
        session = allMuseSessions[0];
      }
    }

    if (!session) {
      throw new Error("Không tìm thấy tài khoản Muse AI trong Browser Hub. Vui lòng vào mục 'Tài khoản' để thêm hoặc mở tài khoản Muse AI.");
    }

    let cookies = [];
    try {
      const ses = electron.session.fromPartition(session.partition);
      cookies = await ses.cookies.get({ domain: 'muse.ai' }).catch(() => []);
      logDebug("Selected Muse session cookies", { accountId: session.accountId, count: cookies.length });
      if (cookies.length === 0) {
        if (activeMuseSessions.length > 0) {
          session = activeMuseSessions[0];
          const fallbackSes = electron.session.fromPartition(session.partition);
          cookies = await fallbackSes.cookies.get({ domain: 'muse.ai' }).catch(() => []);
          logDebug("Emergency switched to session with cookies", { accountId: session.accountId, count: cookies.length });
        }
      }
      if (cookies.length === 0) {
        throw new Error("Tài khoản Muse AI chưa đăng nhập! Vui lòng vào mục 'Tài khoản' trên thanh menu để đăng nhập tài khoản Muse AI trước khi tạo video.");
      }
    } catch(err) {
      if (err.message.includes("chưa đăng nhập")) throw err;
    }

    // 2. TẠO CỬA SỔ DÀNH RIÊNG - KHÔNG BỊ CHROMIUM ĐÓNG BĂNG TIẾN TRÌNH TRÊN MÁY KHÁCH
    tracker.updateProgress(10, isImageJob ? "Đang mở trang tạo ảnh Muse AI..." : "Đang mở trang tạo video Muse AI...");
    logDebug("Spawning dedicated automation window with backgroundThrottling=false", { partition: session.partition });

    const win = new electron.BrowserWindow({
      show: false,
      width: 1280,
      height: 800,
      webPreferences: {
        partition: session.partition,
        nodeIntegration: false,
        contextIsolation: true,
        backgroundThrottling: false,
        offscreen: false
      }
    });

    let interceptedNetworkUrl = null;
    let interceptedDownloadFile = null;
    let promptSentTimestamp = 0;
    const initialVideoSet = new Set();
    const knownInputImages = new Set();
    const requestFilter = { urls: ['*://*/*'] };

    const responseStartedListener = (details) => {
      try {
        // Chỉ nhận sau khi prompt đã gửi ít nhất 15 giây
        if (!promptSentTimestamp || (Date.now() - promptSentTimestamp < 15000)) return;
        const u = details.url || "";
        if (!u || initialVideoSet.has(u)) return;

        const hdrs = details.responseHeaders || {};
        let ct = "";
        let cl = 0;
        for (const k of Object.keys(hdrs)) {
          const kl = k.toLowerCase();
          if (kl === 'content-type') {
            ct = Array.isArray(hdrs[k]) ? hdrs[k].join(';').toLowerCase() : String(hdrs[k]).toLowerCase();
          }
          if (kl === 'content-length') {
            cl = parseInt(Array.isArray(hdrs[k]) ? hdrs[k][0] : hdrs[k]) || 0;
          }
        }
        // Loại bỏ file quá nhỏ (< 1.5MB nếu có content-length)
        if (cl > 0 && cl < 1500000) return;

        if (u && (ct.includes('video/') || u.includes('.mp4') || u.includes('media-generation') || (u.includes('cdn') && u.includes('video')))) {
          const ul = u.toLowerCase();
          if (!ul.includes('mascot') && !ul.includes('avatar') && !ul.includes('preview_tiny') && !ul.includes('favicon') && !ul.includes('logo') && !ul.includes('landing') && !ul.includes('hero') && !ul.includes('placeholder')) {
            interceptedNetworkUrl = u;
            logDebug("Intercepted post-prompt video URL via webRequest!", { url: u, contentType: ct, contentLength: cl });
          }
        }
      } catch (e) {}
    };

    const downloadListener = (event, item, webContents) => {
      try {
        const fname = item.getFilename() || ("muse_" + Date.now() + ".mp4");
        const dlUrl = item.getURL();
        const targetPath = path.join(os.tmpdir(), "muse_dl_" + Date.now() + "_" + fname.replace(/[^a-zA-Z0-9._-]/g, "_"));
        item.setSavePath(targetPath);
        logDebug("will-download event fired!", { filename: fname, url: dlUrl, savePath: targetPath });

        item.once('done', (e, state) => {
          if (state === 'completed' && fs.existsSync(targetPath)) {
            const actualSize = fs.statSync(targetPath).size;
            // BẮT BUỘC >= 1.5MB để loại bỏ 100% mascot placeholder
            if (actualSize >= 1500000) {
              interceptedDownloadFile = { path: targetPath, url: dlUrl, size: actualSize };
              logDebug("will-download real video file finished on disk!", { targetPath, actualSize });
            } else {
              logDebug("will-download file too small (< 1.5MB: " + actualSize + " bytes), ignoring placeholder/mascot", { targetPath });
            }
          }
        });
      } catch(err) {
        logDebug("will-download handler error: " + err.message);
      }
    };

    try {
      const wc = win.webContents;

      // 3. ĐIỀU HƯỚNG TỚI /thread/new
      tracker.updateProgress(15, "Đang mở luồng hội thoại mới (thread/new)...");
      await win.loadURL("https://muse.ai/thread/new");
      await new Promise(r => setTimeout(r, 3500));

      let currentUrl = wc.getURL();
      logDebug("Opened URL", { url: currentUrl });

      if (!currentUrl.includes('/thread')) {
        logDebug("Redirected away from /thread/new, retrying navigation...", { currentUrl });
        await win.loadURL("https://muse.ai/thread/new");
        await new Promise(r => setTimeout(r, 4000));
        currentUrl = wc.getURL();
      }

      if (currentUrl.includes('/login') || currentUrl.includes('accounts.google.com') || currentUrl.includes('auth.muse.ai')) {
        throw new Error("Phiên đăng nhập Muse AI đã hết hạn. Vui lòng mở Browser Hub để đăng nhập lại tài khoản Muse AI của bạn!");
      }

      // 3.5. MỞ KHUNG CHAT & NẠP ẢNH THAM CHIẾU (NẾU CÓ)
      tracker.updateProgress(20, "Đang mở khung chat Muse AI...");

      await wc.executeJavaScript(`
        (() => {
          const pills = Array.from(document.querySelectorAll('button, [role="button"], div, span, a')).filter(b => {
            if (b.offsetWidth <= 0 || b.offsetHeight <= 0) return false;
            const t = (b.innerText || '').toLowerCase().trim();
            return t === '+ nhắn tin' || t === 'nhắn tin' || t === '+ message' || t === 'message';
          });
          if (pills.length > 0) {
            try { pills[0].click(); } catch(e) {}
          }
        })()
      `, true);
      await new Promise(r => setTimeout(r, 600));

      const refIds = Array.isArray(job.payload?.referenceAssetIds) ? job.payload.referenceAssetIds : [];
      const refFilePaths = [];
      for (const rid of refIds) {
        let asset = this.assets?.getAsset ? this.assets.getAsset(rid) : null;
        if (!asset && typeof T !== 'undefined' && T.getAsset) asset = T.getAsset(rid);
        const p = asset?.localPath || asset?.path;
        if (p && fs.existsSync(p)) refFilePaths.push(p);
      }
      if (Array.isArray(job.payload?.referenceLocalPaths)) {
        for (const lp of job.payload.referenceLocalPaths) {
          if (lp && typeof lp === 'string' && fs.existsSync(lp) && !refFilePaths.includes(lp)) refFilePaths.push(lp);
        }
      }
      if (job.payload?.referenceLocalPath && fs.existsSync(job.payload.referenceLocalPath)) {
        if (!refFilePaths.includes(job.payload.referenceLocalPath)) refFilePaths.push(job.payload.referenceLocalPath);
      }
      if (refFilePaths.length === 0 && job.payload?.inputImageAssetId) {
        let asset = this.assets?.getAsset ? this.assets.getAsset(job.payload.inputImageAssetId) : null;
        if (!asset && typeof T !== 'undefined' && T.getAsset) asset = T.getAsset(job.payload.inputImageAssetId);
        const p = asset?.localPath || asset?.path;
        if (p && fs.existsSync(p)) refFilePaths.push(p);
      }

      if (refFilePaths.length > 0) {
        logDebug("Attaching reference images into active Muse chat", { count: refFilePaths.length, paths: refFilePaths });
        tracker.updateProgress(25, "Đang đính kèm " + refFilePaths.length + " ảnh cảnh vào Muse AI...");

        try {
          if (!wc.debugger.isAttached()) wc.debugger.attach('1.3');
          const doc = await wc.debugger.sendCommand('DOM.getDocument');
          const node = await wc.debugger.sendCommand('DOM.querySelector', {
            nodeId: doc.root.nodeId,
            selector: 'input[type="file"]'
          });
          if (node?.nodeId) {
            await wc.debugger.sendCommand('DOM.setFileInputFiles', {
              files: refFilePaths,
              nodeId: node.nodeId
            });
            logDebug("CDP setFileInputFiles succeeded", { files: refFilePaths });
          }
        } catch(cdpErr) {
          logDebug("CDP fallback", { error: cdpErr.message });
        }

        for (const fpath of refFilePaths) {
          try {
            const b64 = fs.readFileSync(fpath).toString('base64');
            const fname = path.basename(fpath);
            const mime = fpath.toLowerCase().endsWith('.png') ? 'image/png' : 'image/jpeg';

            await wc.executeJavaScript(`
              (async () => {
                try {
                  const b64 = "${b64}";
                  const mime = "${mime}";
                  const fname = "${fname.replace(/"/g, '')}";
                  const bin = atob(b64);
                  const arr = new Uint8Array(bin.length);
                  for (let i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i);
                  const file = new File([arr], fname, { type: mime });
                  const dt = new DataTransfer();
                  dt.items.add(file);

                  const fi = document.querySelector('input[type="file"]');
                  if (fi) {
                    fi.files = dt.files;
                    fi.dispatchEvent(new Event('input', { bubbles: true }));
                    fi.dispatchEvent(new Event('change', { bubbles: true }));
                  }

                  const chatEl = document.querySelector('textarea, div[contenteditable="true"], [role="textbox"], input');
                  if (chatEl) {
                    chatEl.focus();
                    chatEl.dispatchEvent(new DragEvent('dragenter', { bubbles: true, cancelable: true, dataTransfer: dt }));
                    chatEl.dispatchEvent(new DragEvent('dragover', { bubbles: true, cancelable: true, dataTransfer: dt }));
                    chatEl.dispatchEvent(new DragEvent('drop', { bubbles: true, cancelable: true, dataTransfer: dt }));
                    chatEl.dispatchEvent(new ClipboardEvent('paste', { bubbles: true, cancelable: true, clipboardData: dt }));
                  }
                } catch(e) {}
              })()
            `, true);

            try {
              const nativeImg = electron.nativeImage.createFromPath(fpath);
              electron.clipboard.writeImage(nativeImg);
              wc.focus();
              await wc.executeJavaScript(`
                (() => {
                  const el = document.querySelector('textarea, div[contenteditable="true"], [role="textbox"], input');
                  if (el) { el.focus(); el.click(); }
                })()
              `, true);
              await new Promise(r => setTimeout(r, 200));
              wc.paste();
              await new Promise(r => setTimeout(r, 800));
            } catch(eClip) {}
          } catch(e) {}
        }
      }

      // 🛡️ BƯỚC QUAN TRỌNG NHẤT: CHỤP ẢNH TỨC THÌ (BASELINE SNAPSHOT) TOÀN BỘ VIDEO & ẢNH ĐANG CÓ SẴN TRÊN TRANG TRƯỚC KHI GỬI PROMPT
      // LOẠI TRỪ 100% VIDEO MASCOT / HOẠT HÌNH GẤU / VIDEO MẪU CỦA MUSE AI!
      const baselineSnapshot = await wc.executeJavaScript(`
        (() => {
          try {
            const vSet = [];
            const imgSet = [];
            document.querySelectorAll('video').forEach(v => {
              const s = v.currentSrc || v.src || v.querySelector('source')?.src || v.getAttribute('src') || v.getAttribute('data-src') || v.getAttribute('data-video-src');
              if (s) vSet.push(s);
            });
            document.querySelectorAll('a[href*=".mp4"], a[download], [data-hatch-video-src], [data-video-url], [data-video-src]').forEach(a => {
              const s = a.href || a.getAttribute('data-hatch-video-src') || a.getAttribute('data-video-url') || a.getAttribute('data-video-src');
              if (s) vSet.push(s);
            });
            document.querySelectorAll('img').forEach(img => {
              const s = img.currentSrc || img.src;
              if (s) imgSet.push(s);
            });
            return { videos: vSet, images: imgSet };
          } catch(e) {
            return { videos: [], images: [] };
          }
        })()
      `, true).catch(() => ({ videos: [], images: [] }));

      (baselineSnapshot?.videos || []).forEach(v => initialVideoSet.add(v));
      (baselineSnapshot?.images || []).forEach(im => knownInputImages.add(im));
      logDebug("Initial baseline snapshot captured (strictly excluded from results)", { 
        videoCount: initialVideoSet.size, 
        imageCount: knownInputImages.size,
        excludedVideos: Array.from(initialVideoSet)
      });

      // 4. NHẬP PROMPT VÀ GỬI
      const rawPrompt = typeof job.payload?.prompt === "string" ? job.payload.prompt : (job.title || "");
      let promptToSend = rawPrompt.trim();

      if (isImageJob) {
        const rawRatio = (job.payload?.ratio || job.payload?.aspectRatio || job.payload?.aspect || "9:16").toString().trim();
        const normRatio = (rawRatio === "16:9" || rawRatio === "16/9") ? "16:9" : (rawRatio === "1:1" ? "1:1" : (rawRatio === "4:3" ? "4:3" : (rawRatio === "3:4" ? "3:4" : "9:16")));
        const lower = promptToSend.toLowerCase();
        if (!lower.startsWith("tạo ảnh") && !lower.startsWith("tao anh") && !lower.startsWith("tạo hình ảnh") && !lower.startsWith("create image") && !lower.startsWith("generate image")) {
          promptToSend = "Tạo ảnh " + normRatio + ": " + promptToSend;
        } else if (!lower.includes("9:16") && !lower.includes("16:9") && !lower.includes("1:1") && !lower.includes("4:3") && !lower.includes("3:4")) {
          promptToSend = promptToSend.replace(/^(tạo ảnh|tao anh|tạo hình ảnh|create image|generate image)\s*[:\-\s]*/i, "Tạo ảnh " + normRatio + ": ");
        }
      } else {
        const rawRatio = (job.payload?.ratio || job.payload?.aspectRatio || job.payload?.aspect || "16:9").toString().trim();
        const normRatio = (rawRatio === "9:16" || rawRatio === "9/16") ? "9:16" : "16:9";
        const lower = promptToSend.toLowerCase();
        if (!lower.startsWith("tạo video") && !lower.startsWith("tao video") && !lower.startsWith("tạo clip") && !lower.startsWith("create video") && !lower.startsWith("generate video")) {
          promptToSend = "Tạo video " + normRatio + ": " + promptToSend;
        } else if (!lower.includes("9:16") && !lower.includes("16:9")) {
          promptToSend = promptToSend.replace(/^(tạo video|tao video|tạo clip|create video|generate video)\s*[:\-\s]*/i, "Tạo video " + normRatio + ": ");
        }
      }
      const prompt = promptToSend;
      tracker.updateProgress(30, isImageJob ? ("Đang gửi lệnh tạo ảnh " + (job.payload?.ratio || "9:16") + " lên Muse AI...") : "Đang gửi prompt lên Muse AI...");
      logDebug("Dispatching prompt to Muse AI", { isImageJob, prompt });

      const sendRes = await wc.executeJavaScript(`
        (async () => {
          try {
            const text = ${JSON.stringify(prompt)};

            function findChatInput() {
              const pills = Array.from(document.querySelectorAll('button, [role="button"], div, span')).filter(b => {
                if (b.offsetWidth <= 0 || b.offsetHeight <= 0) return false;
                const rect = b.getBoundingClientRect();
                if (rect.left < 200) return false;
                const t = (b.innerText || '').toLowerCase().trim();
                return t === '+ nhắn tin' || t === 'nhắn tin' || t === '+ message' || t === 'message';
              });
              if (pills.length > 0) {
                try { pills[0].click(); } catch(e) {}
              }

              const all = Array.from(document.querySelectorAll('textarea, div[contenteditable="true"], [role="textbox"], input')).filter(el => {
                if (el.disabled || el.readOnly || el.offsetWidth <= 0 || el.offsetHeight <= 0) return false;
                const rect = el.getBoundingClientRect();
                if (rect.left < 200 && rect.width < 120) return false;
                const p = (el.placeholder || el.getAttribute('placeholder') || el.getAttribute('aria-label') || '').toLowerCase();
                if (p.includes('search') || p.includes('tìm kiếm')) return false;
                if (el.type === 'search') return false;
                return true;
              });

              const msgEl = all.find(el => {
                const p = (el.placeholder || el.getAttribute('placeholder') || el.getAttribute('aria-label') || '').toLowerCase();
                return p.includes('nhắn tin') || p.includes('tin nhắn') || p.includes('message') || p.includes('chat') || p.includes('ask');
              });
              if (msgEl) return msgEl;

              if (all.length > 0) {
                all.sort((a, b) => b.getBoundingClientRect().top - a.getBoundingClientRect().top);
                return all[0];
              }

              return null;
            }

            let el = findChatInput();
            if (!el) {
              await new Promise(r => setTimeout(r, 600));
              el = findChatInput();
            }

            if (!el) {
              return { success: false, error: "Không tìm thấy khung chat Muse AI tại /thread/new" };
            }

            el.focus();
            el.click();

            if (el.isContentEditable) {
              const range = document.createRange();
              range.selectNodeContents(el);
              range.collapse(false);
              const sel = window.getSelection();
              sel.removeAllRanges();
              sel.addRange(range);
              document.execCommand('insertText', false, text);
            } else {
              const proto = Object.getPrototypeOf(el);
              const valSetter = Object.getOwnPropertyDescriptor(proto, 'value')?.set ||
                                Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value')?.set ||
                                Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')?.set;
              if (valSetter) {
                valSetter.call(el, text);
              } else {
                el.value = text;
              }
            }

            el.dispatchEvent(new Event('input', { bubbles: true, cancelable: true }));
            el.dispatchEvent(new Event('change', { bubbles: true, cancelable: true }));
            await new Promise(r => setTimeout(r, 400));

            const sendBtn = document.querySelector('button[aria-label="Gửi"], button[aria-label="Send"], button[title="Gửi"], button[title="Send"]') ||
                            Array.from(document.querySelectorAll('button, [role="button"]')).find(b => {
                              const l = (b.getAttribute('aria-label') || b.innerText || '').toLowerCase();
                              return (l.includes('send') || l.includes('gửi')) && b.offsetWidth > 0;
                            });

            if (sendBtn) {
              sendBtn.click();
              return { success: true };
            }

            const form = el.closest('form');
            if (form && typeof form.requestSubmit === 'function') {
              form.requestSubmit();
              return { success: true };
            }

            try {
              const arrowBtn = Array.from(document.querySelectorAll('button, [role="button"]')).find(b => {
                if (b.offsetWidth <= 0 || b.disabled) return false;
                const html = b.innerHTML.toLowerCase();
                const l = (b.getAttribute('aria-label') || b.innerText || '').toLowerCase();
                return l.includes('send') || l.includes('gửi') || l.includes('submit') || html.includes('<svg');
              });
              if (arrowBtn) arrowBtn.click();
            } catch(e) {}
            el.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', code: 'Enter', keyCode: 13, which: 13, bubbles: true }));
            return { success: true };
          } catch(e) {
            return { success: false, error: e.message };
          }
        })()
      `, true);

      logDebug("Send prompt result", sendRes);
      if (!sendRes?.success) {
        throw new Error("Không thể gửi prompt: " + (sendRes?.error || "Lỗi giao diện"));
      }

      promptSentTimestamp = Date.now();

      // Kích hoạt bộ bắt gói mạng SAU KHI prompt đã gửi thành công
      try {
        win.webContents.session.webRequest.onResponseStarted(requestFilter, responseStartedListener);
      } catch(e) {}
      try {
        win.webContents.session.on('will-download', downloadListener);
      } catch(e) {}

      await new Promise(r => setTimeout(r, 1800));

      currentUrl = wc.getURL();
      logDebug("Active generation URL", { url: currentUrl });
      if (currentUrl && !currentUrl.includes('/thread/new')) {
        session.currentUrl = currentUrl;
        try {
          const viewObj = this.browserViewManager?.views?.get(session.accountId);
          if (viewObj?.view?.webContents && !viewObj.view.webContents.isDestroyed()) {
            viewObj.view.webContents.loadURL(currentUrl);
            logDebug("Synced active thread URL to Browser Hub view", { url: currentUrl });
          }
        } catch(e) {}
      }

      const refFileSizes = refFilePaths.map(p => {
        try { return fs.statSync(p).size; } catch(e) { return 0; }
      }).filter(s => s > 0);

      tracker.updateProgress(35, isImageJob ? "Prompt đã gửi thành công! Đang theo dõi tiến trình tạo ảnh Muse AI..." : "Prompt đã gửi thành công! Đang theo dõi tiến trình tạo video...");

      // 5. POLLING KẾT QUẢ ĐA TẦNG VỚI HÀNG RÀO BẢO VỆ CHỐNG MASCOT TUYỆT ĐỐI
      const isLimited8m = job?.payload?.timeoutLimit === true;
      const timeoutMinutes = isLimited8m ? 8 : 60;
      const timeoutMs = timeoutMinutes * 60 * 1000;
      const startTime = Date.now();
      const minVideoElapsedSeconds = 25; // ⏱️ Muse AI render video luôn mất ít nhất 25-60s
      let videoBytes = null;
      let finalVideoUrl = "";

      while (Date.now() - startTime < timeoutMs) {
        if (tracker.signal?.aborted) throw new Error("Tác vụ đã bị người dùng hủy");

        const elapsed = Math.round((Date.now() - startTime) / 1000);
        const curPct = Math.min(92, 35 + Math.floor(elapsed / (isLimited8m ? 2.5 : 5)));
        const waitStatusSuffix = isLimited8m ? "" : " - Chờ đến khi xong";
        tracker.updateProgress(curPct, isImageJob ? ("Muse AI đang vẽ ảnh (" + elapsed + "s" + waitStatusSuffix + ")...") : ("Muse AI đang dựng video (" + elapsed + "s" + waitStatusSuffix + ")..."));

        // ƯU TIÊN 1: Kiểm tra xem Electron đã tóm được file tải xuống chưa (phải >= 1.5MB và elapsed >= 25s)
        if (elapsed >= minVideoElapsedSeconds && interceptedDownloadFile && interceptedDownloadFile.path && fs.existsSync(interceptedDownloadFile.path)) {
          const stats = fs.statSync(interceptedDownloadFile.path);
          if (stats.size >= 1500000) {
            logDebug("Found completed download file via will-download interceptor!", { path: interceptedDownloadFile.path, size: stats.size });
            videoBytes = fs.readFileSync(interceptedDownloadFile.path);
            finalVideoUrl = interceptedDownloadFile.url || "https://muse.ai";
            break;
          }
        }

        // ƯU TIÊN 2: Quét toàn diện DOM của Muse AI (chỉ chấp nhận video mới xuất hiện SAU tin nhắn prompt của user)
        const scanRes = await wc.executeJavaScript(`
          (() => {
            try {
              const bodyText = (document.body?.innerText || '').toLowerCase();
              if (bodyText.includes('upgrade to pro') || bodyText.includes('out of credits') || bodyText.includes('hết credit')) {
                return { hasError: true, error: "Tài khoản Muse AI đã hết credits." };
              }

              const isImg = ${isImageJob};
              const elapsed = ${elapsed};
              const initialVideos = new Set(${JSON.stringify(Array.from(initialVideoSet))});

              // 1. ĐỊNH VỊ TIN NHẮN PROMPT CỦA USER ĐỂ ĐẢM BẢO CHỈ LẤY KẾT QUẢ NẰM SAU PROMPT
              const promptSnippet = ${JSON.stringify(prompt.slice(0, 30).trim().toLowerCase())};
              let promptNode = null;
              if (promptSnippet) {
                const allNodes = Array.from(document.querySelectorAll('*')).filter(el => {
                  if (el.children.length > 2) return false;
                  const t = (el.innerText || el.textContent || '').toLowerCase();
                  return t.includes(promptSnippet);
                });
                if (allNodes.length > 0) {
                  promptNode = allNodes[allNodes.length - 1];
                }
              }

              // KIỂM TRA TRẠNG THÁI ĐANG XỬ LÝ (STOP BUTTON / SPINNER / THINKING)
              const stopBtn = document.querySelector('button[aria-label*="Stop"], button[aria-label*="Dừng"], button[title*="Stop"], button[title*="Dừng"]');
              const hasSpinner = document.querySelector('[class*="spinner"], [class*="generating"], [class*="progress"], [role="progressbar"], [aria-busy="true"]') !== null;
              const isGenerating = !!stopBtn || hasSpinner || bodyText.includes('generating...') || bodyText.includes('thinking...') || bodyText.includes('creating...');

              // ẢNH JOB
              if (isImg) {
                if (elapsed < 7 || isGenerating) {
                  return { found: false, isGenerating: true };
                }

                const knownInputs = new Set(${JSON.stringify(Array.from(knownInputImages))});
                const allImgs = Array.from(document.querySelectorAll('img'));
                const candidateImgs = allImgs.filter(img => {
                  const r = img.getBoundingClientRect();
                  const w = img.naturalWidth || r.width || 0;
                  const h = img.naturalHeight || r.height || 0;
                  const src = img.currentSrc || img.src || '';
                  if (w < 200 || h < 200) return false;
                  if (src.includes('avatar') || src.includes('profile') || src.includes('icon') || src.includes('logo') || src.includes('landing') || src.includes('mascot')) return false;
                  if (knownInputs.has(src)) return false;
                  if (promptNode) {
                    const pos = promptNode.compareDocumentPosition(img);
                    if (!(pos & Node.DOCUMENT_POSITION_FOLLOWING)) return false;
                  }
                  return src.startsWith('http') || src.startsWith('blob:') || src.startsWith('data:');
                });

                if (candidateImgs.length > 0) {
                  const targetImg = candidateImgs[candidateImgs.length - 1];
                  const parentA = targetImg.closest('a[href*=".png"], a[href*=".jpg"], a[href*=".jpeg"], a[href*=".webp"]');
                  const finalUrl = (parentA && parentA.href) ? parentA.href : (targetImg.currentSrc || targetImg.src);
                  return { found: true, mediaType: 'image', url: finalUrl };
                }
                return { found: false, isGenerating: false };
              }

              // VIDEO JOB: BẮT BUỘC elapsed >= 25s VÀ KHÔNG ĐANG GENERATING
              if (!isImg) {
                if (elapsed < ${minVideoElapsedSeconds} || isGenerating) {
                  return { found: false, isGenerating: true };
                }

                // A. KÍCH HOẠT CHUỘT ẢO LÊN CÁC KHỐI TIN NHẮN SAU PROMPT ĐỂ HYDRATE VIDEO PLAYER
                const cards = Array.from(document.querySelectorAll('[class*="media"], [class*="message"], [class*="card"], [class*="bubble"], [class*="thread"], [class*="chat"]')).filter(el => {
                  const r = el.getBoundingClientRect();
                  if (r.width < 120 || r.height < 120 || r.top < 80) return false;
                  if (promptNode) {
                    const pos = promptNode.compareDocumentPosition(el);
                    if (!(pos & Node.DOCUMENT_POSITION_FOLLOWING)) return false;
                  }
                  return true;
                });
                if (cards.length > 0) {
                  const lastCard = cards[cards.length - 1];
                  try {
                    lastCard.dispatchEvent(new MouseEvent('mouseover', { bubbles: true }));
                    lastCard.dispatchEvent(new MouseEvent('mouseenter', { bubbles: true }));
                  } catch(e) {}
                }

                // B. BẤM TASK HOÀN THÀNH ("Created 9:16", "Created 16:9", "Created video")
                const completedTasks = Array.from(document.querySelectorAll('button, [role="button"], div, li')).filter(el => {
                  const t = (el.innerText || '').toLowerCase();
                  return t.includes('created 16:9') || t.includes('created 9:16') || t.includes('resent v2') || (t.includes('created') && t.includes('video'));
                });
                if (completedTasks.length > 0) {
                  const lastTask = completedTasks[completedTasks.length - 1];
                  try {
                    lastTask.dispatchEvent(new MouseEvent('click', { bubbles: true }));
                  } catch(e) {}
                }

                // C. QUÉT THUỘC TÍNH [data-hatch-video-src] HOẶC [data-video-url] (PHẢI MỚI VÀ SAU PROMPT)
                const hatchVideos = Array.from(document.querySelectorAll('[data-hatch-video-src], [data-video-url], [data-video-src]'));
                for (let i = hatchVideos.length - 1; i >= 0; i--) {
                  const e = hatchVideos[i];
                  const u = e.getAttribute('data-hatch-video-src') || e.getAttribute('data-video-url') || e.getAttribute('data-video-src');
                  if (u && (u.startsWith('http') || u.startsWith('blob:'))) {
                    if (!initialVideos.has(u) && !u.includes('mascot') && !u.includes('avatar') && !u.includes('landing') && !u.includes('hero') && !u.includes('placeholder')) {
                      if (promptNode) {
                        const pos = promptNode.compareDocumentPosition(e);
                        if (!(pos & Node.DOCUMENT_POSITION_FOLLOWING)) continue;
                      }
                      return { found: true, mediaType: 'video', url: u };
                    }
                  }
                }

                // D. QUÉT TẤT CẢ THẺ VIDEO (BẮT BUỘC KHÔNG NẰM TRONG INITIAL SNAPSHOT VÀ SAU PROMPT)
                const allVideos = Array.from(document.querySelectorAll('video'));
                for (let i = allVideos.length - 1; i >= 0; i--) {
                  const v = allVideos[i];
                  const u = v.currentSrc || v.src || v.querySelector('source')?.src || v.getAttribute('src') || v.getAttribute('data-src') || v.getAttribute('data-video-src');
                  if (u && (u.startsWith('http') || u.startsWith('blob:'))) {
                    if (!initialVideos.has(u) && !u.includes('mascot') && !u.includes('avatar') && !u.includes('preview_tiny') && !u.includes('landing') && !u.includes('hero') && !u.includes('placeholder')) {
                      if (promptNode) {
                        const pos = promptNode.compareDocumentPosition(v);
                        if (!(pos & Node.DOCUMENT_POSITION_FOLLOWING)) continue;
                      }
                      return { found: true, mediaType: 'video', url: u, duration: v.duration || 0 };
                    }
                  }
                }

                // E. QUÉT CÁC NÚT TẢI XUỐNG XUẤT HIỆN SAU TIN NHẮN PROMPT
                const allDlButtons = Array.from(document.querySelectorAll('button, a, [role="button"], [aria-label], [title]')).filter(el => {
                  const t = (el.innerText || '').toLowerCase().trim();
                  const l = (el.getAttribute('aria-label') || '').toLowerCase();
                  const tit = (el.getAttribute('title') || '').toLowerCase();
                  const isDl = t.includes('tải xuống') || t.includes('download') || l.includes('tải xuống') || l.includes('download') || tit.includes('tải xuống') || tit.includes('download');
                  if (!isDl) return false;
                  if (promptNode) {
                    const pos = promptNode.compareDocumentPosition(el);
                    if (!(pos & Node.DOCUMENT_POSITION_FOLLOWING)) return false;
                  }
                  return true;
                });
                if (allDlButtons.length > 0) {
                  const lastBtn = allDlButtons[allDlButtons.length - 1];
                  if (lastBtn.tagName.toLowerCase() === 'a' && lastBtn.href && (lastBtn.href.startsWith('http') || lastBtn.href.startsWith('blob:'))) {
                    if (!initialVideos.has(lastBtn.href)) {
                      return { found: true, mediaType: 'video', url: lastBtn.href };
                    }
                  }
                  try { lastBtn.click(); } catch(e) {}
                }

                // F. QUÉT CÁC LINK TẢI TRỰC TIẾP MP4 SAU PROMPT
                const links = Array.from(document.querySelectorAll('a[href*=".mp4"], a[download], a[href*="/api/files/"], a[href*="media-generation"]'));
                for (let i = links.length - 1; i >= 0; i--) {
                  const a = links[i];
                  if (a.href && !initialVideos.has(a.href)) {
                    if (promptNode) {
                      const pos = promptNode.compareDocumentPosition(a);
                      if (!(pos & Node.DOCUMENT_POSITION_FOLLOWING)) continue;
                    }
                    return { found: true, mediaType: 'video', url: a.href };
                  }
                }
              }

              return { found: false, isGenerating: false };
            } catch(e) {
              return { found: false, error: e.message };
            }
          })()
        `, true);

        if (scanRes?.hasError) {
          throw new Error(scanRes.error);
        }

        // ƯU TIÊN 3: Nếu bắt được URL từ DOM hoặc từ Network Interceptor (chỉ sau khi elapsed >= minVideoElapsedSeconds)
        const candidateUrl = (elapsed >= minVideoElapsedSeconds && scanRes?.found && scanRes.url) 
          ? scanRes.url 
          : ((elapsed >= minVideoElapsedSeconds && interceptedNetworkUrl && !initialVideoSet.has(interceptedNetworkUrl)) ? interceptedNetworkUrl : null);

        if (candidateUrl && !isImageJob) {
          logDebug("Candidate video URL detected (elapsed: " + elapsed + "s)", { url: candidateUrl, source: scanRes?.found ? 'DOM' : 'Network' });

          let downloadedBytes = null;

          // Cách 1: Thử lấy qua in-page Fetch & FileReader
          try {
            const blobRes = await wc.executeJavaScript(`
              (async () => {
                try {
                  const r = await fetch(${JSON.stringify(candidateUrl)});
                  if (!r.ok) return { ok: false, error: 'HTTP ' + r.status };
                  const blob = await r.blob();
                  if (blob.size > 512 * 1024 * 1024) return { ok: false, error: 'File quá lớn' };

                  const b64 = await new Promise((resolve, reject) => {
                    const reader = new FileReader();
                    reader.onload = () => resolve(reader.result.split(',')[1]);
                    reader.onerror = () => reject(Error('Cannot read blob'));
                    reader.readAsDataURL(blob);
                  });
                  return { ok: true, size: blob.size, b64: b64 };
                } catch(e) {
                  return { ok: false, error: e.message };
                }
              })()
            `, true);

            if (blobRes?.ok && blobRes.b64) {
              downloadedBytes = Buffer.from(blobRes.b64, 'base64');
            }
          } catch(eFetch) {
            logDebug("In-page fetch failed, trying Node.js Main process download...", { error: eFetch.message });
          }

          // Cách 2: Fallback qua Electron Main Process Session Fetch
          if (!downloadedBytes && candidateUrl.startsWith('http')) {
            try {
              logDebug("Attempting Electron net.fetch directly from main process...", { url: candidateUrl });
              const ses = electron.session.fromPartition(session.partition);
              const netResp = await ses.net.fetch(candidateUrl);
              if (netResp.ok) {
                const ab = await netResp.arrayBuffer();
                downloadedBytes = Buffer.from(ab);
              }
            } catch(eNet) {
              logDebug("Electron net.fetch error: " + eNet.message);
            }
          }

          // 🛡️ BỘ LỌC MASCOT BẤT KHẢ XÂM PHẠM: Video thật luôn >= 1.5MB (1,500,000 bytes)
          if (downloadedBytes) {
            if (downloadedBytes.length < 1500000) {
              logDebug("⚠️ Candidate video rejected: size too small (< 1.5MB: " + downloadedBytes.length + " bytes), likely mascot/placeholder. Adding to initialVideoSet to ignore permanently.", { url: candidateUrl });
              initialVideoSet.add(candidateUrl);
            } else {
              videoBytes = downloadedBytes;
              finalVideoUrl = candidateUrl;
              logDebug("🎉 Captured REAL video successfully!", { byteLength: videoBytes.length, url: finalVideoUrl });
              break;
            }
          }
        }

        // XỬ LÝ LƯU ẢNH (IMAGE JOB)
        if (scanRes?.found && scanRes.url && (scanRes.mediaType === 'image' || isImageJob)) {
          try {
            tracker.updateProgress(90, "Đang trích xuất ảnh Muse AI...");
            const imgBlobRes = await wc.executeJavaScript(`
              (async () => {
                try {
                  const r = await fetch(${JSON.stringify(scanRes.url)});
                  if (!r.ok) return { ok: false, error: 'HTTP ' + r.status };
                  const blob = await r.blob();
                  const b64 = await new Promise((resolve, reject) => {
                    const reader = new FileReader();
                    reader.onload = () => resolve(reader.result.split(',')[1]);
                    reader.onerror = () => reject(Error('Cannot read blob'));
                    reader.readAsDataURL(blob);
                  });
                  return { ok: true, size: blob.size, mimeType: blob.type || 'image/png', b64: b64 };
                } catch(e) {
                  return { ok: false, error: e.message };
                }
              })()
            `, true);

            if (imgBlobRes?.ok && imgBlobRes.b64) {
              const imgBytes = Buffer.from(imgBlobRes.b64, 'base64');
              if (refFileSizes.includes(imgBytes.length)) {
                logDebug("Candidate image matches exact byte size of reference input, skipping...");
              } else if (imgBytes.length > 5000) {
                tracker.updateProgress(98, "Đang lưu ảnh vào Thư viện...");
                const assetService = this.assets || (typeof V !== 'undefined' ? V : null);
                if (assetService && typeof assetService.cacheGeneratedBytes === 'function') {
                  const savedAsset = await assetService.cacheGeneratedBytes(job, {
                    bytes: imgBytes,
                    mimeType: imgBlobRes.mimeType || "image/png",
                    remoteUrl: scanRes.url,
                    providerAssetId: "muse-img-" + Date.now()
                  });
                  tracker.updateProgress(100, "Tạo ảnh Muse AI hoàn tất!");
                  return {
                    assets: [savedAsset],
                    provider: {
                      operationId: "muse-" + Date.now(),
                      raw: {
                        model: "muse-image",
                        prompt: prompt,
                        remoteUrl: scanRes.url,
                        accountId: session.accountId
                      }
                    }
                  };
                }
              }
            }
          } catch(imgErr) {}
        }

        await new Promise(r => setTimeout(r, 2000));
      }

      if (isImageJob) {
        throw new Error("Quá thời gian chờ tạo ảnh trên Muse AI (" + timeoutMinutes + " phút). Vui lòng thử lại với prompt khác hoặc kiểm tra tài khoản Muse AI.");
      }

      if (!videoBytes || videoBytes.length < 1500000) {
        throw new Error("Quá thời gian chờ tạo video trên Muse AI (" + timeoutMinutes + " phút). Vui lòng kiểm tra lại tài khoản Muse AI.");
      }

      tracker.updateProgress(98, "Đang lưu video vào Thư viện...");
      const assetService = this.assets || (typeof V !== 'undefined' ? V : null);
      if (!assetService || typeof assetService.cacheGeneratedVideoBytes !== 'function') {
        throw new Error("AssetService không khả dụng");
      }

      const savedAsset = await assetService.cacheGeneratedVideoBytes(job, {
        bytes: videoBytes,
        mimeType: "video/mp4",
        remoteUrl: finalVideoUrl || "https://muse.ai",
        providerAssetId: "muse-" + Date.now()
      });

      tracker.updateProgress(100, "Tạo video Muse AI hoàn tất!");
      logDebug("Successfully finished Muse AI job and saved video asset!", { assetId: savedAsset.id });

      return {
        assets: [savedAsset],
        provider: {
          operationId: "muse-" + Date.now(),
          raw: {
            model: "muse-video",
            prompt: prompt,
            remoteUrl: finalVideoUrl,
            accountId: session.accountId
          }
        }
      };
    } finally {
      try {
        win.webContents.session.webRequest.onResponseStarted(requestFilter, null);
      } catch(e) {}
      try {
        win.webContents.session.removeListener('will-download', downloadListener);
      } catch(e) {}
      try {
        if (!win.isDestroyed()) win.destroy();
      } catch(e) {}
    }
  }
}
