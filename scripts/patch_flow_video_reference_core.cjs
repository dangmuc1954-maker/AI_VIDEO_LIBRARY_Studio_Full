/*
 * Tris yêu cầu 12/11/2026: thêm VIDEO THAM CHIẾU cho Veo3 / Google Flow (model Omni Flash + Omni 1.2 Flash),
 * áp cho mọi chỗ dùng Veo3 trong tool (Studio Video, Studio Kịch Bản, node workflow).
 * Bắt từ Flow web:
 *  - Tải video lên: POST /upload/v1/flow/upload/video/<projectId> (Scotty resumable: start → upload, finalize),
 *    header X-Framework-Xsrf-Token = WIZ_global_data.SNlM0e → trả {mediaId, media.video.dimensions.length}.
 *  - Tạo video: RPC jIps6, ô đầu [null, videoMediaId, khungĐầu, khungCuối] (24 khung/giây),
 *    model "abra_edit" (Omni Flash) / "macaron_cookie_edit" (Omni 1.2 Flash), ảnh tham chiếu ở ô thứ 9.
 * Lõi:
 *  - transport: hàm executeFlowUploadVideo + sửa nhánh "Edit" (trước chưa nơi nào gọi) cho khớp đúng Flow.
 *  - index.js: job Veo3 có asset video trong referenceAssetIds → tải video lên (nhớ theo tài khoản) → gửi chế độ Edit.
 *    Thời lượng = số giây đã chọn nhưng không vượt độ dài video (tránh khung cuối đứng im).
 *    Model không phải Omni → báo lỗi rõ, không tự đổi model.
 *  - assets.importReference nhận thêm video mp4/mov/webm (≤100MB) → asset type "video".
 * Job không có video tham chiếu: chạy y như cũ.
 */
const fs = require('fs');
const path = require('path');
const ROOT = path.join(__dirname, '..', 'app', 'out', 'main');
const TR = path.join(ROOT, 'google_flow_native_transport.cjs');
const IX = path.join(ROOT, 'index.js');

function apply(file, edits, bakName) {
  let s = fs.readFileSync(file, 'utf8');
  for (const [name, a, b] of edits) {
    const n = s.split(a).length - 1;
    if (n !== 1) { console.error(`KHÔNG KHỚP (${n}) — ${name}. Không ghi gì.`); process.exit(1); }
    s = s.replace(a, () => b);
    console.log('  ✓ ' + name);
  }
  return () => {
    const bak = file + bakName;
    if (!fs.existsSync(bak)) fs.copyFileSync(file, bak);
    fs.writeFileSync(file, s, 'utf8');
  };
}

const trSrc = fs.readFileSync(TR, 'utf8');
if (trSrc.includes('executeFlowUploadVideo')) { console.error('Đã vá trước đó — dừng.'); process.exit(1); }

// ---------------- transport ----------------
const EDIT_OLD = `    modePayload = [
      [null, params.sourceVideoMediaId, 0, params.sourceVideoEndFrame],
      promptStruct,
      params.modelKey,
      ratioEnum,
      [null, null, null, null, u1, u2],
      null, null, null,
      (params.referenceMediaIds || []).map(id => [null, id]),
      null, null, null,
      [resolutionCode]
    ];`;
const EDIT_NEW = `    // Video tham chiếu (đúng như Flow gửi): [null, videoMediaId, khungĐầu, khungCuối] — 24 khung/giây
    modePayload = [
      [null, params.sourceVideoMediaId, params.sourceVideoStartFrame || 0, params.sourceVideoEndFrame],
      promptStruct,
      params.modelKey,
      ratioEnum,
      [null, null, null, null, u1, u2],
      null, null, null,
      (params.referenceMediaIds || []).map(id => [null, id])
    ];`;

const UPLOAD_FN = `
  // 8. Tải VIDEO tham chiếu lên Google Flow (giống Flow web: Scotty resumable upload)
  async executeFlowUploadVideo(host, session, params, signal, rpcConfig) {
    const readyView = await host.ensureGoogleFlowViewReady(session, signal);
    const siteKey = rpcConfig?.recaptcha?.siteKey || '6LdsFiUsAAAAAIjVDZcuLhaHiDn5nnHVXVRQGeMV';
    await ensurePartitionAuthenticated(session, readyView.view);
    const context = await requestContext(readyView.view, siteKey, '', 20000, signal);
    if (!context.at) throw new Error('Google Flow chưa sẵn sàng để tải video tham chiếu (thiếu mã phiên). Mở lại tài khoản Flow trong Browser Hub rồi thử lại.');
    const bytes = await fs.promises.readFile(params.filePath);
    if (!bytes.length) throw new Error('File video tham chiếu rỗng.');
    if (bytes.length > 100 * 1024 * 1024) throw new Error('Video tham chiếu phải nhỏ hơn 100 MB (giới hạn của Google Flow).');
    const ses = electron.session.fromPartition(session.partition);
    const origin = 'https://flow.google.com';
    const ua = context.fingerprint?.userAgent || 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36';
    const base = { 'origin': origin, 'referer': origin + '/project/' + params.projectId, 'user-agent': ua, 'X-Framework-Xsrf-Token': context.at };
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 10 * 60 * 1000);
    if (signal) signal.addEventListener('abort', () => controller.abort(), { once: true });
    try {
      const start = await ses.fetch(origin + '/upload/v1/flow/upload/video/' + encodeURIComponent(params.projectId), {
        method: 'POST', credentials: 'include', signal: controller.signal,
        headers: { ...base, 'Slug': encodeURIComponent(params.fileName || 'reference.mp4'), 'X-Goog-Upload-Protocol': 'resumable', 'X-Goog-Upload-Command': 'start', 'X-Goog-Upload-Header-Content-Length': String(bytes.length), 'X-Goog-Upload-Header-Content-Type': params.mimeType || 'video/mp4' }
      });
      const upUrl = start.headers.get('x-goog-upload-url');
      if (!start.ok || !upUrl) throw new Error('Google Flow từ chối tải video tham chiếu (HTTP ' + start.status + ').');
      const fin = await ses.fetch(upUrl, {
        method: 'POST', credentials: 'include', signal: controller.signal,
        headers: { ...base, 'X-Goog-Upload-Command': 'upload, finalize', 'X-Goog-Upload-Offset': '0' },
        body: bytes
      });
      const text = await fin.text();
      if (!fin.ok) throw new Error('Tải video tham chiếu lên Google Flow lỗi (HTTP ' + fin.status + '): ' + text.slice(0, 200));
      let j = {};
      try { j = JSON.parse(text); } catch (_) { throw new Error('Google Flow trả kết quả tải video không đọc được: ' + text.slice(0, 200)); }
      const mediaId = j.mediaId || j.media?.name;
      if (!mediaId) throw new Error('Google Flow không trả mã video sau khi tải lên: ' + text.slice(0, 200));
      const dim = j.media?.video?.dimensions || {};
      const durationSec = parseFloat(String(dim.length || '0').replace('s', '')) || 0;
      return { mediaId, workflowId: j.workflow?.name || j.media?.workflowId || '', durationSec, width: dim.width || 0, height: dim.height || 0 };
    } finally {
      clearTimeout(timer);
    }
  },
`;

const trApply = apply(TR, [
  ['transport: nhánh Edit khớp đúng Flow', EDIT_OLD, EDIT_NEW],
  ['transport: hàm tải video tham chiếu', '  // 7. Video Upscale (Veo 3)\n', UPLOAD_FN + '\n  // 7. Video Upscale (Veo 3)\n'],
], '.bak_before_video_reference');

// ---------------- index.js ----------------
const HELPER = 'const __fvRefCache=new Map();'
  + 'async function __flowVideoRef(assets,assetId,A,projectId,e,g,signal,progress){'
  + 'const mk=String(g?.modelKey||"").toLowerCase();'
  + 'const editKey=mk.startsWith("macaron_cookie")?"macaron_cookie_edit":(mk.startsWith("abra")||mk.startsWith("omni_flash"))?"abra_edit":null;'
  + 'if(!editKey)throw new p("PROVIDER_REJECTED","Video tham chiếu chỉ dùng được với model Omni Flash hoặc Omni 1.2 Flash. Hãy đổi model của prompt này sang Omni.",!1);'
  + 'const a=assets.getAsset(assetId);if(!a||!a.localPath)throw new p("PROVIDER_REJECTED","Không tìm thấy file video tham chiếu trên máy. Hãy chọn lại video tham chiếu.",!1);'
  + 'const key=String(A.accountId)+"|"+assetId;let up=__fvRefCache.get(key);'
  + 'if(!up){progress?.(36,"Đang tải video tham chiếu lên Google Flow...");up=await W.executeFlowUploadVideo(A,{projectId,filePath:a.localPath,mimeType:a.mimeType||"video/mp4",fileName:a.name||"reference.mp4"},signal);__fvRefCache.set(key,up)}'
  + 'const want=parseInt(String(e?.payload?.duration||"8"),10)||8;'
  + 'const maxFrames=up.durationSec>0?Math.floor(up.durationSec*24):want*24;'
  + 'const endFrame=Math.max(24,Math.min(want*24,maxFrames));'
  + 'return{mediaId:up.mediaId,endFrame,editKey,cacheKey:key}}';

const SUBMIT_OLD = 'modelKey:g.modelKey,ratioEnum:d,mode:u,resolutionCode:_,startMediaId:P,startCrop:w,endMediaId:I,endCrop:D,referenceMediaIds:b,voices:u==="R2V"&&__voice.length?__voice:void 0}';
const SUBMIT_NEW = 'modelKey:__ve?__ve.editKey:g.modelKey,ratioEnum:d,mode:__ve?"Edit":u,resolutionCode:_,startMediaId:P,startCrop:w,endMediaId:I,endCrop:D,referenceMediaIds:b,sourceVideoMediaId:__ve?.mediaId,sourceVideoEndFrame:__ve?.endFrame,voices:!__ve&&u==="R2V"&&__voice.length?__voice:void 0}';

let ix = fs.readFileSync(IX, 'utf8');
const nSub = ix.split(SUBMIT_OLD).length - 1;
if (nSub !== 3) { console.error(`KHÔNG KHỚP (${nSub}, cần 3) — 3 lần gửi tạo video. Không ghi gì.`); process.exit(1); }

const ixEdits = [
  ['index: hàm tải + chuẩn bị video tham chiếu', 'function Zm(r,e){', HELPER + 'function Zm(r,e){'],
  ['index: host gọi transport tải video', 'async executeFlowUploadImageRpc(e,t,A,o){',
    "async executeFlowUploadVideo(e,t,A,o){\n  const transport = require('./google_flow_native_transport.cjs');\n  return transport.executeFlowUploadVideo(this,e,t,A,o);\n}\nasync executeFlowUploadImageRpc(e,t,A,o){"],
  ['index: tách video tham chiếu khỏi ảnh tham chiếu',
    'g=vr(e.payload,this.getVideoCatalog?.()),u=g.mode,__voice=',
    'g=vr(e.payload,this.getVideoCatalog?.()),__vr=this.readReferenceAssetIds(e).filter(x=>this.assets.getAsset(x)?.type==="video"),u=__vr.length?"R2V":g.mode,__voice='],
  ['index: ảnh tham chiếu không lẫn video',
    'd=$u(g.aspectRatio),l=this.readReferenceAssetIds(e),m=Zm(u,l)',
    'd=$u(g.aspectRatio),l=this.readReferenceAssetIds(e).filter(x=>!__vr.includes(x)),m=Zm(u,l)'],
  ['index: tải video tham chiếu trước khi gửi',
    ',t.updateProgress(40,"Submitting video generation via RPC");const _=Vu(g.resolution,g.modelKey);',
    ';const __ve=__vr.length?await this.measureStep(n,"video-reference",()=>__flowVideoRef(this.assets,__vr[0],A,i,e,g,t.signal,(x,y)=>t.updateProgress(x,y))):null;t.updateProgress(40,"Submitting video generation via RPC");const _=Vu(g.resolution,g.modelKey);'],
  ['index: kho tài sản nhận video tham chiếu',
    'importReference(e){const{mimeType:t,bytes:A}=Ws(e.dataUrl),o=e.mimeType||t;',
    'importReference(e){const{mimeType:t,bytes:A}=Ws(e.dataUrl),o=e.mimeType||t;'
    + 'if(/^video\\/(mp4|quicktime|webm)$/.test(String(o||""))){if(A.byteLength===0||A.byteLength>100*1024*1024)throw new Error("Video tham chiếu phải từ 1 byte đến 100 MB");'
    + 'const __h=Zs(A),__old=(this.state?.assets||[]).find(x=>x.type==="video"&&x.sha256===__h&&x.localPath);if(__old)return __old.pinnedAsReference?__old:await this.updateAsset(__old.id,{pinnedAsReference:!0});'
    + 'return this.writeAsset({id:q(),bytes:A,sha256:__h,mimeType:o,name:bo(e.name),type:"video",role:"reference",origin:"imported",pinnedAsReference:!0,createdAt:new Date().toISOString()})}'],
];
for (const [name, a, b] of ixEdits) {
  const n = ix.split(a).length - 1;
  if (n !== 1) { console.error(`KHÔNG KHỚP (${n}) — ${name}. Không ghi gì.`); process.exit(1); }
  ix = ix.replace(a, () => b);
  console.log('  ✓ ' + name);
}
ix = ix.split(SUBMIT_OLD).join(SUBMIT_NEW);
console.log('  ✓ index: 3 lần gửi tạo video dùng chế độ Edit khi có video tham chiếu');

trApply();
const bak = IX + '.bak_before_video_reference';
if (!fs.existsSync(bak)) fs.copyFileSync(IX, bak);
fs.writeFileSync(IX, ix, 'utf8');
console.log('Xong. Bản gốc: *.bak_before_video_reference');
