# QUY TẮC CÔ LẬP LÕI GỌI MODEL (MODEL CORE ISOLATION)

## 📌 Chỉ thị từ Tris:
Mỗi phần làm đúng việc của nó. Chức năng mới (studio, node, nút...) được chạy theo cách riêng,
nhưng khi cần tạo ảnh / video thì PHẢI gọi model qua đúng quy trình chung, KHÔNG sửa lõi,
KHÔNG lấy kết quả bậy, KHÔNG làm ảnh hưởng chức năng cũ.

👉 **Quy trình đầy đủ (bắt buộc đọc trước khi làm):** `.claude/skills/them-chuc-nang-goi-model/SKILL.md`

### Tóm tắt
1. **Cấm sửa lõi khi thêm chức năng:** `app/out/main/index.js`, `app/out/main/google_flow_native_transport.cjs`,
   `app/out/preload/index.cjs`, `useWorkflowRunner-DGw6Ekx4.js`, `VideoStudio-frcr8V6s.js`, `ImageStudio-4nmpUX3j.js`,
   `StudioFailedBulkActions-Zv2NpUPy.js`, `index-BS7vgKVV.js` (chỉ được thêm route/menu).
2. **Gọi model đúng 1 đường:** dựng job giống Studio Video/Ảnh (có `studioSource` riêng) →
   `window.aiforge.queue.addJobs([job])` → chờ đúng `jobId` qua `queue.onChanged` + poll → đọc `job.result.assets`.
   Mẫu chuẩn: `StoryScriptStudio.js`.
3. **Không lấy video/ảnh theo kiểu "mới nhất" hay quét chéo** — chỉ theo `jobId`.
4. **Không nuốt lỗi** bằng `catch` âm thầm — lỗi phải hiện ra.
5. **Model lỗi trong chức năng mới:** so job với Studio Video/Ảnh, sửa trong file chức năng mới.
   Chỉ khi studio cũ cũng lỗi mới là lỗi lõi → dừng, báo Tris, chờ duyệt.
6. **Trước khi đóng gói:** `node scripts/guard_model_core.cjs` phải ra 2 dấu ✅.
   Lõi bị đổi mà chưa duyệt → hoàn tác. Đã duyệt → `--accept "lý do"`.
