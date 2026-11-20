/**
 * VideoWatermarkCleaner - Clean-room independent module for removing AI video watermarks (Veo/Google Labs)
 * Uses high-speed localized delogo spatial interpolation and lossless audio passthrough.
 */
const { exec, spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

class VideoWatermarkCleaner {
  constructor(customFfmpegPath) {
    this.ffmpegPath = customFfmpegPath || this._resolveFfmpeg();
  }

  _resolveFfmpeg() {
    // 1. Try require ffmpeg-static
    try {
      const fStatic = require('ffmpeg-static');
      if (typeof fStatic === 'string' && fs.existsSync(fStatic)) return fStatic;
    } catch (_) {}

    // 2. Candidate paths for both dev and production Electron installs
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
    const __cands = process.platform === 'win32' ? candidates : [...candidates.map(x => x && x.replace(/ffmpeg.exe$/, 'ffmpeg')), '/opt/homebrew/bin/ffmpeg', '/usr/local/bin/ffmpeg'];
    for (const c of __cands) {
      if (c && fs.existsSync(c)) return c;
    }

    return 'ffmpeg';
  }

  /**
   * Probes video width & height via ffmpeg stderr
   */
  async probeDimensions(videoPath) {
    return new Promise((resolve) => {
      exec(`"${this.ffmpegPath}" -i "${videoPath}"`, (err, stdout, stderr) => {
        const out = (stderr || '') + (stdout || '');
        const match = out.match(/Stream.*Video:.*,\s*(\d{3,4})x(\d{3,4})/);
        if (match) {
          resolve({ width: parseInt(match[1], 10), height: parseInt(match[2], 10) });
        } else {
          // Default fallback to 720p 16:9
          resolve({ width: 1280, height: 720 });
        }
      });
    });
  }

  /**
   * Calculates watermark bounding box for Veo / Google Labs video
   */
  computeVeoWatermarkRoi(width, height) {
    const isPortrait = height > width;
    const shortEdge = Math.min(width, height);
    
    // Scale factor based on resolution
    const s = Math.round(shortEdge / 15);
    const boxW = Math.round(s * 1.3);
    const boxH = Math.round(s * 1.3);

    // Margins from bottom-right corner
    let marginX = isPortrait ? Math.round(shortEdge * 0.09) : Math.round(shortEdge * 0.08);
    let marginY = isPortrait ? Math.round(shortEdge * 0.09) : Math.round(shortEdge * 0.08);

    let x = width - marginX - boxW;
    let y = height - marginY - boxH;

    // Ensure within video boundaries
    x = Math.max(0, Math.min(x, width - boxW));
    y = Math.max(0, Math.min(y, height - boxH));

    return { x, y, w: boxW, h: boxH, s };
  }

  /**
   * Removes watermark from video using FFmpeg delogo filter
   * @param {string} inputPath 
   * @param {string} outputPath (optional, if omitted or same as input, replaces original)
   * @param {object} options { onProgress, crf, preset }
   */
  async cleanVideoWatermark(inputPath, outputPath, options = {}) {
    if (!fs.existsSync(inputPath)) {
      throw new Error(`Input video not found: ${inputPath}`);
    }

    const sameFile = !outputPath || path.resolve(inputPath) === path.resolve(outputPath);
    const targetOutput = sameFile 
      ? path.join(path.dirname(inputPath), `delogo_tmp_${Date.now()}_${path.basename(inputPath)}`)
      : outputPath;

    const dims = await this.probeDimensions(inputPath);
    const roi = this.computeVeoWatermarkRoi(dims.width, dims.height);

    const crf = options.crf || 18;
    const preset = options.preset || 'veryfast';

    // Construct filter string: delogo without 'band' for modern FFmpeg
    let filterStr = `[0:v]delogo=x=${roi.x}:y=${roi.y}:w=${roi.w}:h=${roi.h}[v]`;
    if (options.upscale1080p) {
      const isPortrait = dims.height > dims.width;
      const targetW = isPortrait ? 1080 : 1920;
      const targetH = isPortrait ? 1920 : 1080;
      filterStr = `[0:v]delogo=x=${roi.x}:y=${roi.y}:w=${roi.w}:h=${roi.h},scale=${targetW}:${targetH}:flags=lanczos[v]`;
    }

    const args = [
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
        if (code === 0 && fs.existsSync(targetOutput)) {
          if (sameFile) {
            try {
              fs.unlinkSync(inputPath);
              fs.renameSync(targetOutput, inputPath);
              resolve({ success: true, path: inputPath, roi, dims });
            } catch (renameErr) {
              reject(renameErr);
            }
          } else {
            resolve({ success: true, path: targetOutput, roi, dims });
          }
        } else {
          // Cleanup temp file if error
          if (fs.existsSync(targetOutput)) {
            try { fs.unlinkSync(targetOutput); } catch(e) {}
          }
          reject(new Error(`FFmpeg delogo failed with exit code ${code}: ${stderrLog.slice(-500)}`));
        }
      });

      proc.on('error', (err) => {
        reject(err);
      });
    });
  }
}

module.exports = { VideoWatermarkCleaner };
