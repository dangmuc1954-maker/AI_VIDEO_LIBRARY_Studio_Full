/*
 * Tris yêu cầu 12/11/2026 — Workflow:
 *  1. Node mới "Video tham chiếu" (video-ref): tải video từ máy / chọn trong thư viện → cổng ra Video.
 *  2. Node Google Flow (chế độ Video, Thành phần) thêm cổng vào "Video tham chiếu" (nhận video từ node Video tham chiếu
 *     hoặc từ cổng Video của node tạo video khác) → gửi kèm job như video tham chiếu (lõi tự chuyển chế độ Edit).
 *  3. Mọi node tạo video (Google Flow Video, Grok Video, Muse) thêm cổng ra "Frame cuối" (ảnh) — bộ chạy tự chụp
 *     frame cuối của video vừa tạo (assets.extractLastFrame) khi cổng này có dây nối.
 * Workflow đã lưu: khi mở, cổng của node video được tính lại (mã cổng cũ giữ nguyên → dây cũ không mất).
 * File: index-BS7vgKVV.js (mẫu node + cổng), useWorkflowRunner-DGw6Ekx4.js (bộ chạy), WorkflowEditor-LHGC9K3C.js (giao diện).
 */
const fs = require('fs');
const path = require('path');
const DIR = path.join(__dirname, '..', 'app', 'out', 'renderer', 'assets');

function patch(fileName, edits) {
  const file = path.join(DIR, fileName);
  let s = fs.readFileSync(file, 'utf8');
  for (const [name, a, b] of edits) {
    const n = s.split(a).length - 1;
    if (n !== 1) { console.error(`KHÔNG KHỚP (${n}) — ${fileName}: ${name}. Không ghi gì.`); process.exit(1); }
    s = s.replace(a, () => b);
    console.log(`  ✓ ${fileName}: ${name}`);
  }
  return { file, s };
}

const idxSrc = fs.readFileSync(path.join(DIR, 'index-BS7vgKVV.js'), 'utf8');
if (idxSrc.includes('-out-lastframe')) { console.error('Đã vá trước đó — dừng.'); process.exit(1); }

const LF = (v) => `{id:\`\${${v}}-out-lastframe\`,type:"image",label:"Frame cuối"}`;
const VIN = '{id:`${n}-in-vid`,type:"video",label:"Video tham chiếu",maxConnections:1,optional:!0}';

const idx = patch('index-BS7vgKVV.js', [
  ['Muse: cổng Frame cuối',
    'outputs:[{id:`${n}-out-vid`,type:"video",label:"Video"}]};if(a!=="google-flow"&&a!=="grok")return null;',
    `outputs:[{id:\`\${n}-out-vid\`,type:"video",label:"Video"},${LF('n')}]};if(a!=="google-flow"&&a!=="grok")return null;`],
  ['Flow Khung hình: cổng Frame cuối',
    'label:"Prompt"}],outputs:[{id:`${n}-out-vid`,type:"video"}]}}return{inputs:i?',
    `label:"Prompt"}],outputs:[{id:\`\${n}-out-vid\`,type:"video"},${LF('n')}]}}return{inputs:i?`],
  ['Flow/Grok Video: cổng Video tham chiếu (Flow) + Frame cuối',
    'return{inputs:i?[{id:`${n}-in-img`,type:"image"},{id:`${n}-in-txt`,type:"text"}]:[{id:`${n}-in-img`,type:"image"},{id:`${n}-in-txt`,type:"text"}],outputs:i?[{id:`${n}-out-vid`,type:"video"}]:[{id:`${n}-out-img`,type:"image"}]}}',
    `return{inputs:i?[{id:\`\${n}-in-img\`,type:"image"},{id:\`\${n}-in-txt\`,type:"text"},...(a==="google-flow"?[${VIN}]:[])]:[{id:\`\${n}-in-img\`,type:"image"},{id:\`\${n}-in-txt\`,type:"text"}],outputs:i?[{id:\`\${n}-out-vid\`,type:"video"},${LF('n')}]:[{id:\`\${n}-out-img\`,type:"image"}]}}`],
  ['node Muse mới: cổng Frame cuối',
    'outputs:[{id:`${a}-out-vid`,type:"video",label:"Video"}],config:{prompt:"",mode:"Video",model:"muse-video"',
    `outputs:[{id:\`\${a}-out-vid\`,type:"video",label:"Video"},${LF('a')}],config:{prompt:"",mode:"Video",model:"muse-video"`],
  ['node mới "Video tham chiếu"',
    'case"video-last-frame":return{id:a,type:"video-last-frame"',
    'case"video-ref":return{id:a,type:"video-ref",title:"Video tham chiếu",x:r,y:i,width:300,height:250,enabled:!0,active:!0,inputs:[],outputs:[{id:`${a}-out-vid`,type:"video",label:"Video"}],config:{referenceAssetIds:[]}};case"video-last-frame":return{id:a,type:"video-last-frame"'],
  ['gợi ý nối: node Video tham chiếu cho ra video',
    'video:new Set(["google-flow","grok","muse","delay","condition","video-script-extract","video-dubbing","video-last-frame"])',
    'video:new Set(["google-flow","grok","muse","delay","condition","video-script-extract","video-dubbing","video-last-frame","video-ref"])'],
  ['mở workflow cũ: tính lại cổng node video',
    'if(a.type==="google-flow"&&a.config?.mode==="Video"&&(a.config?.videoMode==="Frames"||a.config?.flowVideoMode==="Frames")){const c=ok(r.id,r.type,"Video",r.config);c&&(r={...r,inputs:c.inputs,outputs:c.outputs})}',
    'if((a.type==="google-flow"||a.type==="grok")&&a.config?.mode==="Video"||a.type==="muse"){const c=ok(r.id,r.type,"Video",r.config);c&&(r={...r,inputs:c.inputs,outputs:c.outputs})}'],
]);

const RUN_VREF = 'else if(r.type==="video-ref"){'
  + 'const __aApi=window.aiforge?.assets;const __list=__aApi?.list?await __aApi.list():[];'
  + 'const __ids=Array.isArray(r.config?.referenceAssetIds)?r.config.referenceAssetIds:[];'
  + 'const __a=__ids.map(id=>__list.find(x=>x.id===id)).find(x=>x&&x.type==="video");'
  + 'if(!__a)throw new Error(`${r.title}: chưa chọn video tham chiếu. Bấm "Chọn / tải video tham chiếu" trên node.`);'
  + 'const __vi={type:"video",assetId:__a.id,id:__a.id,url:__a.url,thumbnailUrl:__a.thumbnailUrl,mimeType:__a.mimeType||"video/mp4",name:__a.name};'
  + 'H.videos=[...(H.videos||[]),__vi],y(r.id,{config:{...r.config,outputAssets:[__vi]}}),z(r,`Video tham chiếu sẵn sàng: ${__a.name||__a.id}`,"success",{phase:"input"})}'
  + 'else if(r.type==="image"){const v=typeof r.config?.imageDynamicSource';

const run = patch('useWorkflowRunner-DGw6Ekx4.js', [
  ['bộ chạy: node Video tham chiếu', 'else if(r.type==="image"){const v=typeof r.config?.imageDynamicSource', RUN_VREF],
  ['bộ chạy: Flow Video nhận video tham chiếu từ cổng vào',
    '}else{C=Array.from(new Set([...N,...E]))}const j=[]',
    '}else{C=Array.from(new Set([...N,...E,...(e.type==="google-flow"&&e.config?.mode==="Video"?(t.videos||[]).flatMap(S=>S.assetId?[S.assetId]:[]).slice(0,1):[])]))}const j=[]'],
  ['bộ chạy: cổng Frame cuối của node tạo video',
    'H=await p(r,P,n,J,_=>{x(r.id,_)},w,X),',
    'H=await p(r,P,n,J,_=>{x(r.id,_)},w,X),H=await __wfLastFrameOut(r,H,typeof M!=="undefined"&&Array.isArray(M)?M:null,z),'],
]);
run.s += '\nasync function __wfLastFrameOut(node,H,edges,log){'
  + 'const port=(node.outputs||[]).find(o=>String(o.id).endsWith("-out-lastframe"));if(!port)return H;'
  + 'if(edges&&!edges.some(c=>c.fromNode===node.id&&c.fromPort===port.id))return H;'
  + 'const vids=Array.isArray(H?.videos)?H.videos:[];if(vids.length===0)return H;'
  + 'const api=window.aiforge?.assets;if(!api?.extractLastFrame)throw new Error(`${node.title}: chức năng chụp frame cuối chưa khả dụng.`);'
  + 'const v=vids[vids.length-1];const vid=v.assetId||v.id;'
  + 'const ex=await api.extractLastFrame(vid||v);if(!ex||!ex.url)throw new Error(`${node.title}: không chụp được frame cuối của video vừa tạo.`);'
  + 'const id=ex.id||ex.assetId;const img={type:"image",assetId:id,id,url:ex.url,thumbnailUrl:ex.thumbnailUrl||ex.url,mimeType:ex.mimeType||"image/png",width:ex.width,height:ex.height};'
  + 'try{log?.(node,"Đã chụp frame cuối video cho cổng Frame cuối","success",{phase:"result"})}catch(_){}'
  + 'return{...H,images:[...(H.images||[]),img]}}\n';

const VREF_BODY = 'e.type==="video-ref"&&(()=>{const __as=or.getState().assets||[];'
  + 'const __v=(Array.isArray(e.config?.referenceAssetIds)?e.config.referenceAssetIds:[]).map(id=>__as.find(a=>a.id===id)).find(a=>a&&a.type==="video");'
  + 'return t.jsxs("div",{className:"flex-1 relative rounded-lg overflow-hidden border border-violet-400/30 flex flex-col bg-black/40 min-h-[120px]",children:['
  + '__v?t.jsx("video",{src:__v.url,poster:__v.thumbnailUrl,muted:!0,loop:!0,autoPlay:!0,playsInline:!0,className:"w-full flex-1 object-cover min-h-0 pointer-events-none"})'
  + ':t.jsx("div",{className:"flex-1 flex items-center justify-center text-[11px] text-slate-400 px-3 text-center",children:"Chưa có video. Bấm nút bên dưới để tải video từ máy hoặc chọn trong thư viện. Nối cổng Video vào cổng Video tham chiếu của node Google Flow (Omni Flash / Omni 1.2 Flash)."}),'
  + 't.jsx("button",{onClick:F=>{F.stopPropagation(),v(e.id),_?.(e.id)},onMouseDown:F=>F.stopPropagation(),className:"m-1.5 h-8 shrink-0 rounded-lg border border-violet-400/50 bg-violet-600/25 text-violet-100 text-xs font-semibold hover:bg-violet-600/40 cursor-pointer",children:__v?"🎬 Đổi video tham chiếu":"🎬 Chọn / tải video tham chiếu"})]})})(),';

const ed = patch('WorkflowEditor-LHGC9K3C.js', [
  ['danh sách node: thêm "Video tham chiếu"',
    '{type:"video-dubbing",title:"Lồng Tiếng & Đồng Bộ Video",desc:',
    '{type:"video-ref",title:"Video tham chiếu",desc:"Tải video từ máy hoặc chọn trong thư viện, nối vào cổng Video tham chiếu của node Google Flow (Omni Flash / Omni 1.2 Flash)."},{type:"video-dubbing",title:"Lồng Tiếng & Đồng Bộ Video",desc:'],
  ['giao diện node Video tham chiếu',
    '(e.type==="prompt"||e.type==="text")&&t.jsxs("div",{className:"flex-1 flex flex-col justify-between gap-2 min-h-0",children:[',
    VREF_BODY + '(e.type==="prompt"||e.type==="text")&&t.jsxs("div",{className:"flex-1 flex flex-col justify-between gap-2 min-h-0",children:['],
  ['hộp chọn: node Video tham chiếu nhận video',
    'allowVideo:Zt?.type==="google-flow"&&Zt?.config?.mode==="Video",',
    'allowVideo:Zt?.type==="google-flow"&&Zt?.config?.mode==="Video"||Zt?.type==="video-ref",'],
  ['tải video từ máy cho node Video tham chiếu',
    'const __wfVidRef=O.type==="google-flow"&&O.config?.mode==="Video"&&',
    'const __wfVidRef=(O.type==="google-flow"&&O.config?.mode==="Video"||O.type==="video-ref")&&'],
]);

for (const { file, s } of [idx, run, ed]) {
  const bak = file + '.bak_before_wf_video_ports';
  if (!fs.existsSync(bak)) fs.copyFileSync(file, bak);
  fs.writeFileSync(file, s, 'utf8');
}
console.log('Xong. Bản gốc: *.bak_before_wf_video_ports');
