/*
 * Tris 12/11/2026 (tiếp video tham chiếu Veo3):
 * - Video tham chiếu vừa tải lên Flow ở trạng thái "đang xử lý" → chờ Flow xử lý xong (tối đa 2 phút) rồi mới gửi tạo.
 * - Nhật ký gỡ lỗi Flow (flow_rpc_debug.log): khi video render thất bại, ghi thêm phần thô Flow trả về để biết lý do.
 *   (Chỉ thêm dòng ghi nhật ký, không đổi cách đọc trạng thái.)
 */
const fs = require('fs');
const path = require('path');
const IX = path.join(__dirname, '..', 'app', 'out', 'main', 'index.js');
const TR = path.join(__dirname, '..', 'app', 'out', 'main', 'google_flow_native_transport.cjs');
let ix = fs.readFileSync(IX, 'utf8'), tr = fs.readFileSync(TR, 'utf8');
if (ix.includes('__fvWaitReady')) { console.error('Đã vá trước đó — dừng.'); process.exit(1); }
const A1 = 'up=await W.executeFlowUploadVideo(A,{projectId,filePath:a.localPath,mimeType:a.mimeType||"video/mp4",fileName:a.name||"reference.mp4"},signal);__fvRefCache.set(key,up)}';
const B1 = 'up=await W.executeFlowUploadVideo(A,{projectId,filePath:a.localPath,mimeType:a.mimeType||"video/mp4",fileName:a.name||"reference.mp4"},signal);'
  + 'progress?.(38,"Google Flow đang xử lý video tham chiếu...");let __fvWaitReady=!1;'
  + 'for(let __i=0;__i<40;__i++){if(signal?.aborted)throw new p("PROVIDER_REJECTED","Tác vụ tạo video đã bị hủy",!1);'
  + 'let __st=null;try{__st=await W.executeFlowVideoStatusRpc(A,{projectId,mediaId:up.mediaId},signal)}catch(_){}'
  + 'if(__st?.status==="SUCCESS"){__fvWaitReady=!0;break}'
  + 'if(__st?.status==="FAILED")throw new p("PROVIDER_REJECTED","Google Flow không xử lý được video tham chiếu này (video lỗi hoặc không được phép dùng). Hãy chọn video khác.",!1);'
  + 'await new Promise(r=>setTimeout(r,3e3))}'
  + 'if(!__fvWaitReady)throw new p("NETWORK","Google Flow xử lý video tham chiếu quá lâu. Thử lại sau ít phút.",!0);'
  + '__fvRefCache.set(key,up)}';
const A2 = `      statusCode,
      status
    });

    return { statusCode: statusCode || 2, status, raw: data };`;
const B2 = `      statusCode,
      status,
      ...(status === 'FAILED' ? { failedRaw: res.text.slice(0, 3000) } : {})
    });

    return { statusCode: statusCode || 2, status, raw: data };`;
for (const [n, s, a] of [['index: chờ video tham chiếu xử lý xong', ix, A1], ['transport: ghi lý do lỗi khi render thất bại', tr, A2]]) {
  const c = s.split(a).length - 1;
  if (c !== 1) { console.error(`KHÔNG KHỚP (${c}) — ${n}. Không ghi.`); process.exit(1); }
}
ix = ix.replace(A1, () => B1); tr = tr.replace(A2, () => B2);
fs.writeFileSync(IX, ix, 'utf8'); fs.writeFileSync(TR, tr, 'utf8');
console.log('  ✓ index: chờ video tham chiếu xử lý xong\n  ✓ transport: ghi lý do lỗi khi render thất bại');
