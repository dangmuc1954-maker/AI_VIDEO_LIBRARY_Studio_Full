---
name: them-chuc-nang-goi-model
description: Quy trình BẮT BUỘC khi thêm hoặc sửa bất kỳ chức năng nào cần gọi model tạo ảnh / tạo video (Veo3, Muse AI, Grok, Banana, Google Flow) trong AIForge_Veo3_Studio — studio mới, node workflow mới, nút tạo mới, sửa lỗi gọi model. Dùng trước khi đụng vào code gọi model, hàng đợi (queue), luân phiên tài khoản hoặc lấy kết quả video/ảnh.
---

# Quy trình thêm chức năng gọi model (không làm hỏng chức năng cũ)

Mục tiêu của Tris: **mỗi phần làm đúng việc của nó**. Chức năng mới được hoạt động theo cách riêng của nó,
nhưng khi cần tạo ảnh / tạo video thì PHẢI đi qua đúng một quy trình chung, không lấy tắt, không sửa lõi.

## 1. Kiến trúc: 3 tầng, mỗi tầng một việc

```
[Tầng 1] CHỨC NĂNG (studio / node)   → tự quản lý giao diện, dữ liệu, cách chạy riêng của nó
              │  chỉ gọi qua cổng API
              ▼
[Tầng 2] CỔNG API  window.aiforge.*   → app/out/preload/index.cjs
              │
              ▼
[Tầng 3] LÕI GỌI MODEL                → app/out/main/index.js
         hàng đợi → chọn/luân phiên tài khoản → gọi Veo3/Muse/Grok/Banana → tải kết quả → lưu asset
```

- Chức năng mới **chỉ được nằm ở Tầng 1**. Nó "cắm phích" vào cổng API, không được "đục lại ổ điện".
- Tầng 2 và 3 dùng chung cho MỌI studio. Sửa 1 dòng ở đây = ảnh hưởng Studio Ảnh, Studio Video,
  Studio Kịch Bản, Workflow node... cùng lúc.

## 2. File lõi — CẤM SỬA khi thêm chức năng

| File | Vai trò |
|---|---|
| `app/out/main/index.js` | Hàng đợi, luân phiên tài khoản, gọi model, tải kết quả |
| `app/out/main/google_flow_native_transport.cjs` | Kết nối Google Flow (Veo3) |
| `app/out/preload/index.cjs` | Cổng API `window.aiforge` / `window.aivideo` |
| `app/out/renderer/assets/useWorkflowRunner-DGw6Ekx4.js` | Bộ chạy workflow node |
| `app/out/renderer/assets/VideoStudio-frcr8V6s.js` | Studio Video |
| `app/out/renderer/assets/ImageStudio-4nmpUX3j.js` | Studio Ảnh |
| `app/out/renderer/assets/StudioFailedBulkActions-Zv2NpUPy.js` | Modal nhập prompt hàng loạt dùng chung |
| `app/out/renderer/assets/index-BS7vgKVV.js` | Store + router + menu — **chỉ được thêm route/menu** cho studio mới |

Danh sách này được khóa bằng `scripts/guard_model_core.cjs` (xem mục 6).

## 3. Quy trình gọi model CHUẨN (chức năng mới phải làm đúng y như vậy)

Mẫu đúng đang chạy ổn: `app/out/renderer/assets/StoryScriptStudio.js` (hàm chạy cảnh, đoạn `jobBatch`).

**Bước 1 — Dựng job đúng định dạng** (giống hệt Studio Video / Studio Ảnh đang gửi):

```js
const queueApi = window.aiforge?.queue || window.aivideo?.queue;
const job = {
  title: "Tên hiển thị",
  type: "Video",                 // hoặc "Image"
  providerId: "muse",            // "veo3" | "muse" | "grok" | ...
  provider: "Muse AI",           // "Veo3" | "Muse AI" | "Grok"
  // accountId/account: CHỈ thêm khi người dùng chọn tài khoản thủ công. Không có = lõi tự luân phiên.
  payload: {
    promptId: "<id duy nhất của cảnh/mục>",
    prompt: "...",
    ratio: "16:9",               // "9:16" | "1:1"...
    mode: "Components",
    model: "muse-video",         // Veo3: model người dùng chọn | Grok: "grok-imagine-video"
    duration: "10s",             // Muse 10s | Veo3 8s | Grok 6s
    resolutionName: "720p",
    referenceAssetIds: [],       // id ảnh tham chiếu (lấy từ assets.importReference)
    generationRunId: `<ten-chuc-nang>-run-${Date.now()}`,
    generationRunCreatedAt: new Date().toISOString(),
    promptOrder: 1,
    account: "Auto",
    accountSelection: "auto",    // "manual" nếu có accountId
    preset: "custom",
    studioSource: "<ten-chuc-nang-moi>",   // BẮT BUỘC, mỗi chức năng một tên riêng
  },
};
```

Job ảnh: xem đúng các trường Studio Ảnh gửi (`type:"Image"`, `mode:"generate"|"edit"`, `size`, `quality`,
`referenceAssetIds`, `referenceImages`...) — tra trong `ImageStudio-4nmpUX3j.js`, tìm `type:"Image"`.
**Không tự bịa trường mới** mà lõi không hiểu.

**Bước 2 — Gửi vào hàng đợi:** `await queueApi.addJobs([job])` → lấy `jobId` từ
`res.results[0].job.id` (dự phòng `res[0].id`). Không có `jobId` → báo lỗi rõ ràng, không đoán.

**Bước 3 — Chờ kết quả đúng job của mình:**
- Nghe `queueApi.onChanged(snapshot => ...)` + poll dự phòng `queueApi.list()` mỗi 3s.
- Chỉ nhận job có **đúng `jobId`** của mình. Không lấy "video mới nhất", không quét Browser Hub,
  không lấy theo thứ tự — đó là cách nhận nhầm video của chức năng khác.
- `Completed` → xong. `Failed`/`Canceled` → báo lỗi kèm `job.error`. Có timeout riêng của chức năng.
- Nhớ hủy đăng ký `onChanged` và `clearInterval` khi xong.

**Bước 4 — Đọc kết quả:** `job.result.assets` (tìm `type === "video"` hoặc `"image"`) → `assetId`, `url`,
`localPath`, `thumbnailUrl`. Thiếu thì hỏi thêm qua `window.aiforge.assets`. Không tự tải file từ web.

**Bước 5 — Xử lý tiếp theo kiểu riêng của chức năng** (nối cảnh, ghép phim, lồng tiếng...) bằng các API
có sẵn: `assets.extractLastFrame`, `assets.mergeVideos`, `assets.editAndMergeVideos`, `assets.muxAudioVideo`...
Toàn bộ logic riêng nằm trong file của chức năng mới.

## 4. NHỮNG ĐIỀU CẤM (đã từng gây lỗi thật trong dự án)

- ❌ **Sửa lõi cho vừa chức năng mới.** Ví dụ thật: commit thêm Studio Kịch Bản đã đổi timeout chờ video
  của MỌI studio từ 12 → 35 phút và xóa đoạn quét Browser Hub trong `main/index.js`.
- ❌ Thêm `if (studioSource === "...")` vào lõi để chức năng mới chạy khác đi.
- ❌ Tự mở trình duyệt / gọi thẳng web Veo3, Muse, Grok từ chức năng mới — phải qua hàng đợi.
- ❌ Lấy video "bậy": lấy video mới nhất, lấy theo tên, quét chéo cửa sổ — chỉ lấy theo `jobId`.
- ❌ Nuốt lỗi bằng `catch` rồi âm thầm chạy chế độ đơn giản hơn. Ví dụ thật: modal nhập prompt
  dùng biến `sceneIndex` không tồn tại, `catch` lùi về chỉ văn bản → mất hết ảnh tham chiếu mà không ai biết.
  Lỗi phải hiện ra (toast/console.error), không được che.
- ❌ Đổi tên / đổi cấu trúc trường mà studio cũ đang gửi.
- ❌ "Tiện tay" refactor, dọn code, đổi giao diện ở file khác.

## 5. Khi model báo lỗi trong chức năng mới

1. **Kiểm tra job của chức năng mới trước:** so từng trường với job Studio Video/Ảnh gửi cho CÙNG model.
   Phần lớn lỗi là do job thiếu/sai trường → **sửa trong file chức năng mới**.
2. Thử cùng prompt đó trên Studio Video/Ảnh. Studio cũ chạy được → lỗi nằm ở chức năng mới, không phải lõi.
3. Chỉ khi studio cũ CŨNG lỗi mới là lỗi lõi → **dừng lại, báo Tris**, mô tả lỗi + chỗ cần sửa,
   chờ Tris duyệt. Sửa lõi là một việc riêng, không gộp chung với việc thêm chức năng.

## 6. Thêm một studio mới — các bước

1. Tạo file riêng `app/out/renderer/assets/<TenStudio>.js` (export `Component`), theo mẫu `StoryScriptStudio.js`.
2. Thêm route + menu bằng **script patch riêng** theo mẫu `scripts/patch_story_script_route.cjs`:
   chỉ chèn lazy import, preload route, `{path, element}` và mục menu. Script phải dừng nếu không tìm thấy
   đúng đoạn cần thay (không thay mò).
3. Chạy `node scripts/guard_model_core.cjs` → sẽ báo `index-BS7vgKVV.js` đổi (do thêm route).
   Cho Tris xem diff (chỉ được có các dòng route/menu), Tris duyệt rồi mới chạy:
   `node scripts/guard_model_core.cjs --accept "Tris duyệt: thêm route <TenStudio>"`

## 7. Checklist trước khi báo xong

- [ ] `git diff --stat` chỉ có file của chức năng mới (+ route nếu là studio mới).
- [ ] `node scripts/guard_model_core.cjs` → 2 dấu ✅ (lõi nguyên vẹn + cú pháp đúng).
- [ ] Đã thử tạo 1 video trên **Studio Video** và 1 ảnh trên **Studio Ảnh** — vẫn chạy bình thường.
- [ ] Đã thử chức năng mới tạo được kết quả và nhận đúng video/ảnh của chính nó.
- [ ] Rồi mới đóng gói theo AGENTS.md (`sync_dist.cjs` + `create_zip_and_installer.js`).
- [ ] Báo Tris: đã sửa file nào, đã thử những gì, cái gì chưa thử được.
