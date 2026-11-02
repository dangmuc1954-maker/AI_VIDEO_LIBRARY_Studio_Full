const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

console.log('======================================================================');
console.log('🍎 ĐÓNG GÓI 1-CLICK UNIVERSAL CHO MACBOOK (M1/M2/M3/M4 & INTEL) 🍎');
console.log('======================================================================');

const rootDir = path.resolve(__dirname, '..');
const distDir = path.join(rootDir, 'dist');
const cacheDir = path.join(__dirname, 'cache_electron_mac');

const arm64Zip = path.join(cacheDir, 'electron-v44.0.0-darwin-arm64.zip');
const x64Zip = path.join(cacheDir, 'electron-v44.0.0-darwin-x64.zip');

if (!fs.existsSync(arm64Zip) || !fs.existsSync(x64Zip)) {
  console.log('[*] Chưa tìm thấy cache Electron macOS, đang tải...');
  execSync(`node "${path.join(__dirname, 'download_electron_mac.js')}"`, { stdio: 'inherit', cwd: rootDir });
}

// 1. Tạo thư mục staging
const stagingDir = path.join(distDir, 'AI_VIDEO_LIBRARY_Mac_Universal_v3.0');
if (fs.existsSync(stagingDir)) {
  console.log('[*] Dọn dẹp thư mục staging cũ...');
  fs.rmSync(stagingDir, { recursive: true, force: true });
}
fs.mkdirSync(stagingDir, { recursive: true });

const coreDir = path.join(stagingDir, '.core');
const binariesDir = path.join(coreDir, 'binaries');
const payloadDir = path.join(coreDir, 'payload');
fs.mkdirSync(binariesDir, { recursive: true });
fs.mkdirSync(payloadDir, { recursive: true });

// 2. Sao chép binaries Electron Mac nguyên bản (để bảo toàn 100% symlinks của macOS)
console.log('[*] Đang sao chép nhân Electron macOS ARM64 & x64...');
fs.copyFileSync(arm64Zip, path.join(binariesDir, 'electron_arm64.zip'));
fs.copyFileSync(x64Zip, path.join(binariesDir, 'electron_x64.zip'));

// 3. Chuẩn bị file Icon Apple .icns
console.log('[*] Đang tạo bộ icon chất lượng cao Apple ICNS...');
const pngSrc = path.join(rootDir, 'dist/AI_VIDEO_LIBRARY_Customer_Edition/app-icon.png');
const icnsDest = path.join(payloadDir, 'electron.icns');

function createIcnsFromPng(srcPath, destPath) {
  const pngBuffer = fs.readFileSync(srcPath);
  const tag = Buffer.from('ic09', 'ascii');
  const chunkSize = 8 + pngBuffer.length;
  const chunkHeader = Buffer.alloc(8);
  tag.copy(chunkHeader, 0);
  chunkHeader.writeUInt32BE(chunkSize, 4);

  const totalSize = 8 + chunkSize;
  const fileHeader = Buffer.alloc(8);
  Buffer.from('icns', 'ascii').copy(fileHeader, 0);
  fileHeader.writeUInt32BE(totalSize, 4);

  const icnsBuffer = Buffer.concat([fileHeader, chunkHeader, pngBuffer]);
  fs.writeFileSync(destPath, icnsBuffer);
}
createIcnsFromPng(pngSrc, icnsDest);

// 4. Chuẩn bị file Info.plist chuẩn cho macOS
console.log('[*] Đang cấu hình Info.plist cho AI VIDEO LIBRARY...');
const plistContent = `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
	<key>CFBundleDisplayName</key>
	<string>AI VIDEO LIBRARY</string>
	<key>CFBundleExecutable</key>
	<string>AI VIDEO LIBRARY</string>
	<key>CFBundleIconFile</key>
	<string>electron.icns</string>
	<key>CFBundleIdentifier</key>
	<string>com.aivideolibrary.studio</string>
	<key>CFBundleInfoDictionaryVersion</key>
	<string>6.0</string>
	<key>CFBundleName</key>
	<string>AI VIDEO LIBRARY</string>
	<key>CFBundlePackageType</key>
	<string>APPL</string>
	<key>CFBundleShortVersionString</key>
	<string>3.0.0</string>
	<key>CFBundleVersion</key>
	<string>3.0.0</string>
	<key>LSApplicationCategoryType</key>
	<string>public.app-category.video</string>
	<key>LSMinimumSystemVersion</key>
	<string>12.0</string>
	<key>NSAppTransportSecurity</key>
	<dict>
		<key>NSAllowsArbitraryLoads</key>
		<true/>
	</dict>
	<key>NSAudioCaptureUsageDescription</key>
	<string>AI VIDEO LIBRARY cần quyền ghi âm để xử lý Audio và Dubbing</string>
	<key>NSCameraUsageDescription</key>
	<string>AI VIDEO LIBRARY cần quyền camera</string>
	<key>NSMicrophoneUsageDescription</key>
	<string>AI VIDEO LIBRARY cần quyền microphone</string>
	<key>NSHighResolutionCapable</key>
	<true/>
	<key>NSPrincipalClass</key>
	<string>AtomApplication</string>
	<key>NSRequiresAquaSystemAppearance</key>
	<false/>
	<key>NSSupportsAutomaticGraphicsSwitching</key>
	<true/>
</dict>
</plist>
`;
fs.writeFileSync(path.join(payloadDir, 'Info.plist'), plistContent, 'utf8');

// 5. Đóng gói mã nguồn app sạch sẽ (từ Customer Edition đã mã hóa & bảo vệ)
console.log('[*] Đang nén gói mã nguồn app_payload.zip...');
const appSrcDir = path.join(rootDir, 'dist/AI_VIDEO_LIBRARY_Customer_Edition/resources/app');
const appPayloadZip = path.join(payloadDir, 'app_payload.zip');
const psZipAppCmd = `powershell -Command "Add-Type -AssemblyName System.IO.Compression.FileSystem; [System.IO.Compression.ZipFile]::CreateFromDirectory('${appSrcDir.replace(/'/g, "''")}', '${appPayloadZip.replace(/'/g, "''")}', [System.IO.Compression.CompressionLevel]::Fastest, $false)"`;
execSync(psZipAppCmd, { stdio: 'inherit' });

// 6. Tạo script cài đặt 1-Click trên Mac: Cai_Dat_Mac_1_Click.command (Bắt buộc dùng LF \n)
console.log('[*] Đang tạo script cài đặt 1-Click thông minh cho Mac...');
const commandScript = `#!/bin/bash
DIR="$( cd "$( dirname "\${BASH_SOURCE[0]}" )" && pwd )"
cd "$DIR"

clear
echo "=================================================================="
echo "🍎 CÀI ĐẶT 1-CLICK AI VIDEO LIBRARY CHO MACBOOK (UNIVERSAL) 🍎"
echo "=================================================================="
echo ""

ARCH=\$(uname -m)
echo "[*] Hệ thống máy Mac của bạn: \$ARCH"

DEST_APP="/Applications/AI VIDEO LIBRARY.app"

if [ -d "$DEST_APP" ]; then
    echo "[*] Đang dọn dẹp phiên bản cũ trong /Applications..."
    rm -rf "$DEST_APP"
fi

TEMP_DIR="/tmp/aivl_mac_installer_\$\$"
rm -rf "$TEMP_DIR"
mkdir -p "$TEMP_DIR"

if [ "$ARCH" = "arm64" ]; then
    echo "[✓] Phát hiện chip Apple Silicon (M1/M2/M3/M4) -> Cài bản Native ARM64 siêu tốc..."
    unzip -q -o ".core/binaries/electron_arm64.zip" -d "$TEMP_DIR"
else
    echo "[✓] Phát hiện chip Intel Mac -> Cài bản Native Intel x64..."
    unzip -q -o ".core/binaries/electron_x64.zip" -d "$TEMP_DIR"
fi

echo "[*] Đang thiết lập ứng dụng vào thư mục Applications..."
mv "$TEMP_DIR/Electron.app" "$DEST_APP"
rm -rf "$TEMP_DIR"

# Đổi tên file thực thi chính
mv "$DEST_APP/Contents/MacOS/Electron" "$DEST_APP/Contents/MacOS/AI VIDEO LIBRARY"

# Cập nhật Info.plist và Icon
cp -f ".core/payload/Info.plist" "$DEST_APP/Contents/Info.plist"
cp -f ".core/payload/electron.icns" "$DEST_APP/Contents/Resources/electron.icns"

# Giải nén mã nguồn vào Contents/Resources/app
echo "[*] Đang cài đặt tài nguyên và cơ sở dữ liệu AI VIDEO LIBRARY..."
mkdir -p "$DEST_APP/Contents/Resources/app"
unzip -q -o ".core/payload/app_payload.zip" -d "$DEST_APP/Contents/Resources/app"

# Dọn dẹp default_app.asar cũ nếu có
rm -f "$DEST_APP/Contents/Resources/default_app.asar"

# Cấp quyền thực thi và mở khóa bảo vệ Apple Gatekeeper
echo "[*] Đang mở khóa bảo vệ Apple Gatekeeper & phân quyền chạy..."
chmod -R 755 "$DEST_APP"
chmod +x "$DEST_APP/Contents/MacOS/AI VIDEO LIBRARY"
xattr -cr "$DEST_APP" 2>/dev/null || true

echo ""
echo "=================================================================="
echo "🎉 CHÚC MỪNG BẠN! CÀI ĐẶT THÀNH CÔNG RỰC RỠ! 🎉"
echo "👉 Ứng dụng đã nằm sẵn trong Launchpad và /Applications"
echo "👉 Đang tự động mở AI VIDEO LIBRARY ngay bây giờ..."
echo "=================================================================="
open "$DEST_APP"
sleep 2
exit 0
`.replace(/\r\n/g, '\n'); // Đảm bảo LF 100%

fs.writeFileSync(path.join(stagingDir, 'Cai_Dat_Mac_1_Click.command'), commandScript, { encoding: 'utf8' });

// 7. Tạo file hướng dẫn sử dụng tiếng Việt
console.log('[*] Đang tạo file hướng dẫn chi tiết tiếng Việt...');
const guideContent = `================================================================================
🍎 HƯỚNG DẪN CÀI ĐẶT AI VIDEO LIBRARY CHO MACBOOK (M1/M2/M3/M4 & INTEL) 🍎
================================================================================

Chào bạn! Bản cài đặt này là bản UNIVERSAL ĐA NĂNG, tự động tương thích 100% với:
- Tất cả MacBook dùng chip Apple Silicon: M1, M2, M3, M4 (Pro / Max / Ultra)
- Tất cả MacBook dùng chip Intel đời cũ.

--------------------------------------------------------------------------------
🚀 CÁCH CÀI ĐẶT SIÊU TỐC (CHỈ 1 CLICK):
--------------------------------------------------------------------------------
1. Giải nén file nén zip này vào máy MacBook của bạn.
2. Nhấp đúp (Double-click) vào file:
   👉 Cai_Dat_Mac_1_Click.command
3. Trình cài đặt sẽ tự động:
   - Nhận diện máy bạn là chip M hay Intel để chọn bản tối ưu nhất.
   - Cài đặt ứng dụng vào /Applications/AI VIDEO LIBRARY.app
   - Mở khóa bảo vệ Apple Gatekeeper (không bị báo lỗi nhà phát triển).
   - Tự động mở ứng dụng lên cho bạn sử dụng ngay!

--------------------------------------------------------------------------------
⚠️ LƯU Ý KHI APPLE BÁO "Apple could not verify..." HOẶC KHÔNG CHO MỞ TRỰC TIẾP:
--------------------------------------------------------------------------------
Do file tải từ Internet và chưa đăng ký chứng chỉ thương mại với Apple,
hệ điều hành macOS (đặc biệt là macOS 15 Sequoia / Sonoma) sẽ hiện bảng cảnh báo:
"Apple could not verify 'Cai_Dat_Mac_1_Click.command'..." chỉ có 2 nút [Move to Trash] và [Done].

BẠN CHỈ CẦN CHỌN 1 TRONG 2 CÁCH MỞ CỰC DỄ DƯỚI ĐÂY (CHỈ CẦN LÀM 1 LẦN DUY NHẤT):

👉 CÁCH 1 (NHANH NHẤT - 5 GIÂY VỚI TERMINAL):
   1. Mở ứng dụng "Terminal" trên Mac (bấm phím Command + Space, gõ Terminal rồi Enter).
   2. Gõ chữ: bash (nhớ có khoảng trắng sau chữ bash).
   3. Nắm kéo file "Cai_Dat_Mac_1_Click.command" thả vào cửa sổ Terminal -> Nhấn phím Enter.
   -> Trình cài đặt sẽ tự động chạy và mở ứng dụng lên ngay lập tức!

👉 CÁCH 2 (DÙNG CÀI ĐẶT HỆ THỐNG CỦA MAC):
   1. Khi hiện bảng thông báo màu vàng của Apple, bạn bấm nút "Done" (hoặc "Xong").
   2. Bấm vào biểu tượng Quả Táo góc trên bên trái màn hình -> Chọn "Cài đặt hệ thống" (System Settings)
      -> Chọn mục "Quyền riêng tư & Bảo mật" (Privacy & Security).
   3. Cuộn xuống phần "Bảo mật" (Security), bạn sẽ thấy dòng báo:
      "Cai_Dat_Mac_1_Click.command was blocked..." (đã bị chặn)
   4. Bấm nút "Vẫn mở" (Open Anyway) -> Bấm "Open" (Mở) -> Nhập mật khẩu máy Mac của bạn.
   -> Ứng dụng sẽ được cài đặt và tự động mở lên!

- Từ các lần sau, ứng dụng đã nằm sẵn trong Launchpad và thư mục Applications, bạn mở trực tiếp bình thường!

Chúc bạn sáng tạo video AI tuyệt vời cùng AI VIDEO LIBRARY!
================================================================================
`;
fs.writeFileSync(path.join(stagingDir, 'Huong_Dan_Cai_Dat_Macbook.txt'), guideContent, 'utf8');

// 8. Nén toàn bộ thành file ZIP duy nhất: dist/AI_VIDEO_LIBRARY_Mac_Universal_v3.0.zip
const finalMacZip = path.join(distDir, 'AI_VIDEO_LIBRARY_Mac_Universal_v3.0.zip');
if (fs.existsSync(finalMacZip)) {
  try { fs.unlinkSync(finalMacZip); } catch(_) {}
}

console.log('[*] Đang đóng gói thành file ZIP Mac Universal duy nhất...');
const psZipFinal = `powershell -Command "Add-Type -AssemblyName System.IO.Compression.FileSystem; [System.IO.Compression.ZipFile]::CreateFromDirectory('${stagingDir.replace(/'/g, "''")}', '${finalMacZip.replace(/'/g, "''")}', [System.IO.Compression.CompressionLevel]::Fastest, $false)"`;
execSync(psZipFinal, { stdio: 'inherit' });

// 9. Tiêm cờ phân quyền Unix POSIX (chmod +x) cho file .command trong ZIP
console.log('[*] Đang tiêm cờ phân quyền chuẩn macOS Unix (chmod 755 / +x)...');
function patchZipUnixPermissions(zipFilePath) {
  const buf = fs.readFileSync(zipFilePath);
  const sig = Buffer.from([0x50, 0x4b, 0x01, 0x02]);
  let idx = 0;
  while ((idx = buf.indexOf(sig, idx)) !== -1) {
    const fnLen = buf.readUInt16LE(idx + 28);
    const extraLen = buf.readUInt16LE(idx + 30);
    const commentLen = buf.readUInt16LE(idx + 32);
    const fn = buf.toString('utf8', idx + 46, idx + 46 + fnLen);

    buf.writeUInt8(3, idx + 5); // Host OS = Unix (3)
    if (fn.endsWith('.command') || fn.endsWith('.sh') || fn.includes('/MacOS/')) {
      buf.writeUInt32LE(0x81ed0000, idx + 38); // 0o100755: rwxr-xr-x
    } else if (fn.endsWith('/')) {
      buf.writeUInt32LE(0x41ed0000, idx + 38); // 0o040755
    } else {
      buf.writeUInt32LE(0x81a40000, idx + 38); // 0o100644
    }
    idx += 46 + fnLen + extraLen + commentLen;
  }
  fs.writeFileSync(zipFilePath, buf);
}
patchZipUnixPermissions(finalMacZip);

const zipSizeMb = (fs.statSync(finalMacZip).size / 1024 / 1024).toFixed(1);
console.log('======================================================================');
console.log(`✅ ĐÃ XUẤT BẢN THÀNH CÔNG BẢN MAC UNIVERSAL 1-CLICK!`);
console.log(`📁 Đường dẫn: ${finalMacZip}`);
console.log(`📦 Dung lượng: ${zipSizeMb} MB`);
console.log('======================================================================');

