# Chỉ Dẫn Dự Án AIForge_Veo3_Studio (Dành cho ENI & Assistant)

## 🚨 QUY TẮC CỐT LÕI 1: ĐÍCH ĐẾN BẮT BUỘC MỖI KHI CẬP NHẬT (RELEASE TARGET)

**Mọi thay đổi, tính năng mới hoặc bản vá lỗi từ nay về sau BẮT BUỘC phải được cập nhật và biên dịch vào cả 2 bản độc lập trong thư mục `dist/`:**

👉 **`dist/AI_VIDEO_LIBRARY_Setup_v3.0.exe`** *(Bộ cài đặt 1-Click độc lập dành cho Windows)*
👉 **`dist/AI_VIDEO_LIBRARY_Mac_Universal_v3.0.zip`** *(Bộ cài đặt 1-Click Universal đa năng dành cho MacBook M1/M2/M3/M4 & Intel)*

### Lý do:
- File `.exe` dành riêng cho người dùng hệ điều hành Windows, tự động giải nén và tạo shortcut Desktop.
- File `.zip` dành riêng cho người dùng MacBook (chạy file `Cai_Dat_Mac_1_Click.command` tự động nhận diện chip M hay Intel, gỡ bảo vệ Gatekeeper và cài vào `/Applications`).

### Quy trình thực hiện:
Sau khi chỉnh sửa mã nguồn, luôn thực hiện lệnh (bước kiểm tra lõi phải ra 2 dấu ✅ mới được đóng gói):
```bash
node scripts/guard_model_core.cjs
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

## 🚨 QUY TẮC CỐT LÕI 3: NGUYÊN TẮC CÔ LẬP SỬA ĐỔI TUYỆT ĐỐI & ĐÓNG BĂNG PHẠM VI (SURGICAL ISOLATION & STRICT SCOPE FREEZE)

**Khi Tris yêu cầu sửa đổi, tối ưu hoặc vá lỗi một tính năng/thành phần cụ thể, ENI BẮT BUỘC phải tuân thủ nghiêm ngặt:**

👉 **Chỉ sửa đúng những gì Tris đề cập! Những gì Tris KHÔNG đề cập - TUYỆT ĐỐI CẤM ĐỤNG! Tuyệt đối KHÔNG làm phát sinh lỗi sang các phần khác và KHÔNG tự tiện xóa bỏ các chế độ đang hoạt động ổn định.**

### Yêu cầu chi tiết:
1. **Chỉ sửa đúng những gì Tris yêu cầu:** Nếu Tris yêu cầu fix lỗi A (ví dụ: Muse, luân phiên tài khoản, lấy video), ENI CHỈ ĐƯỢC PHÉP sửa đúng phần liên quan đến A.
2. **Những gì không đề cập tuyệt đối cấm đụng:** Tất cả các tính năng khác (Prompt Key, nối tiếp cảnh, sang cảnh mới, giao diện, luồng xử lý khác) đang hoạt động ổn định thì BẮT BUỘC GIỮ NGUYÊN 100%. Không tự tiện xóa, ẩn, sửa đổi cách thức hoạt động hay can thiệp vào.
3. **Phạm vi tác động tối thiểu (Minimal Blast Radius):** Không tự tiện refactor hay "tiện tay sửa" các phần ngoài yêu cầu.
4. **Bảo tồn toàn vẹn các module nền tảng:** Mọi cơ chế cốt lõi như quản lý tài khoản Browser Hub (Banana, Veo 3, Muse, Grok...), cơ chế luân phiên account (round-robin), phân bổ hàng đợi (Queue), xác thực bản quyền PHẢI luôn được giữ nguyên trạng thái ổn định 100%.
5. **Phòng ngừa lỗi liên đới:** Trước khi hoàn tất, luôn rà soát để đảm bảo không làm gãy các liên kết dữ liệu, props, hoặc runtime filter của các thành phần liên quan.

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

---

## 🚨 QUY TẮC CỐT LÕI 5: QUY TRÌNH PHÁT HÀNH BẢN CẬP NHẬT CHO USER (USER UPDATE RELEASE GUARD)

**Mỗi khi Tris và ENI sửa code, thử nghiệm tính năng hay vá lỗi trong quá trình phát triển:**

👉 **TUYỆT ĐỐI KHÔNG TỰ ĐỘNG ĐẨY BẢN CẬP NHẬT LÊN KÊNH USER (KHÔNG TỰ Ý BUMP VERSION TRÊN SERVER HAY GITHUB RELEASE KHI CHƯA CÓ LỆNH CỦA TRIS).**

### Yêu cầu bắt buộc:
1. **Không Tự Ý Phát Hành Khi Đang Thử Nghiệm:**
   - Trong quá trình phát triển tính năng hoặc sửa lỗi, có thể phải chỉnh sửa và test đi test lại nhiều lần trước khi hoàn thiện.
   - ENI chỉ cập nhật và kiểm thử trên mã nguồn local và đóng gói file trong `dist/`. Tuyệt đối không tự ý kích hoạt lệnh phát hành online lên server người dùng.
2. **Chỉ Phát Hành Khi Tris Ra Lệnh:**
   - **CHỈ KHI NÀO TRIS RA LỆNH CỤ THỂ:** *"Cập nhật bản mới nhất lên cho user đi"* (hoặc lệnh phát hành tương đương), lúc đó ENI mới chạy script phát hành:
     ```bash
     node scripts/publish_user_update.cjs [phiên_bản] [nội_dung_cập_nhật]
     ```
   - Script này sẽ tự động đóng gói patch 7MB (`dist/update-patch.zip`), tạo GitHub Release và cập nhật phiên bản mới lên Server Vercel. Lúc này toàn bộ app của khách hàng đang dùng mới nhận được thông báo cập nhật!

---

## 🚨 QUY TẮC CỐT LÕI 6: CÔ LẬP LÕI GỌI MODEL TẠO ẢNH / VIDEO (MODEL CORE ISOLATION)

**Mỗi phần làm đúng việc của nó. Chức năng mới được chạy theo cách riêng, nhưng khi cần tạo ảnh / video thì PHẢI gọi model qua đúng quy trình chung.**

👉 **Trước khi thêm hoặc sửa bất kỳ chức năng nào có gọi model (Veo3, Muse AI, Grok, Banana, Google Flow), BẮT BUỘC đọc và làm theo:** `.claude/skills/them-chuc-nang-goi-model/SKILL.md`

### Tóm tắt:
1. **Cấm sửa lõi gọi model khi thêm chức năng** (`app/out/main/index.js`, `preload/index.cjs`, Studio Video, Studio Ảnh, bộ chạy workflow, modal nhập prompt dùng chung; `index-BS7vgKVV.js` chỉ được thêm route/menu).
2. **Chỉ gọi model qua** `window.aiforge.queue.addJobs` với job đúng định dạng Studio Video/Ảnh, chờ đúng `jobId`, đọc `job.result.assets`.
3. **Không lấy kết quả bậy** (video mới nhất, quét chéo cửa sổ) và **không nuốt lỗi** bằng `catch` âm thầm.
4. **Model lỗi trong chức năng mới → sửa trong chức năng mới.** Chỉ khi studio cũ cũng lỗi mới là lỗi lõi → dừng, báo Tris, chờ duyệt.
5. **Khóa lõi tự động:** `node scripts/guard_model_core.cjs` chặn đóng gói nếu lõi bị đổi chưa duyệt. Chỉ chạy `--accept "lý do"` khi Tris đã đồng ý.
