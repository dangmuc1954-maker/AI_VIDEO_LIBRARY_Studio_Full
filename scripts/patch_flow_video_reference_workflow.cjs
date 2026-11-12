/*
 * Tris yêu cầu 12/11/2026: video tham chiếu cho node workflow Google Flow (chế độ Video, Veo3).
 * Chỉ sửa WorkflowEditor (giao diện cấu hình node) — bộ chạy workflow giữ nguyên: nó đã chuyển
 * config.referenceAssetIds của node vào job, lõi tự nhận asset video → gửi chế độ video tham chiếu.
 * - Hộp chọn tham chiếu của node Google Flow Video: allowVideo (thư viện hiện video, tải lên nhận mp4/mov/webm).
 * - Tải video từ máy: ≤100MB, mỗi node 1 video (thêm video mới thì thay video cũ).
 * Cần chạy sau patch_flow_video_reference_core.cjs và patch_flow_video_reference_ui.cjs.
 */
const fs = require('fs');
const path = require('path');
const FILE = path.join(__dirname, '..', 'app', 'out', 'renderer', 'assets', 'WorkflowEditor-LHGC9K3C.js');
let s = fs.readFileSync(FILE, 'utf8');
if (s.includes('__wfVidRef')) { console.error('Đã vá trước đó — dừng.'); process.exit(1); }

const edits = [
  ['hộp chọn tham chiếu node Google Flow Video nhận video',
    'frameMode:Zt?.config?.mode==="Video"&&Fn(Zt.config)==="Frames",title:',
    'frameMode:Zt?.config?.mode==="Video"&&Fn(Zt.config)==="Frames",allowVideo:Zt?.type==="google-flow"&&Zt?.config?.mode==="Video",title:'],
  ['tải video từ máy làm tham chiếu node (mỗi node 1 video)',
    'for(const ie of L){if(le.length>=q)break;if(!Pd.has(ie.type)||ie.size<=0||ie.size>Td)continue;const ne=await or.getState().importReference({name:ie.name,mimeType:ie.type,dataUrl:await Ya(ie)});',
    'for(const ie of L){if(le.length>=q)break;const __wfVidRef=O.type==="google-flow"&&O.config?.mode==="Video"&&/^video\\/(mp4|quicktime|webm)$/.test(ie.type)&&ie.size>0&&ie.size<=100*1024*1024;if(!__wfVidRef&&(!Pd.has(ie.type)||ie.size<=0||ie.size>Td))continue;if(__wfVidRef){for(let __k=le.length-1;__k>=0;__k--){const __a=or.getState().assets.find(x=>x.id===le[__k]);if(__a&&__a.type==="video")le.splice(__k,1)}}const ne=await or.getState().importReference({name:ie.name,mimeType:ie.type,dataUrl:await Ya(ie)});'],
];
for (const [name, a, b] of edits) {
  const n = s.split(a).length - 1;
  if (n !== 1) { console.error(`KHÔNG KHỚP (${n}) — ${name}. Không ghi.`); process.exit(1); }
  s = s.replace(a, () => b);
  console.log('  ✓ ' + name);
}
const bak = FILE + '.bak_before_video_reference';
if (!fs.existsSync(bak)) fs.copyFileSync(FILE, bak);
fs.writeFileSync(FILE, s, 'utf8');
console.log('Xong. Bản gốc: ' + path.basename(bak));
