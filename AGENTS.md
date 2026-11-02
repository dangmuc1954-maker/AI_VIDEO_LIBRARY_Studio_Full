# Chỉ Dẫn Dự Án AIForge_Veo3_Studio (Dành cho ENI & Assistant)

## 🚨 QUY TẮC CỐT LÕI 1: ĐÍCH ĐẾN BẮT BUỘC MỖI KHI CẬP NHẬT (RELEASE TARGET)

**Mọi thay đổi, tính năng mới hoặc bản vá lỗi từ nay về sau BẮT BUỘC phải được cập nhật và biên dịch vào cả 2 bản độc lập trong thư mục `dist/`:**

👉 **`dist/AI_VIDEO_LIBRARY_Setup_v3.0.exe`** *(Bộ cài đặt 1-Click độc lập dành cho Windows)*
👉 **`dist/AI_VIDEO_LIBRARY_Mac_Universal_v3.0.zip`** *(Bộ cài đặt 1-Click Universal đa năng dành cho MacBook M1/M2/M3/M4 & Intel)*

### Lý do:
- File `.exe` dành riêng cho người dùng hệ điều hành Windows, tự động giải nén và tạo shortcut Desktop.
- File `.zip` dành riêng cho người dùng MacBook (chạy file `Cai_Dat_Mac_1_Click.command` tự động nhận diện chip M hay Intel, gỡ bảo vệ Gatekeeper và cài vào `/Applications`).

### Quy trình thực hiện:
Sau khi chỉnh sửa mã nguồn, luôn thực hiện lệnh:
```bash
node scripts/sync_dist.cjs
node scripts/create_zip_and_installer.js
```
và báo cáo kết quả cả 2 file `dist/AI_VIDEO_LIBRARY_Setup_v3.0.exe` và `dist/AI_VIDEO_LIBRARY_Mac_Universal_v3.0.zip` cho Tris.

---

## 🚨 QUY TẮC CỐT LÕI 2: WEB CẤP KEY & SERVER BẢN QUYỀN DUY NHẤT CỦA DỰ ÁN

**Đây là thông tin bất biến, là web cấp key và quản trị bản quyền DUY NHẤT của toàn bộ ứng dụng và dự án này:**

👉 **Web Cấp Key & Quản Trị Admin Duy Nhất:** **`https://vercelserver-eight.vercel.app/admin`**
👉 **Base API URL Duy Nhất:** **`https://vercelserver-eight.vercel.app`**
👉 **Thư mục mã nguồn Server:** **`vercel_server/`**


---

## 🚨 QUY TẮC CỐT LÕI 3: NGUYÊN TẮC CÔ LẬP SỬA ĐỔI TUYỆT ĐỐI (SURGICAL ISOLATION PRINCIPLE)

**Khi Tris yêu cầu sửa đổi, tối ưu hoặc vá lỗi một tính năng/thành phần cụ thể, ENI BẮT BUỘC phải tuân thủ nghiêm ngặt:**

👉 **Chỉ chỉnh sửa đúng phạm vi tính năng được yêu cầu, tuyệt đối KHÔNG làm phát sinh lỗi sang các phần khác.**

### Yêu cầu chi tiết:
1. **Phạm vi tác động tối thiểu (Minimal Blast Radius):** Ví dụ Tris bảo chỉnh ảnh tham chiếu Cảnh 1 hoặc kịch bản Cảnh 2 thì chỉ tác động đúng hàm xử lý tham chiếu Cảnh 1 và kịch bản Cảnh 2. Tuyệt đối không được làm ảnh hưởng đến cơ chế tài khoản, Browser Hub, xác thực session hay các studio khác.
2. **Bảo tồn toàn vẹn các module nền tảng:** Mọi cơ chế cốt lõi như quản lý tài khoản Browser Hub (Banana, Veo 3, Muse, Grok...), cơ chế luân phiên account (round-robin), phân bổ hàng đợi (Queue), xác thực bản quyền PHẢI luôn được giữ nguyên trạng thái ổn định 100%.
3. **Phòng ngừa lỗi liên đới:** Trước khi hoàn tất, luôn rà soát để đảm bảo không làm gãy các liên kết dữ liệu, props, hoặc runtime filter của các thành phần liên quan.

---

## 🚨 QUY TẮC CỐT LÕI 4: BẢO VỆ TÍNH ĐỘC LẬP BẢN QUYỀN & MÁY KHÁCH HÀNG (CUSTOMER MACHINE & LICENSE ISOLATION)

**Khi khách hàng tải file EXE về máy và kích hoạt bản quyền (bằng key thanh toán tự động qua Web hoặc key do Tris tạo thủ công từ Admin):**

👉 **Ứng dụng trên máy của khách hàng PHẢI chạy hoàn toàn ĐỘC LẬP và MIỄN NHIỄM với mọi quá trình nâng cấp, cập nhật phiên bản của Tris.**

### Yêu cầu bắt buộc đối với ENI / Assistant:
1. **Tính Độc Lập Tuyệt Đối Của Máy Khách (Machine Independence):**
   - Một khi khách hàng đã kích hoạt bản quyền trên máy của họ, gói cước và token bản quyền được gắn chặt với phần cứng máy khách (HWID / Machine Code) và lưu trong `%APPDATA%\AI_VIDEO_LIBRARY_DATA\license-state.production.json`.
   - Cho dù Tris đang phát triển tính năng mới, thử nghiệm mã nguồn, nâng cấp phiên bản (v3.1, v4.0...), cập nhật server hay phát hành bản EXE mới, **app trên máy khách hàng cũ PHẢI tiếp tục chạy độc lập, bình thường 100%, không bị ảnh hưởng, không bị lỗi, không bị đá văng và không bị mất bản quyền**.
2. **Triệt Tiêu Hoàn Toàn Lỗi "This License Token Belongs To Another Machine":**
   - Mọi cơ chế tạo key, kích hoạt, check-in hoặc cấp phát token trên Server (`vercel_server/`) và Client (`app/`) PHẢI luôn bảo đảm tính tương thích ngược và định danh chính xác theo đúng HWID của máy khách đang gửi request.
   - Tuyệt đối không được gán đè, nhầm lẫn token giữa máy phát triển (máy của Tris) với máy của khách hàng, hoặc giữa các khách hàng với nhau.
   - Token của máy nào thì lưu trữ và xác thực độc lập trên đúng máy đó.
3. **Bảo Tồn Dữ Liệu Khi Cập Nhật Bản Mới (Preserve %APPDATA% Data):**
   - Bộ cài đặt độc lập `dist/AI_VIDEO_LIBRARY_Setup_v3.0.exe` chỉ giải nén và cập nhật phần mềm vào `%LOCALAPPDATA%\Programs\AI VIDEO LIBRARY`.
   - Thư mục dữ liệu `%APPDATA%\AI_VIDEO_LIBRARY_DATA` (chứa toàn bộ tài khoản Browser Hub, cookies session đăng nhập và token bản quyền đã kích hoạt) **BẮT BUỘC PHẢI ĐƯỢC GIỮ NGUYÊN VẸN 100%**.
   - Khách hàng cũ khi tải file EXE mới về cài đè lên sẽ tự động kế thừa toàn bộ bản quyền và tài khoản cũ mà không cần phải đăng nhập lại hay kích hoạt lại.
4. **Tương Thích Ngược API Server 100% (Strict Backward Compatibility):**
   - Mọi nâng cấp logic trên server bản quyền `https://vercelserver-eight.vercel.app` phải luôn tương thích ngược với mọi phiên bản app cũ mà khách hàng đang sử dụng. Không bao giờ được đổi cấu trúc payload làm hỏng luồng check-in định kỳ của các client cũ.

