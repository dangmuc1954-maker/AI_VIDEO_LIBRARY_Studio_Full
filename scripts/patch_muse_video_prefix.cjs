const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

console.log('======================================================================');
console.log('🎬 CẬP NHẬT TIỀN TỐ TẠO VIDEO MUSE AI (TỈ LỆ 16:9 / 9:16) 🎬');
console.log('======================================================================');

const targetRoots = [
  path.join(__dirname, '../app'),
  path.join(__dirname, '../extracted_original'),
  path.join(__dirname, '../dist/AI_VIDEO_LIBRARY_Customer_Edition/resources/app'),
  path.join(__dirname, '../dist/AI_VIDEO_LIBRARY_Khach_Hang_v3.0/resources/app'),
  path.join(process.env.LOCALAPPDATA || 'C:/Users/admin/AppData/Local', 'Programs/AI VIDEO LIBRARY/resources/app')
];

const oldBlockMarker = '      if (isImageJob) {';
const promptConstMarker = '      const prompt = promptToSend;';

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

function patchMainFile(filePath) {
  if (!fs.existsSync(filePath)) return false;
  let code = fs.readFileSync(filePath, 'utf8');

  // Kiểm tra nếu đã có code mới
  if (code.includes('Tạo video ${normRatio}:')) {
    console.log('  - File đã có sẵn logic tạo video theo tỉ lệ:', filePath);
    return true;
  }

  const startIdx = code.indexOf('// BƯỚC 3: NHẬP PROMPT VÀ GỬI');
  if (startIdx === -1) {
    console.warn('  ⚠️ Không tìm thấy BƯỚC 3 trong:', filePath);
    return false;
  }

  const sendResIdx = code.indexOf('const sendRes = await wc.executeJavaScript', startIdx);
  if (sendResIdx === -1) {
    console.warn('  ⚠️ Không tìm thấy sendRes trong:', filePath);
    return false;
  }

  const targetSlice = code.substring(startIdx, sendResIdx);
  const rawPromptMarker = 'let promptToSend = rawPrompt.trim();';
  const rawPromptIdx = targetSlice.indexOf(rawPromptMarker);

  if (rawPromptIdx === -1) {
    console.warn('  ⚠️ Không tìm thấy rawPromptMarker trong targetSlice');
    return false;
  }

  const newTargetSlice = targetSlice.substring(0, rawPromptIdx + rawPromptMarker.length) + '\n\n' + newPromptLogic + '\n      logDebug("Dispatching prompt to Muse AI", { isImageJob, prompt });\n\n      ';

  code = code.substring(0, startIdx) + newTargetSlice + code.substring(sendResIdx);
  fs.writeFileSync(filePath, code, 'utf8');

  // Verify syntax
  try {
    execSync(`node -c "${filePath}"`, { stdio: 'pipe' });
    console.log('  ✓ Đã cập nhật và kiểm tra cú pháp thành công:', filePath);
    return true;
  } catch (err) {
    console.error('  ❌ Lỗi cú pháp khi cập nhật:', filePath, err.message);
    return false;
  }
}

for (const root of targetRoots) {
  const mPath = path.join(root, 'out/main/index.js');
  const mBakPath = path.join(root, 'out/main/index.js.bak_before_story_chain');

  patchMainFile(mPath);
  if (fs.existsSync(mBakPath)) {
    patchMainFile(mBakPath);
  }
}

console.log('======================================================================');
console.log('🎉 HOÀN TẤT CẬP NHẬT TIỀN TỐ VIDEO CHO MUSE AI! 🎉');
console.log('======================================================================');
