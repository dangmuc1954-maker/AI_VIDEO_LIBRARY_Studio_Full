/*
 * Tris 12/11/2026 — Xóa dấu ✦ (sparkle) của Google Flow / Veo trên video KHÔNG để lại vết:
 * dấu là lớp trắng bán trong suốt có hình cố định → tính ngược màu gốc: gốc = (ảnh - a·255) / (1 - a).
 *  1. Lấy vài khung góc phải dưới (ffmpeg → rgb24), dò vị trí + cỡ dấu ✦ (so khuôn, nhiều tỉ lệ).
 *  2. Không thấy dấu → trả {removed:false} (KHÔNG làm nhòe video không có dấu).
 *  3. Tự chọn độ đậm k cho từng video (k làm dấu "biến mất" nhất, có chặn tối ngược).
 *  4. ffmpeg blend tính ngược đúng vùng dấu, phần còn lại của video giữ nguyên.
 * Khuôn độ trong đo từ 227 khung video Veo 720p thật (alpha·255, khung 60×60).
 */
const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawn } = require('child_process');

const PATCH = {"w": 60, "h": 60, "rightOffset": 150, "bottomOffset": 150, "b64": "AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAI+PQEAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAABFHSBAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAACxKSikAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAD1LTEIBAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAE0hLSkkVAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAALkpKSks0AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAANRktKSUpIDQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAtSUpKSkpJLgAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAxHS0pKSkpKSRQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAATtKS0pKSkpKSzUFAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAI0tLS0pLSkpKS0shAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAMR0tLS0tLSkpLS0tDDwAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAABA9TEtLS0pKSkpLS0pMPQsAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAThJS0tLS0pKSkpLS0tLSTUCAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAFK0tLS0tLSkpKSktLS0tLS0ssBAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAErSUtLS0xLS0tKSktLS0tLS0tJKwIAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAACDRKS0tLS0tLSkpKSkpLS0tLS0tLTDkOAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAPPUhKSktLS0tLSkpKSkpKSktLS0tLS0k+DQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAABCFETEtKS0tLS0tKSkpKSUpKSkpLS0tLTEtMSSUEAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAUNUpLS0tKSkpLSktKSkpJSUpKSkpKS0tMS0tLS0w9DAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAABDS1HS0xLS0tLS0pKSkpKSklJSUlKSkpKS0tLS0tMTEtLSS0NAAAAAAAAAAAAAAAAAAAAAAAAAAAAABU0SUpLS0tLS0tLS0pKSkpKSklJSUlKSkpKS0tLTEtMS0xLS0pGLhMBAAAAAAAAAAAAAAAAAAAAAhMsQklLS0tLS0tLSktKSkpKSkpKSklJSUlKS0pKSktLS0tLS0tLS0tLTEg+KhEDAAAAAAAAAAAAAAAAP0lKS0tLS0tLS0tLS0pLS0pKSkpKSklJSUlKSkpLS0tLS0tLS0tLS0tKSkpMSUk/AAAAAAAAAAAAAAAAP0lKTEpLS0tLS0tLS0pKS0tLS0tLSklJSUlKS0tLS0tLS0tLS0tLS0pKSktLSkpAAAAAAAAAAAAAAAAAARErQUlLS0tLS0tLS0tLS0tLTEtLSkpKSUpLS0tLS0tLS0tLS0tLTEtLS0pEKxACAAAAAAAAAAAAAAAAAAAAAxQvSEpLS0tMS0tLS0tLS0tLSkpKSkpLS0tLS0xMS0xLS0xMTEpJNhUDAAAAAAAAAAAAAAAAAAAAAAAAAAAADi1KS0tMTExMS0tLS0tLS0tLS0tLS0tLS0xMTExMS0xMSi4OAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAANPktLS0xMTEtMS0tLS0pLSktMTEtLS0xMTExLS0o3FAQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAABCVJTExMTExMTEtLS0tLS0tMTExMTExMTEtLRSEFAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAEMPkpLTExMTExLS0tLS0tMTExMTExLS0o/EAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAEDpMS0xMTExLS0tLS0tMTExMTExLTDUJAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAIsSktLTExLS0tLS0tLTEtMS0xJLAIAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAGLEtLS0tLS0tLS0tLTEtNTEwrBQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAjZJS0tLS0tLS0tLTEtLSToDAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAo+TEtLS0tLS0tLTEtMPg4AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAQRUtLS0tLS0tLS0tJDQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAIUpLS0tLS0tLS0wmAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAABTVMS0tLS0tLTD0EAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAABNJS0tLS0tLSwwAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAEuSktLS0tLLwIAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAANSExLSktHDgAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAANUxKS0suAQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAFElKS0gTAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAkNMTEADAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAACtKSioAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAABBJSREAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAI/PwMAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA"};
const BASE = (() => {
  const buf = Buffer.from(PATCH.b64, 'base64');
  const a = new Float32Array(PATCH.w * PATCH.h);
  for (let i = 0; i < a.length; i++) a[i] = buf[i] / 255;
  return { w: PATCH.w, h: PATCH.h, a };
})();

function resizeAlpha(scale) {
  const w = Math.max(8, Math.round(BASE.w * scale)), h = Math.max(8, Math.round(BASE.h * scale));
  const out = new Float32Array(w * h);
  const g = (xx, yy) => BASE.a[yy * BASE.w + xx];
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const sx = Math.min(BASE.w - 1.001, Math.max(0, (x + 0.5) / scale - 0.5));
    const sy = Math.min(BASE.h - 1.001, Math.max(0, (y + 0.5) / scale - 0.5));
    const x0 = Math.floor(sx), y0 = Math.floor(sy), fx = sx - x0, fy = sy - y0;
    out[y * w + x] = (g(x0, y0) * (1 - fx) + g(x0 + 1, y0) * fx) * (1 - fy) + (g(x0, y0 + 1) * (1 - fx) + g(x0 + 1, y0 + 1) * fx) * fy;
  }
  return { w, h, a: out };
}

function boxBlur(src, w, h, r) {
  const W1 = w + 1, ii = new Float64Array(W1 * (h + 1));
  for (let y = 0; y < h; y++) { let s = 0; for (let x = 0; x < w; x++) { s += src[y * w + x]; ii[(y + 1) * W1 + x + 1] = ii[y * W1 + x + 1] + s; } }
  const out = new Float32Array(w * h);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const xa = Math.max(0, x - r), xb = Math.min(w, x + r + 1), ya = Math.max(0, y - r), yb = Math.min(h, y + r + 1);
    out[y * w + x] = (ii[yb * W1 + xb] - ii[ya * W1 + xb] - ii[yb * W1 + xa] + ii[ya * W1 + xa]) / ((xb - xa) * (yb - ya));
  }
  return out;
}
function grayOf(rgb, n) { const g = new Float32Array(n); for (let i = 0; i < n; i++) g[i] = (rgb[i * 3] + rgb[i * 3 + 1] + rgb[i * 3 + 2]) / 3; return g; }
function highPass(g, w, h, r) { const b = boxBlur(g, w, h, r); const o = new Float32Array(w * h); for (let i = 0; i < o.length; i++) o[i] = g[i] - b[i]; return o; }

function ncc(img, iw, ih, tpl, tw, th, xr, yr) {
  let tm = 0; for (let i = 0; i < tpl.length; i++) tm += tpl[i]; tm /= tpl.length;
  const t = new Float32Array(tpl.length); let ts = 0;
  for (let i = 0; i < t.length; i++) { t[i] = tpl[i] - tm; ts += t[i] * t[i]; }
  ts = Math.sqrt(ts) || 1;
  let best = { s: -2, x: 0, y: 0 };
  const xs = xr || [0, iw - tw], ys = yr || [0, ih - th], n = tw * th;
  for (let y = Math.max(0, ys[0]); y <= Math.min(ih - th, ys[1]); y++) for (let x = Math.max(0, xs[0]); x <= Math.min(iw - tw, xs[1]); x++) {
    let sm = 0, sq = 0, cr = 0;
    for (let j = 0; j < th; j++) { const row = (y + j) * iw + x, tr = j * tw; for (let i = 0; i < tw; i++) { const v = img[row + i]; sm += v; sq += v * v; cr += v * t[tr + i]; } }
    const varr = sq - sm * sm / n; if (varr <= 1e-6) continue;
    const s = cr / (Math.sqrt(varr) * ts);
    if (s > best.s) best = { s, x, y };
  }
  return best;
}

function run(ffmpeg, args, wantStdout) {
  return new Promise((resolve, reject) => {
    const p = spawn(ffmpeg, args); const chunks = []; let err = '';
    if (wantStdout) p.stdout.on('data', d => chunks.push(d));
    p.stderr.on('data', d => { err += d.toString(); if (err.length > 20000) err = err.slice(-10000); });
    p.on('error', reject);
    p.on('close', code => (code === 0 ? resolve(Buffer.concat(chunks)) : reject(new Error('ffmpeg lỗi ' + code + ': ' + err.slice(-400)))));
  });
}

async function grabCorner(ffmpeg, input, W, H, C, count) {
  const buf = await run(ffmpeg, ['-hide_banner', '-loglevel', 'error', '-i', input, '-vf', `fps=2,crop=${C}:${C}:${W - C}:${H - C}`,
    '-frames:v', String(count), '-f', 'rawvideo', '-pix_fmt', 'rgb24', 'pipe:1'], true);
  const fsz = C * C * 3, frames = [];
  for (let o = 0; o + fsz <= buf.length; o += fsz) frames.push(buf.subarray(o, o + fsz));
  return frames;
}

/** Dò dấu ✦: trả {scale, x, y, score, alpha, frames, C} (x,y = góc trái trên của khuôn trong khung video) hoặc null. */
async function detect(ffmpeg, input, W, H) {
  const short = Math.min(W, H), C = Math.min(short, Math.max(200, Math.round(short * 0.34))) & ~1; // chẵn: ffmpeg làm tròn crop lẻ
  const frames = await grabCorner(ffmpeg, input, W, H, C, 14);
  if (frames.length === 0) return null;
  const n = C * C, avg = new Float32Array(n), r = Math.max(4, Math.round(short / 120));
  for (const f of frames) { const hp = highPass(grayOf(f, n), C, C, r); for (let i = 0; i < n; i++) avg[i] += hp[i] / frames.length; }
  const scales = [...new Set([1, 1.25, 1.5, 2, 2.25, 3, +(short / 720).toFixed(3)])].filter(s => BASE.w * s < C - 4);
  const C2 = Math.floor(C / 2), small = new Float32Array(C2 * C2);
  for (let y = 0; y < C2; y++) for (let x = 0; x < C2; x++)
    small[y * C2 + x] = (avg[(2 * y) * C + 2 * x] + avg[(2 * y) * C + 2 * x + 1] + avg[(2 * y + 1) * C + 2 * x] + avg[(2 * y + 1) * C + 2 * x + 1]) / 4;
  let best = null;
  for (const s of scales) {
    const al = resizeAlpha(s), al2 = resizeAlpha(s / 2);
    const coarse = ncc(small, C2, C2, al2.a, al2.w, al2.h);
    const fine = ncc(avg, C, C, al.a, al.w, al.h, [coarse.x * 2 - 3, coarse.x * 2 + 3], [coarse.y * 2 - 3, coarse.y * 2 + 3]);
    if (!best || fine.s > best.score) best = { scale: s, x: W - C + fine.x, y: H - C + fine.y, score: fine.s, alpha: al, frames, C };
  }
  return best;
}

/** Độ đậm thật của dấu giảm khi nền sáng (đo trên 1.451 khung Veo 720p). */
function brightF(v) {
  const xs = [0, 110, 150, 195, 240, 255], ys = [1, 1, 0.95, 0.91, 0.80, 0.75];
  for (let i = 1; i < xs.length; i++) if (v <= xs[i]) return ys[i - 1] + (ys[i] - ys[i - 1]) * (v - xs[i - 1]) / (xs[i] - xs[i - 1]);
  return 0.75;
}
const median = arr => { const s = [...arr].sort((x, y) => x - y); return s.length ? s[Math.floor(s.length / 2)] : NaN; };

/** Độ đậm k của dấu trong video này = trung vị (ảnh - nền) / (a·(255 - nền)) trên nhiều khung; nền = trung vị viền quanh dấu. */
function chooseStrength(det, W, H) {
  const { alpha: al, frames, C } = det, ox = det.x - (W - C), oy = det.y - (H - C);
  let maxA = 0; for (const v of al.a) if (v > maxA) maxA = v;
  const ks = [];
  for (const f of frames) {
    const ring = [], core = [];
    for (let y = 0; y < al.h; y++) for (let x = 0; x < al.w; x++) {
      const X = ox + x, Y = oy + y; if (X < 0 || Y < 0 || X >= C || Y >= C) continue;
      const i = (Y * C + X) * 3, g = (f[i] + f[i + 1] + f[i + 2]) / 3, a = al.a[y * al.w + x];
      if (a === 0) ring.push(g); else if (a > 0.6 * maxA) core.push([g, a]);
    }
    if (ring.length < 20 || core.length < 20) continue;
    const Bv = median(ring);
    if (median(core.map(([g]) => g - Bv)) < 3) continue;          // khung này dấu không rõ (nền quá sáng…)
    ks.push(median(core.map(([g, a]) => (g - Bv) / (a * (255 - Bv) * brightF(Bv) + 1e-6))));
  }
  if (ks.length === 0) return null;
  return Math.round(median(ks) * 100) / 100;
}

function writePgm(file, w, h, valueAt) {
  const head = Buffer.from('P5\n' + w + ' ' + h + '\n255\n', 'ascii'), body = Buffer.alloc(w * h);
  for (let i = 0; i < body.length; i++) body[i] = Math.max(0, Math.min(255, Math.round(valueAt(i))));
  fs.writeFileSync(file, Buffer.concat([head, body]));
}

/** Mặt nạ viền 1-2px quanh mép dấu (nơi nén video làm lệch) để làm mịn nhẹ đúng chỗ đó. */
function edgeMask(al) {
  let maxA = 0; for (const v of al.a) if (v > maxA) maxA = v;
  const lo = 0.01 * maxA, hi = 0.43 * maxA, m = new Float32Array(al.w * al.h);
  for (let i = 0; i < m.length; i++) m[i] = (al.a[i] > lo && al.a[i] < hi) ? 1 : 0;
  const b = boxBlur(boxBlur(m, al.w, al.h, 1), al.w, al.h, 1);
  for (let i = 0; i < b.length; i++) b[i] = Math.min(1, b[i] * 1.6);
  return b;
}

// Tính ngược có bù độ sáng nền: R0 = (A - a·255)/(1-a); a' = a·f(R0); R = (A - a'·255)/(1-a')
const EXPR = "st(0,B/255);st(1,clip((A-ld(0)*255)/(1-ld(0)),0,255));" +
  "st(2,if(lt(ld(1),110),1,if(lt(ld(1),150),1-0.05*(ld(1)-110)/40,if(lt(ld(1),195),0.95-0.04*(ld(1)-150)/45,if(lt(ld(1),240),0.91-0.11*(ld(1)-195)/45,0.80-0.05*(ld(1)-240)/15)))));" +
  "st(3,ld(0)*ld(2));clip((A-ld(3)*255)/(1-ld(3)),0,255)";

/**
 * Xóa dấu ✦ trên video. Trả {removed:true,...} khi đã xóa; {removed:false, reason} khi không có dấu
 * hoặc dấu thuộc loại không tính ngược được (dấu gần đục) — để bộ xóa cũ xử lý, không làm nhòe.
 * options: {crf, preset, scaleTo:{w,h}}
 */
async function removeVeoSparkle(ffmpeg, input, output, W, H, options = {}) {
  const det = await detect(ffmpeg, input, W, H);
  if (!det || det.score < 0.45) return { removed: false, reason: 'no-sparkle', score: det ? det.score : 0 };
  const k = chooseStrength(det, W, H);
  if (k == null || k < 0.5 || k > 2.0) return { removed: false, reason: 'unsupported-sparkle', score: det.score, k };
  const tag = Date.now() + '_' + Math.random().toString(36).slice(2, 7);
  const pgmA = path.join(os.tmpdir(), 'veo_alpha_' + tag + '.pgm'), pgmM = path.join(os.tmpdir(), 'veo_edge_' + tag + '.pgm');
  const al = det.alpha, em = edgeMask(al);
  writePgm(pgmA, al.w, al.h, i => Math.min(0.97, al.a[i] * k) * 255);
  writePgm(pgmM, al.w, al.h, i => em[i] * 255);
  const pw = al.w, ph = al.h, px = det.x, py = det.y;
  const tail = options.scaleTo ? 'scale=' + options.scaleTo.w + ':' + options.scaleTo.h + ':flags=lanczos,format=yuv420p' : 'format=yuv420p';
  const fc = '[0:v]format=gbrp,split[b][r];[r]crop=' + pw + ':' + ph + ':' + px + ':' + py + '[c];[1:v]format=gray,format=gbrp[a];' +
    "[c][a]blend=all_expr='" + EXPR + "':shortest=1,split[d1][d2];[d2]gblur=sigma=1.6[db];[2:v]format=gray,format=gbrp[m];" +
    '[d1][db][m]maskedmerge[e];[b][e]overlay=' + px + ':' + py + ':shortest=1,' + tail + '[v]';
  try {
    await run(ffmpeg, ['-y', '-hide_banner', '-loglevel', 'error', '-i', input, '-loop', '1', '-i', pgmA, '-loop', '1', '-i', pgmM,
      '-filter_complex', fc, '-map', '[v]', '-map', '0:a?', '-c:v', 'libx264', '-crf', String(options.crf || 16),
      '-preset', options.preset || 'veryfast', '-c:a', 'copy', '-movflags', '+faststart', '-shortest', output], false);
  } finally { for (const p of [pgmA, pgmM]) { try { fs.unlinkSync(p); } catch (_) {} } }
  if (!fs.existsSync(output) || fs.statSync(output).size === 0) throw new Error('Xóa dấu ✦ thất bại: không tạo được file ra.');
  return { removed: true, k, score: det.score, scale: det.scale, roi: { x: px, y: py, w: pw, h: ph } };
}

module.exports = { removeVeoSparkle, _detect: detect, _chooseStrength: chooseStrength };
