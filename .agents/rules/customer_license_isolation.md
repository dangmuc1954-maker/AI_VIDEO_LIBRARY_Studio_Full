# QUY TẮC BẢO VỆ TÍNH ĐỘC LẬP BẢN QUYỀN MÁY KHÁCH HÀNG (CUSTOMER LICENSE ISOLATION)

## 📌 Chỉ thị tối cao từ Tris:
Khi khách hàng tải file exe về máy và kích hoạt bản quyền (bằng key tự động thanh toán qua Web hoặc key do Tris tạo thủ công từ Admin):

👉 **Ứng dụng trên máy của khách hàng PHẢI chạy hoàn toàn ĐỘC LẬP và MIỄN NHIỄM với mọi quá trình nâng cấp, cập nhật phiên bản của Tris.**

### 1. Tính Độc Lập Tuyệt Đối Của Máy Khách (Machine Independence)
- Một khi khách hàng đã kích hoạt bản quyền trên máy của họ, gói cước và token bản quyền được gắn chặt với phần cứng máy khách (HWID / Machine Code) và lưu trong `%APPDATA%\AI_VIDEO_LIBRARY_DATA\license-state.production.json`.
- Cho dù Tris đang phát triển tính năng mới, thử nghiệm mã nguồn, nâng cấp phiên bản (v3.1, v4.0...), cập nhật server hay phát hành bản EXE mới, **app trên máy khách hàng cũ PHẢI tiếp tục chạy độc lập, bình thường 100%, không bị ảnh hưởng, không bị lỗi, không bị đá văng và không bị mất bản quyền**.

### 2. Triệt Tiêu Hoàn Toàn Lỗi "This License Token Belongs To Another Machine"
- Mọi cơ chế tạo key, kích hoạt, check-in hoặc cấp phát token trên Server (`vercel_server/`) và Client (`app/`) PHẢI luôn bảo đảm tính tương thích ngược và định danh chính xác theo đúng HWID của máy khách đang gửi request.
- Tuyệt đối không được gán đè, nhầm lẫn token giữa máy phát triển (máy của Tris) với máy của khách hàng, hoặc giữa các khách hàng với nhau.
- Token của máy nào thì lưu trữ và xác thực độc lập trên đúng máy đó.

### 3. Bảo Tồn Dữ Liệu Khi Cập Nhật Bản Mới (Preserve %APPDATA% Data)
- Bộ cài đặt độc lập `dist/AI_VIDEO_LIBRARY_Setup_v3.0.exe` chỉ giải nén và cập nhật phần mềm vào `%LOCALAPPDATA%\Programs\AI VIDEO LIBRARY`.
- Thư mục dữ liệu `%APPDATA%\AI_VIDEO_LIBRARY_DATA` (chứa toàn bộ tài khoản Browser Hub, cookies session đăng nhập và token bản quyền đã kích hoạt) **BẮT BUỘC PHẢI ĐƯỢC GIỮ NGUYÊN VẸN 100%**.
- Khách hàng cũ khi tải file EXE mới về cài đè lên sẽ tự động kế thừa toàn bộ bản quyền và tài khoản cũ mà không cần phải đăng nhập lại hay kích hoạt lại.

### 4. Tương Thích Ngược API Server 100% (Strict Backward Compatibility)
- Mọi nâng cấp logic trên server bản quyền `https://vercelserver-eight.vercel.app` phải luôn tương thích ngược với mọi phiên bản app cũ mà khách hàng đang sử dụng. Không bao giờ được đổi cấu trúc payload làm hỏng luồng check-in định kỳ của các client cũ.
