# QUY TẮC PHÁT HÀNH & ĐÓNG GÓI BẮT BUỘC (RELEASE TARGET DIRECTIVE)

## 📌 Chỉ thị tối cao từ Tris:
Từ nay trở đi, **mọi cập nhật mã nguồn, tính năng mới hoặc sửa lỗi** trong dự án `AIForge_Veo3_Studio` BẮT BUỘC phải được biên dịch và cập nhật trực tiếp vào file cài đặt duy nhất:

📍 **`dist/AI_VIDEO_LIBRARY_Setup_v3.0.exe`**

### Lý do:
Đây là file cài đặt Desktop 1-click hoàn chỉnh (Native C# Windows Installer chứa toàn bộ mã nguồn `AppPayload.zip`, icon, và tự động tạo shortcut Desktop) mà Tris dùng để gửi cho khách hàng, rất tiện lợi, dễ dùng và dễ bán.

### Quy trình cập nhật bắt buộc sau mỗi lần code/patch:
1. Cập nhật mã nguồn trong `app/`
2. Đồng bộ sang `dist/AI_VIDEO_LIBRARY_Customer_Edition/resources/app`
3. Chạy script đóng gói tự động:
   ```bash
   node scripts/create_zip_and_installer.js
   ```
4. Xác thực file `dist/AI_VIDEO_LIBRARY_Setup_v3.0.exe` được cập nhật dung lượng và timestamp mới.
