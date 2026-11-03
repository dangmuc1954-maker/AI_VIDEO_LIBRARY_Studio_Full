# HƯỚNG DẪN DÀNH CHO ANTIGRAVITY & TRIS KHI CHẠY TRÊN MÁY MỚI

Tài liệu này được tạo tự động bởi ENI để Antigravity trên máy mới (hoặc Tris) có thể khởi chạy và tạo lại toàn bộ file bộ cài đặt `dist/` đầy đủ 100% chức năng một cách nhanh nhất.

---

## 1. Cấu Trúc Dự Án Cốt Lõi
* **`app/`**: Thư mục chứa toàn bộ mã nguồn của ứng dụng:
  * `app/out/main/index.js`: Nhân xử lý chính của Electron (Backend IPC, Browser Hub, xác thực session, License check-in).
  * `app/out/renderer/`: Giao diện React đã biên dịch tối ưu (VideoStudio, TTSStudio, FittingRoom, ImageStudio, WorkflowEditor...).
  * `app/modules/`: Các module AI xử lý làm sạch watermark, upscale video...
  * `app/models/`: Mô hình AI Whisper Base ONNX phục vụ chuyển đổi giọng nói thành phụ đề offline.
* **`scripts/`**: Bộ công cụ đồng bộ, mã hóa bảo mật, tạo bộ cài đặt 1-Click cho Windows và Mac.
* **`vercel_server/`**: Mã nguồn Server cấp key và quản trị bản quyền (`https://vercelserver-eight.vercel.app`).

---

## 2. Các Bước Cài Đặt Ban Đầu Trên Máy Mới (Chỉ Cần Làm 1 Lần)

Mở Terminal (PowerShell / CMD) tại thư mục gốc dự án:

```bash
# 1. Cài đặt các thư viện Node.js cho ứng dụng
cd app
npm install
cd ..
```

---

## 3. Khởi Chạy Ứng Dụng Để Sử Dụng / Kiểm Tra

Chỉ cần nhấp đúp file:
👉 **`run.bat`** (Tự động khởi chạy app qua Electron)

Hoặc dùng lệnh terminal:
```bash
cd app
npm start
```

---

## 4. Tái Tạo Toàn Bộ Thư Mục `dist/` & Bộ Cài Đặt 1-Click (`.exe` & `.zip`)

Khi Tris bảo: *"Antigravity làm lại file dist cho anh"*:
Antigravity trên máy mới chỉ cần chạy lệnh sau:

```bash
# Bước 1: Tải nhân Electron Runtime portable và khởi tạo khung dist (nếu chưa có)
node scripts/setup_electron_bin.cjs

# Bước 2: Nén và biên dịch bộ cài đặt Windows Setup EXE & Mac Universal
node scripts/create_zip_and_installer.js
```

👉 Hoặc chỉ cần nhấp đúp file: **`Tao_Bo_Cai_Dat_1_Click.bat`**!

Kết quả sẽ tự động xuất ra ngay trong thư mục `dist/`:
* 🎯 `dist/AI_VIDEO_LIBRARY_Setup_v3.0.exe` (Bộ cài đặt 1-Click độc lập dành cho Windows)
* 🎯 `dist/AI_VIDEO_LIBRARY_Mac_Universal_v3.0.zip` (Bộ cài đặt 1-Click Universal dành cho MacOS Apple Silicon & Intel)

---

## 5. Quy Tắc Bất Biến (Theo AGENTS.md)
1. **Server Bản Quyền Duy Nhất:** `https://vercelserver-eight.vercel.app` (Admin: `https://vercelserver-eight.vercel.app/admin`).
2. **Bảo Mật Máy Khách:** Dữ liệu tài khoản `%APPDATA%\AI_VIDEO_LIBRARY_DATA` hoàn toàn độc lập theo từng máy phần cứng (HWID).
3. **Mọi Bản Cập Nhật Mới** phải luôn đồng bộ và xuất ra cả 2 bản `dist/` qua `scripts/create_zip_and_installer.js`.
