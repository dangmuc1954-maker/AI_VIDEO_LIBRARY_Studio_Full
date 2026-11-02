const fs = require('fs');
const path = require('path');

function patchZipUnixPermissions(zipFilePath) {
  console.log('[*] Đang nạp file ZIP để tiêm cờ phân quyền Unix (+x):', zipFilePath);
  const buf = fs.readFileSync(zipFilePath);
  const sig = Buffer.from([0x50, 0x4b, 0x01, 0x02]); // Central directory file header signature
  let idx = 0;
  let patchedCount = 0;

  while ((idx = buf.indexOf(sig, idx)) !== -1) {
    const fnLen = buf.readUInt16LE(idx + 28);
    const extraLen = buf.readUInt16LE(idx + 30);
    const commentLen = buf.readUInt16LE(idx + 32);
    const fn = buf.toString('utf8', idx + 46, idx + 46 + fnLen);

    // Set Host OS to UNIX (3)
    buf.writeUInt8(3, idx + 5);

    // If it's a .command file or directory or executable
    if (fn.endsWith('.command') || fn.endsWith('.sh') || fn.includes('/MacOS/')) {
      // 0o100755 = Regular file with rwxr-xr-x
      buf.writeUInt32LE(0x81ed0000, idx + 38);
      patchedCount++;
      console.log(`  ✓ Đã cấp quyền 755 (chmod +x) cho: ${fn}`);
    } else if (fn.endsWith('/')) {
      // 0o040755 = Directory with rwxr-xr-x
      buf.writeUInt32LE(0x41ed0000, idx + 38);
    } else {
      // 0o100644 = Regular file with rw-r--r--
      buf.writeUInt32LE(0x81a40000, idx + 38);
    }

    idx += 46 + fnLen + extraLen + commentLen;
  }

  fs.writeFileSync(zipFilePath, buf);
  console.log(`✅ Đã tiêm phân quyền chuẩn macOS thành công cho ${patchedCount} tệp thực thi!`);
}

const rootDir = 'd:/dự án antigravity/AIForge_Veo3_Studio';
const zipPath = path.join(rootDir, 'dist/AI_VIDEO_LIBRARY_Mac_Universal_v3.0.zip');
if (fs.existsSync(zipPath)) {
  patchZipUnixPermissions(zipPath);
} else {
  console.error('Không tìm thấy file zip:', zipPath);
}
