/*
 * Tris 13/11/2026: nút "Tải về" trên thanh công cụ node workflow (video / ảnh / âm thanh) — bấm vào phải hiện hộp
 * chọn thư mục trên máy, chọn xong lưu file vào đúng chỗ đó (trước chỉ lưu vào Tài nguyên).
 * Dùng IPC có sẵn: assets.selectExportDirectory + assets.exportMedia (destination.directory). Nhớ thư mục lần trước.
 * Bấm Hủy → không làm gì. Không có file đầu ra / thiếu IPC → giữ cách cũ.
 */
const fs = require('fs');
const path = require('path');
const F = path.join(__dirname, '..', 'app', 'out', 'renderer', 'assets', 'WorkflowEditor-LHGC9K3C.js');
let s = fs.readFileSync(F, 'utf8');
if (s.includes('__wfDownloadToFolder')) { console.error('Đã vá trước đó — dừng.'); process.exit(1); }
const A = 'onClick:()=>a(e.id),disabled:d||!y';
const c = s.split(A).length - 1;
if (c !== 1) { console.error(`KHÔNG KHỚP (${c}). Không ghi.`); process.exit(1); }
s = s.replace(A, () => 'onClick:()=>{__wfDownloadToFolder(e,()=>a(e.id))},disabled:d||!y');
s += '\nasync function __wfDownloadToFolder(node,fallback){'
  + 'const api=window.aiforge?.assets||window.aivideo?.assets;'
  + 'const outs=(Array.isArray(node?.config?.outputAssets)?node.config.outputAssets:[]).filter(o=>o&&(o.type==="image"||o.type==="video"||o.type==="audio")&&typeof o.url=="string");'
  + 'if(!api?.selectExportDirectory||!api?.exportMedia||outs.length===0){fallback();return}'
  + 'let last="";try{last=localStorage.getItem("aiforge_wf_node_download_dir")||""}catch(_){}'
  + 'let dir;try{dir=await api.selectExportDirectory(last,"Chọn thư mục lưu "+(outs.length>1?outs.length+" file":"file")+" của node "+(node.title||""))}catch(err){Di.error("Không mở được hộp chọn thư mục: "+(err?.message||err));return}'
  + 'if(!dir)return;'
  + 'try{localStorage.setItem("aiforge_wf_node_download_dir",dir)}catch(_){}'
  + 'let ok=0;const errs=[];const base=String(node.title||"workflow").replace(/[\\/:*?"<>|]+/g,"_").slice(0,60);'
  + 'for(let i=0;i<outs.length;i++){const o=outs[i];try{await api.exportMedia({operationId:"wfdl-"+Date.now()+"-"+Math.random().toString(36).slice(2,8),assetId:o.assetId||o.id,url:o.url,mimeType:o.mimeType,sourceName:base+(outs.length>1?"_"+(i+1):""),destination:{directory:dir,conflictPolicy:"rename",createDirectories:!0}});ok++}catch(err){errs.push(err?.message||String(err))}}'
  + 'if(ok>0)Di.success("Đã lưu "+ok+" file vào: "+dir);'
  + 'if(errs.length)Di.error("Lưu lỗi "+errs.length+" file: "+errs[0])}\n';
const bak = F + '.bak_before_node_download_folder';
if (!fs.existsSync(bak)) fs.copyFileSync(F, bak);
fs.writeFileSync(F, s, 'utf8');
console.log('  ✓ nút Tải về của node: chọn thư mục rồi lưu file vào đó');
