const fs = require('fs');
const path = require('path');

const targetFile = path.resolve(__dirname, '../app/out/main/index.js');
let content = fs.readFileSync(targetFile, 'utf8');

console.log('Original index.js length:', content.length);

// 1. Deduplicate refFilePaths
const oldRefCollector = `      for (const rid of refIds) {
        let asset = this.assets?.getAsset ? this.assets.getAsset(rid) : null;
        if (!asset && typeof T !== 'undefined' && T.getAsset) asset = T.getAsset(rid);
        const p = asset?.localPath || asset?.path;
        if (p && fs.existsSync(p)) {
          refFilePaths.push(p);
        }
      }
      if (job.payload?.referenceLocalPath && fs.existsSync(job.payload.referenceLocalPath)) {
        if (!refFilePaths.includes(job.payload.referenceLocalPath)) {
          refFilePaths.push(job.payload.referenceLocalPath);
        }
      }
      if (refFilePaths.length === 0 && job.payload?.inputImageAssetId) {
        let asset = this.assets?.getAsset ? this.assets.getAsset(job.payload.inputImageAssetId) : null;
        if (!asset && typeof T !== 'undefined' && T.getAsset) asset = T.getAsset(job.payload.inputImageAssetId);
        const p = asset?.localPath || asset?.path;
        if (p && fs.existsSync(p)) {
          refFilePaths.push(p);
        }
      }`;

const newRefCollector = `      for (const rid of refIds) {
        let asset = this.assets?.getAsset ? this.assets.getAsset(rid) : null;
        if (!asset && typeof T !== 'undefined' && T.getAsset) asset = T.getAsset(rid);
        const p = asset?.localPath || asset?.path;
        if (p && fs.existsSync(p)) {
          if (!refFilePaths.includes(p)) {
            refFilePaths.push(p);
          }
        }
      }
      if (job.payload?.referenceLocalPath && fs.existsSync(job.payload.referenceLocalPath)) {
        if (!refFilePaths.includes(job.payload.referenceLocalPath)) {
          refFilePaths.push(job.payload.referenceLocalPath);
        }
      }
      if (refFilePaths.length === 0 && job.payload?.inputImageAssetId) {
        let asset = this.assets?.getAsset ? this.assets.getAsset(job.payload.inputImageAssetId) : null;
        if (!asset && typeof T !== 'undefined' && T.getAsset) asset = T.getAsset(job.payload.inputImageAssetId);
        const p = asset?.localPath || asset?.path;
        if (p && fs.existsSync(p)) {
          if (!refFilePaths.includes(p)) {
            refFilePaths.push(p);
          }
        }
      }`;

if (content.includes(oldRefCollector)) {
  content = content.replace(oldRefCollector, newRefCollector);
  console.log('✓ Strict deduplication for refFilePaths applied');
} else {
  console.log('oldRefCollector already updated or modified');
}

// 2. Prevent Method B (Clipboard / DataTransfer paste) from running if Method A (CDP) succeeded
const oldMethodB = `        // B. Phương thức 2: DataTransfer DOM Injection & Clipboard Paste
        for (const fpath of refFilePaths) {
          try {
            const b64 = fs.readFileSync(fpath).toString('base64');
            const fname = path.basename(fpath);
            const mime = fpath.toLowerCase().endsWith('.png') ? 'image/png' : 'image/jpeg';

            await wc.executeJavaScript(\`
              (async () => {
                try {
                  const b64 = "\${b64}";
                  const mime = "\${mime}";
                  const fname = "\${fname.replace(/"/g, '')}";
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
            \`, true);

            // Clipboard Native Image Paste
            try {
              const nativeImg = electron.nativeImage.createFromPath(fpath);
              electron.clipboard.writeImage(nativeImg);
              wc.focus();
              await wc.executeJavaScript(\`
                (() => {
                  const el = document.querySelector('textarea, div[contenteditable="true"], [role="textbox"], input');
                  if (el) { el.focus(); el.click(); }
                })()
              \`, true);
              await new Promise(r => setTimeout(r, 200));
              wc.paste();
              await new Promise(r => setTimeout(r, 800));
            } catch(eClip) {}

            logDebug("Attached reference image successfully", { path: fpath });
          } catch(e) {
            logDebug("Error attaching image", { path: fpath, error: e.message });
          }
        }`;

const newMethodB = `        // B. Phương thức 2 (DỰ PHÒNG: CHỈ CHẠY KHI CDP THẤT BẠI): DataTransfer DOM Injection & Clipboard Paste
        if (!cdpAttached) {
          logDebug("CDP not attached, running fallback attachment method", { count: refFilePaths.length });
          for (const fpath of refFilePaths) {
            try {
              const b64 = fs.readFileSync(fpath).toString('base64');
              const fname = path.basename(fpath);
              const mime = fpath.toLowerCase().endsWith('.png') ? 'image/png' : 'image/jpeg';

              await wc.executeJavaScript(\`
                (async () => {
                  try {
                    const b64 = "\${b64}";
                    const mime = "\${mime}";
                    const fname = "\${fname.replace(/"/g, '')}";
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
              \`, true);

              // Clipboard Native Image Paste
              try {
                const nativeImg = electron.nativeImage.createFromPath(fpath);
                electron.clipboard.writeImage(nativeImg);
                wc.focus();
                await wc.executeJavaScript(\`
                  (() => {
                    const el = document.querySelector('textarea, div[contenteditable="true"], [role="textbox"], input');
                    if (el) { el.focus(); el.click(); }
                  })()
                \`, true);
                await new Promise(r => setTimeout(r, 200));
                wc.paste();
                await new Promise(r => setTimeout(r, 800));
              } catch(eClip) {}

              logDebug("Attached reference image successfully", { path: fpath });
            } catch(e) {
              logDebug("Error attaching image", { path: fpath, error: e.message });
            }
          }
        } else {
          logDebug("CDP attachment succeeded! Skipping Method B to prevent any duplicate image paste.");
        }`;

if (content.includes(oldMethodB)) {
  content = content.replace(oldMethodB, newMethodB);
  console.log('✓ Method B guarded with if (!cdpAttached) to eliminate duplicate paste');
} else {
  console.log('oldMethodB not found or already guarded');
}

fs.writeFileSync(targetFile, content, 'utf8');
console.log('Successfully written updated index.js. Final length:', content.length);
