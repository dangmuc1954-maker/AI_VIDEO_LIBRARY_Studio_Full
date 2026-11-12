/*
 * Tris yêu cầu 12/11/2026: video tham chiếu cho Veo3/Google Flow — phần giao diện.
 * - Hộp chọn tham chiếu dùng chung (ReferenceAssetPicker): thêm tùy chọn allowVideo → thư viện hiện cả video,
 *   tải lên từ máy nhận mp4/mov/webm, video có nhãn "🎬 Video". Không truyền allowVideo = y như cũ (chỉ ảnh).
 * - Studio Video: prompt Veo3 mở hộp chọn với allowVideo; tải video từ máy lên làm tham chiếu (mỗi prompt 1 video,
 *   thêm video mới thì thay video cũ); job Veo3 giữ video trong referenceAssetIds (Grok/Muse giữ nguyên chỉ ảnh).
 * Cần chạy sau scripts/patch_flow_video_reference_core.cjs (lõi nhận video tham chiếu).
 */
const fs = require('fs');
const path = require('path');
const DIR = path.join(__dirname, '..', 'app', 'out', 'renderer', 'assets');

function patch(fileName, edits, bakName) {
  const file = path.join(DIR, fileName);
  let s = fs.readFileSync(file, 'utf8');
  for (const [name, a, b] of edits) {
    const n = s.split(a).length - 1;
    if (n !== 1) { console.error(`KHÔNG KHỚP (${n}) — ${fileName}: ${name}. Không ghi gì.`); process.exit(1); }
    s = s.replace(a, () => b);
    console.log(`  ✓ ${fileName}: ${name}`);
  }
  return () => {
    const bak = file + bakName;
    if (!fs.existsSync(bak)) fs.copyFileSync(file, bak);
    fs.writeFileSync(file, s, 'utf8');
  };
}

const VIDEO_ACCEPT = 'image/png,image/jpeg,image/webp,video/mp4,video/quicktime,video/webm';

const pickerSrc = fs.readFileSync(path.join(DIR, 'ReferenceAssetPicker-BkCtChsN.js'), 'utf8');
if (pickerSrc.includes('allowVideo')) { console.error('Đã vá trước đó — dừng.'); process.exit(1); }

const w1 = patch('ReferenceAssetPicker-BkCtChsN.js', [
  ['nhận tùy chọn allowVideo',
    'function ue({open:a,assets:n,selectedIds:d,maxSelection:s,title:H,frameMode:O=!1,onClose:u,onConfirm:F,onUploadFiles:I}){',
    'function ue({open:a,assets:n,selectedIds:d,maxSelection:s,title:H,frameMode:O=!1,onClose:u,onConfirm:F,onUploadFiles:I,allowVideo:__av=!1}){'],
  ['thư viện hiện video (khi cho phép)',
    'const m=i.useMemo(()=>n.filter(r=>r.type==="image"&&(!b||',
    'const m=i.useMemo(()=>n.filter(r=>(r.type==="image"||__av&&r.type==="video")&&(!b||'],
  ['đếm thư viện gồm video (khi cho phép)',
    '[n,b]),B=i.useMemo(()=>n.filter(r=>r.type==="image"),[n]),',
    '[n,b,__av]),B=i.useMemo(()=>n.filter(r=>r.type==="image"||__av&&r.type==="video"),[n,__av]),'],
  ['tải lên từ máy nhận video (khi cho phép)',
    'type:"file",accept:"image/png,image/jpeg,image/webp",multiple:s>1,',
    `type:"file",accept:__av?"${VIDEO_ACCEPT}":"image/png,image/jpeg,image/webp",multiple:s>1,`],
  ['nhãn 🎬 Video trên ô thư viện',
    'e.jsx("img",{src:r.thumbnailUrl||r.url,alt:r.name,loading:"lazy",decoding:"async",className:"h-full w-full object-cover"}),e.jsx("span",{className:`absolute right-2 top-2',
    'e.jsx("img",{src:r.thumbnailUrl||r.url,alt:r.name,loading:"lazy",decoding:"async",className:"h-full w-full object-cover"}),r.type==="video"&&e.jsx("span",{className:"absolute left-2 bottom-2 rounded-md bg-black/75 px-1.5 py-0.5 text-[10px] font-bold text-white",children:"🎬 Video"}),e.jsx("span",{className:`absolute right-2 top-2'],
], '.bak_before_video_reference');

const w2 = patch('VideoStudio-frcr8V6s.js', [
  ['hộp chọn tham chiếu cho video khi prompt dùng Veo3',
    'frameMode:o.find(r=>r.id===we)?.mode==="Frames",title:t("videoStudio.chooseVideoReferencesTitle"),',
    'frameMode:o.find(r=>r.id===we)?.mode==="Frames",allowVideo:o.find(r=>r.id===we)?.provider==="Veo3",title:t("videoStudio.chooseVideoReferencesTitle"),'],
  ['tải video từ máy làm tham chiếu (Veo3, mỗi prompt 1 video)',
    'for(const c of Array.from(C)){/* unlimited upload */if(!c.type.startsWith("image/"))continue;const b=await it({name:c.name,mimeType:c.type,dataUrl:await zr(c)});',
    'for(const c of Array.from(C)){/* unlimited upload */const __isVid=ae?.provider==="Veo3"&&/^video\\/(mp4|quicktime|webm)$/.test(c.type);if(!c.type.startsWith("image/")&&!__isVid)continue;if(__isVid){if(c.size>100*1024*1024){z.warning("Video tham chiếu phải nhỏ hơn 100 MB");continue}for(let __k=d.length-1;__k>=0;__k--){const __a=(We||[]).find(x=>x.id===d[__k]);if(__a&&__a.type==="video")d.splice(__k,1)}}const b=await it({name:c.name,mimeType:c.type,dataUrl:await zr(c)});'],
  ['job Veo3 giữ video tham chiếu',
    'return ot?[ot]:[]}).filter(ve=>ve.type==="image").map(ve=>ve.id);',
    'return ot?[ot]:[]}).filter(ve=>ve.type==="image"||ve.type==="video"&&v.provider==="Veo3").map(ve=>ve.id);'],
], '.bak_before_video_reference');

w1(); w2();
console.log('Xong. Bản gốc: *.bak_before_video_reference');
