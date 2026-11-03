const fs = require('fs');
const path = require('path');

const targetRoots = [
  path.join(__dirname, '../app'),
  path.join(__dirname, '../extracted_original'),
  path.join(__dirname, '../dist/AI_VIDEO_LIBRARY_Customer_Edition/resources/app'),
  path.join(__dirname, '../dist/AI_VIDEO_LIBRARY_Khach_Hang_v3.0/resources/app'),
  path.join(process.env.LOCALAPPDATA || 'C:/Users/admin/AppData/Local', 'Programs/AI VIDEO LIBRARY/resources/app')
];

function doPatch(filePath) {
  if (!fs.existsSync(filePath)) return;
  let code = fs.readFileSync(filePath, 'utf8');
  
  const oldChunk = `      // BƯỚC 3: NHẬP PROMPT VÀ GỬI (TỰ ĐỘNG THÊM TIỀN TỐ TẠO ẢNH THEO TỈ LỆ 9:16 HOẶC 16:9 CHO CHATBOT MUSE AI)
      const rawPrompt = typeof job.payload?.prompt === "string" ? job.payload.prompt : (job.title || "");
      let promptToSend = rawPrompt.trim();

      if (isImageJob) {
        const rawRatio = (job.payload?.ratio || job.payload?.aspectRatio || job.payload?.aspect || "9:16").toString().trim();
        const normRatio = (rawRatio === "16:9" || rawRatio === "16/9") ? "16:9" : (rawRatio === "1:1" ? "1:1" : (rawRatio === "4:3" ? "4:3" : (rawRatio === "3:4" ? "3:4" : "9:16")));
        const lower = promptToSend.toLowerCase();

        if (!lower.startsWith("tạo ảnh") && !lower.startsWith("tao anh") && !lower.startsWith("tạo hình ảnh") && !lower.startsWith("create image") && !lower.startsWith("generate image")) {
          promptToSend = \`Tạo ảnh \${normRatio}: \${promptToSend}\`;
        } else if (!lower.includes("9:16") && !lower.includes("16:9") && !lower.includes("1:1") && !lower.includes("4:3") && !lower.includes("3:4")) {
          promptToSend = promptToSend.replace(/^(tạo ảnh|tao anh|tạo hình ảnh|create image|generate image)\\s*[:\\-\\s]*/i, \`Tạo ảnh \${normRatio}: \`);
        }
      }
      const prompt = promptToSend;
      tracker.updateProgress(30, isImageJob ? \`Đang gửi lệnh tạo ảnh \${job.payload?.ratio || "9:16"} lên Muse AI...\` : "Đang gửi prompt và ảnh cảnh lên Muse AI...");
      logDebug("Dispatching prompt to Muse AI", { isImageJob, prompt });`;

  const newChunk = `      // BƯỚC 3: NHẬP PROMPT VÀ GỬI (TỰ ĐỘNG THÊM TIỀN TỐ TẠO ẢNH HOẶC TẠO VIDEO THEO ĐÚNG TỈ LỆ 16:9 / 9:16 CHO CHATBOT MUSE AI)
      const rawPrompt = typeof job.payload?.prompt === "string" ? job.payload.prompt : (job.title || "");
      let promptToSend = rawPrompt.trim();

      if (isImageJob) {
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
      tracker.updateProgress(30, isImageJob ? \`Đang gửi lệnh tạo ảnh \${job.payload?.ratio || "9:16"} lên Muse AI...\` : \`Đang gửi lệnh tạo video \${job.payload?.ratio || "16:9"} lên Muse AI...\`);
      logDebug("Dispatching prompt to Muse AI", { isImageJob, prompt });`;

  if (code.includes(oldChunk)) {
    code = code.replace(oldChunk, newChunk);
    fs.writeFileSync(filePath, code, 'utf8');
    console.log('✓ Successfully patched oldChunk in:', filePath);
  } else if (code.includes('Tạo video ${normRatio}:')) {
    console.log('- Already has newChunk:', filePath);
  } else {
    console.log('⚠️ oldChunk not found in:', filePath);
  }
}

for (const r of targetRoots) {
  doPatch(path.join(r, 'out/main/index.js'));
  doPatch(path.join(r, 'out/main/index.js.bak_before_story_chain'));
}
