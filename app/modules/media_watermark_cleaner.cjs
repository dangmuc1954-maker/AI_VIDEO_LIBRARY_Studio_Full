/**
 * MediaWatermarkCleaner - Làm sạch Watermark & Logo AI độc quyền cho AI VIDEO LIBRARY
 * Hỗ trợ cả ẢNH (.png, .jpg, .webp) và VIDEO (.mp4, .mov, .webm)
 * Tích hợp bộ lọc Delogo và Upscale Lanczos 2K (Ảnh) & 1080p (Video)
 */
const { execFile, spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const os = require('os');

class MediaWatermarkCleaner {
  constructor(customFfmpegPath) {
    this.ffmpegPath = customFfmpegPath || this._resolveFfmpeg();
  }

  _resolveFfmpeg() {
    try {
      const fStatic = require('ffmpeg-static');
      if (typeof fStatic === 'string' && fs.existsSync(fStatic)) return fStatic;
    } catch (_) {}

    const candidates = [
      path.join(__dirname, '../node_modules/ffmpeg-static/ffmpeg.exe'),
      path.join(__dirname, '../../node_modules/ffmpeg-static/ffmpeg.exe'),
      path.join(__dirname, '../../../node_modules/ffmpeg-static/ffmpeg.exe'),
      path.join(__dirname, '../../app/node_modules/ffmpeg-static/ffmpeg.exe'),
      process.resourcesPath ? path.join(process.resourcesPath, 'app/node_modules/ffmpeg-static/ffmpeg.exe') : '',
      process.resourcesPath ? path.join(process.resourcesPath, 'app.asar.unpacked/node_modules/ffmpeg-static/ffmpeg.exe') : '',
      'C:/Users/admin/AppData/Local/Programs/AI VIDEO LIBRARY/resources/app/node_modules/ffmpeg-static/ffmpeg.exe'
    ];

    // Mac/Linux: không bao giờ chạy ffmpeg.exe của Windows (lỗi ENOEXEC)
    const __cands = process.platform === 'win32' ? candidates : [...candidates.map(x => x && x.replace(/ffmpeg\.exe$/, 'ffmpeg')), '/opt/homebrew/bin/ffmpeg', '/usr/local/bin/ffmpeg'];
    for (const c of __cands) {
      if (c && fs.existsSync(c)) return c;
    }

    return 'ffmpeg';
  }

  /**
   * Đọc nhanh kích thước ảnh trực tiếp từ header file (0.05ms, không spawn subprocess, chính xác 100%)
   */
  parseImageDimensionsFast(filePath) {
    try {
      const fd = fs.openSync(filePath, 'r');
      const buf = Buffer.alloc(65536);
      const bytesRead = fs.readSync(fd, buf, 0, 65536, 0);
      fs.closeSync(fd);
      return this.parseImageDimensionsFromBuffer(buf.subarray(0, bytesRead));
    } catch (_) {
      return null;
    }
  }

  parseImageDimensionsFromBuffer(buf) {
    if (!buf || buf.length < 24) return null;
    try {
      // PNG
      if (buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4e && buf[3] === 0x47) {
        return { width: buf.readUInt32BE(16), height: buf.readUInt32BE(20) };
      }
      // JPEG
      if (buf[0] === 0xff && buf[1] === 0xd8) {
        let offset = 2;
        while (offset < buf.length - 8) {
          if (buf[offset] !== 0xff) { offset++; continue; }
          const marker = buf[offset + 1];
          // SOF0..SOF15 markers (trừ DHT 0xc4, JPG 0xc8, DAC 0xcc)
          if (marker >= 0xc0 && marker <= 0xcf && marker !== 0xc4 && marker !== 0xc8 && marker !== 0xcc) {
            return {
              height: buf.readUInt16BE(offset + 5),
              width: buf.readUInt16BE(offset + 7)
            };
          }
          const len = buf.readUInt16BE(offset + 2);
          offset += 2 + len;
        }
      }
      // WebP (RIFF....WEBP)
      if (buf[0] === 0x52 && buf[1] === 0x49 && buf[2] === 0x46 && buf[3] === 0x46 &&
          buf[8] === 0x57 && buf[9] === 0x45 && buf[10] === 0x42 && buf[11] === 0x50) {
        // VP8
        if (buf[12] === 0x56 && buf[13] === 0x50 && buf[14] === 0x38 && buf[15] === 0x20) {
          const width = (buf.readUInt16LE(26) & 0x3fff);
          const height = (buf.readUInt16LE(28) & 0x3fff);
          return { width, height };
        }
        // VP8L (lossless)
        if (buf[12] === 0x56 && buf[13] === 0x50 && buf[14] === 0x38 && buf[15] === 0x4c) {
          const b1 = buf[21], b2 = buf[22], b3 = buf[23], b4 = buf[24];
          const width = 1 + (((b2 & 0x3f) << 8) | b1);
          const height = 1 + (((b4 & 0xf) << 10) | (b3 << 2) | ((b2 & 0xc0) >> 6));
          return { width, height };
        }
        // VP8X (extended)
        if (buf[12] === 0x56 && buf[13] === 0x50 && buf[14] === 0x38 && buf[15] === 0x58) {
          const width = 1 + (buf[24] | (buf[25] << 8) | (buf[26] << 16));
          const height = 1 + (buf[27] | (buf[28] << 8) | (buf[29] << 16));
          return { width, height };
        }
      }
    } catch (_) {}
    return null;
  }

  async probeDimensions(mediaPath) {
    const ext = path.extname(mediaPath).toLowerCase();
    const isImage = ['.png', '.jpg', '.jpeg', '.webp'].includes(ext);

    // Ưu tiên đọc trực tiếp từ header file nếu là ảnh
    if (isImage) {
      const fastDims = this.parseImageDimensionsFast(mediaPath);
      if (fastDims && fastDims.width > 0 && fastDims.height > 0) {
        return fastDims;
      }
    }

    return new Promise((resolve) => {
      // Dùng execFile tránh lỗi cmd.exe quoting trên Windows
      execFile(this.ffmpegPath, ['-hide_banner', '-i', mediaPath], { timeout: 10000 }, (err, stdout, stderr) => {
        const out = (stderr || '') + (stdout || '');
        const match = out.match(/Stream.*(?:Video|Image):.*,\s*(\d{3,4})x(\d{3,4})/i) ||
                      out.match(/,\s*(\d{3,4})x(\d{3,4})/);
        if (match) {
          resolve({ width: parseInt(match[1], 10), height: parseInt(match[2], 10) });
        } else {
          // Fallback tỷ lệ dọc 9:16 chuẩn của Google Flow nếu không probe được
          resolve({ width: 768, height: 1376 });
        }
      });
    });
  }

  computeWatermarkRoi(width, height) {
    const isPortrait = height > width;
    const shortEdge = Math.min(width, height);
    
    // 🎯 TỌA ĐỘ VÀ VÙNG ROI ĐA ĐIỂM (MULTI-MARGIN COVERAGE 55px - 165px)
    // 🎯 9:16 Video Chuẩn Veo 3 / Google Flow 720p (720x1280)
    if (Math.abs(width - 720) <= 8 && Math.abs(height - 1280) <= 8) {
      return { x: 558, y: 1118, w: 112, h: 112, s: 48 };
    }
    // 🎯 9:16 Video Chuẩn Veo 3 / Google Flow 1080p (1080x1920)
    if (Math.abs(width - 1080) <= 12 && Math.abs(height - 1920) <= 12) {
      return { x: 840, y: 1680, w: 160, h: 160, s: 72 };
    }
    // 🎯 16:9 Video Chuẩn 720p (1280x720)
    if (Math.abs(width - 1280) <= 8 && Math.abs(height - 720) <= 8) {
      return { x: 1118, y: 558, w: 112, h: 112, s: 48 };
    }
    // 🎯 16:9 Video Chuẩn 1080p (1920x1080)
    if (Math.abs(width - 1920) <= 12 && Math.abs(height - 1080) <= 12) {
      return { x: 1680, y: 840, w: 160, h: 160, s: 72 };
    }
    // 🎯 9:16 Ảnh Banana / Google Flow (768x1344)
    if (Math.abs(width - 768) <= 8 && Math.abs(height - 1344) <= 8) {
      return { x: 610, y: 1186, w: 104, h: 104, s: 48 };
    }
    // Tự động bao phủ cả Gia dụng (margin 73px) và Thời trang/Nhân vật (margin 76px, 78px, 80px, 89px, 95px, 105px)
    if (Math.abs(width - 768) <= 8 && Math.abs(height - 1376) <= 8) {
      // 9:16 Tiêu chuẩn (768x1376) - Bao phủ X: 610..714 (margin 54..158px), Y: 1218..1322 (margin 54..158px)
      return { x: 610, y: 1218, w: 104, h: 104, s: 48 };
    }
    if (Math.abs(width - 1536) <= 16 && Math.abs(height - 2752) <= 16) {
      // 9:16 2K Upscaled (1536x2752) - Vùng Delogo gọn gàng quanh logo 96px, không làm mờ rộng bối cảnh
      return { x: 1220, y: 2436, w: 208, h: 208, s: 96 };
    }
    if (Math.abs(width - 1376) <= 8 && Math.abs(height - 768) <= 8) {
      // 16:9 Tiêu chuẩn (1376x768)
      return { x: 1218, y: 610, w: 104, h: 104, s: 48 };
    }
    if (Math.abs(width - 2752) <= 16 && Math.abs(height - 1536) <= 16) {
      // 16:9 2K Upscaled (2752x1536) - Vùng Delogo gọn gàng quanh logo 96px
      return { x: 2436, y: 1220, w: 208, h: 208, s: 96 };
    }
    if (Math.abs(width - 1024) <= 8 && Math.abs(height - 1024) <= 8) {
      // 1:1 Vuông (1024x1024)
      return { x: 860, y: 860, w: 104, h: 104, s: 48 };
    }
    if (Math.abs(width - 896) <= 8 && Math.abs(height - 1200) <= 8) {
      // 3:4 Dọc (896x1200)
      return { x: 738, y: 1042, w: 104, h: 104, s: 48 };
    }
    if (Math.abs(width - 1200) <= 8 && Math.abs(height - 896) <= 8) {
      // 4:3 Ngang (1200x896)
      return { x: 1042, y: 738, w: 104, h: 104, s: 48 };
    }

    const s = Math.round(shortEdge / 15);
    const boxW = Math.round(s * 2.3);
    const boxH = Math.round(s * 2.3);

    let marginX = isPortrait ? Math.round(shortEdge * 0.06) : Math.round(shortEdge * 0.055);
    let marginY = isPortrait ? Math.round(shortEdge * 0.06) : Math.round(shortEdge * 0.055);

    let x = width - marginX - boxW;
    let y = height - marginY - boxH;

    x = Math.max(0, Math.min(x, width - boxW));
    y = Math.max(0, Math.min(y, height - boxH));

    return { x, y, w: boxW, h: boxH, s };
  }

  async cleanMediaWatermark(inputPath, outputPath, options = {}) {
    if (!fs.existsSync(inputPath)) {
      throw new Error(`Media file not found: ${inputPath}`);
    }

    const ext = path.extname(inputPath).toLowerCase();
    const isImage = ['.png', '.jpg', '.jpeg', '.webp'].includes(ext);
    const sameFile = !outputPath || path.resolve(inputPath) === path.resolve(outputPath);
    const targetOutput = sameFile 
      ? path.join(path.dirname(inputPath), `delogo_tmp_${Date.now()}_${Math.random().toString(36).slice(2,7)}_${path.basename(inputPath)}`)
      : outputPath;

    const dims = await this.probeDimensions(inputPath);
    const roi = this.computeWatermarkRoi(dims.width, dims.height);

    // Delogo chỉ áp dụng cho Video, tuyệt đối KHÔNG làm nhám/mờ ảnh tĩnh
    const shouldDelogo = !isImage && options.removeWatermark !== false;
    const shouldUpscale = isImage 
      ? (options.upscale2k === true || options.imageResolution === '2k')
      : (options.upscale1080p === true || options.videoResolution === '1080p');

    if (!shouldDelogo && !shouldUpscale) {
      return { success: true, path: inputPath, dims };
    }

    const isPortrait = dims.height > dims.width;
    let targetW = dims.width;
    let targetH = dims.height;

    if (shouldUpscale) {
      if (isImage) {
        targetW = isPortrait ? 1440 : 2560;
        targetH = isPortrait ? 2560 : 1440;
      } else {
        targetW = isPortrait ? 1080 : 1920;
        targetH = isPortrait ? 1920 : 1080;
      }
    }

    let filterSteps = [];
    if (shouldDelogo) {
      filterSteps.push(`delogo=x=${roi.x}:y=${roi.y}:w=${roi.w}:h=${roi.h}`);
    }
    if (shouldUpscale) {
      filterSteps.push(`scale=${targetW}:${targetH}:flags=lanczos`);
    }

    const filterStr = `[0:v]${filterSteps.join(',')}[v]`;

    let args = [];
    if (isImage) {
      args = [
        '-y',
        '-i', inputPath,
        '-filter_complex', filterStr,
        '-map', '[v]',
        '-frames:v', '1',
        '-update', '1',
        '-q:v', '2',
        targetOutput
      ];
    } else {
      const crf = options.crf || 18;
      const preset = options.preset || 'veryfast';
      args = [
        '-y',
        '-i', inputPath,
        '-filter_complex', filterStr,
        '-map', '[v]',
        '-map', '0:a?',
        '-c:v', 'libx264',
        '-crf', String(crf),
        '-preset', preset,
        '-c:a', 'copy',
        targetOutput
      ];
    }

    return new Promise((resolve, reject) => {
      const proc = spawn(this.ffmpegPath, args);
      let stderrLog = '';

      proc.stderr.on('data', (d) => {
        stderrLog += d.toString();
        if (options.onProgress) {
          options.onProgress(d.toString());
        }
      });

      proc.on('close', (code) => {
        if (code === 0 && fs.existsSync(targetOutput) && fs.statSync(targetOutput).size > 0) {
          if (sameFile) {
            try {
              fs.unlinkSync(inputPath);
              fs.renameSync(targetOutput, inputPath);
              resolve({ success: true, path: inputPath, roi, dims, isImage });
            } catch (renameErr) {
              try { fs.copyFileSync(targetOutput, inputPath); fs.unlinkSync(targetOutput); resolve({ success: true, path: inputPath, roi, dims, isImage }); }
              catch(copyErr) { reject(renameErr || copyErr); }
            }
          } else {
            resolve({ success: true, path: targetOutput, roi, dims, isImage });
          }
        } else {
          if (fs.existsSync(targetOutput)) {
            try { fs.unlinkSync(targetOutput); } catch(e) {}
          }
          reject(new Error(`FFmpeg delogo/upscale failed with exit code ${code}: ${stderrLog.slice(-500)}`));
        }
      });

      proc.on('error', (err) => {
        reject(err);
      });
    });
  }

  /**
   * Xử lý xóa watermark trực tiếp trên Buffer in-memory an toàn 100%
   */
  async cleanMediaWatermarkBuffer(inputBuffer, mimeType = 'image/jpeg', options = {}) {
    if (!inputBuffer || inputBuffer.length === 0) return inputBuffer;
    const isVid = typeof mimeType === 'string' && (mimeType.includes('mp4') || mimeType.includes('webm') || mimeType.includes('mov') || mimeType.includes('quicktime') || mimeType.includes('video'));
    const ext = isVid 
      ? (mimeType.includes('webm') ? '.webm' : (mimeType.includes('quicktime') || mimeType.includes('mov')) ? '.mov' : '.mp4')
      : (mimeType.includes('png') ? '.png' : mimeType.includes('webp') ? '.webp' : '.jpg');
    const tmpIn = path.join(os.tmpdir(), `wm_buf_in_${Date.now()}_${Math.random().toString(36).slice(2,7)}${ext}`);
    const tmpOut = path.join(os.tmpdir(), `wm_buf_out_${Date.now()}_${Math.random().toString(36).slice(2,7)}${ext}`);

    try {
      fs.writeFileSync(tmpIn, inputBuffer);
      await this.cleanMediaWatermark(tmpIn, tmpOut, { removeWatermark: true, ...options });
      if (fs.existsSync(tmpOut) && fs.statSync(tmpOut).size > 0) {
        const cleaned = fs.readFileSync(tmpOut);
        try { fs.unlinkSync(tmpOut); } catch(_) {}
        try { fs.unlinkSync(tmpIn); } catch(_) {}
        return cleaned;
      }
      try { fs.unlinkSync(tmpIn); } catch(_) {}
      return inputBuffer;
    } catch(err) {
      try { if (fs.existsSync(tmpIn)) fs.unlinkSync(tmpIn); } catch(_) {}
      try { if (fs.existsSync(tmpOut)) fs.unlinkSync(tmpOut); } catch(_) {}
      throw err;
    }
  }
}

MediaWatermarkCleaner.MediaWatermarkCleaner = MediaWatermarkCleaner;
MediaWatermarkCleaner.VideoWatermarkCleaner = MediaWatermarkCleaner;
module.exports = MediaWatermarkCleaner;
