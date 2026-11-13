/*
 * Tris 13/11/2026: Biên tập video trong Studio Kịch Bản — mỗi dự án chọn thư mục lưu riêng nhưng video xuất ra lại lưu chung 1 chỗ.
 * Nguyên nhân: bảng Biên tập video (MergeModal, mượn từ Studio Video) đọc/ghi thư mục CHUNG của cả tool
 * (localStorage "aiforge_auto_download_video_dir"), bỏ qua saveDirectory riêng của dự án.
 * Sửa:
 *  - MergeModal nhận thêm saveDirectory + onSaveDirectoryChange. Có saveDirectory (mở từ Studio Kịch Bản) → dùng thư mục
 *    của dự án; chọn thư mục mới → lưu vào dự án đó, KHÔNG ghi đè thư mục chung. Dự án chưa chọn → dùng thư mục chung như cũ.
 *  - Studio Video (không truyền saveDirectory) giữ nguyên cách cũ.
 */
const fs = require('fs');
const path = require('path');
const DIR = path.join(__dirname, '..', 'app', 'out', 'renderer', 'assets');

function patch(file, edits) {
  const F = path.join(DIR, file); let s = fs.readFileSync(F, 'utf8');
  for (const [n, a, b] of edits) {
    const c = s.split(a).length - 1;
    if (c !== 1) { console.error(`KHÔNG KHỚP (${c}) — ${file}: ${n}. Không ghi gì.`); process.exit(1); }
    s = s.replace(a, () => b); console.log(`  ✓ ${file}: ${n}`);
  }
  return () => { const bak = F + '.bak_before_project_savedir'; if (!fs.existsSync(bak)) fs.copyFileSync(F, bak); fs.writeFileSync(F, s, 'utf8'); };
}
const G = 'window.localStorage.getItem("aiforge_auto_download_video_dir")';

const w1 = patch('VideoStudio-frcr8V6s.js', [
  ['MergeModal nhận thư mục riêng của dự án',
    'const fn=({isOpen:t,onClose:s,initialAssetIds:n,allowedAssetIds:scopeIds})=>{',
    'const fn=({isOpen:t,onClose:s,initialAssetIds:n,allowedAssetIds:scopeIds,saveDirectory:projSaveDir,onSaveDirectoryChange:onProjSaveDir})=>{'],
  ['thư mục ban đầu = thư mục của dự án',
    '[exportSaveDir,setExportSaveDir]=l.useState(()=>{try{return ' + G + '||""}catch{return""}})',
    '[exportSaveDir,setExportSaveDir]=l.useState(()=>{try{if(typeof projSaveDir==="string"&&projSaveDir)return projSaveDir;return ' + G + '||""}catch{return""}})'],
  ['mở hộp xuất: lấy thư mục của dự án',
    'const d=' + G + '||' + G + '||autoDlVidDir||"";setExportSaveDir(d)',
    'const d=(typeof projSaveDir==="string"&&projSaveDir)||' + G + '||' + G + '||autoDlVidDir||"";setExportSaveDir(d)'],
  ['chọn thư mục: lưu vào dự án, không ghi đè thư mục chung',
    'if(dir){setExportSaveDir(dir);try{setAutoDlVidDir(dir);',
    'if(dir){setExportSaveDir(dir);if(typeof onProjSaveDir==="function"){try{onProjSaveDir(dir)}catch(_){}return}try{setAutoDlVidDir(dir);'],
]);
const w2 = patch('StoryScriptStudio.js', [
  ['mở Biên tập video kèm thư mục lưu của dự án',
    '      allowedAssetIds: mergeEditorAssetIds,\n      onClose: () => setMergeEditorAssetIds(null)',
    '      allowedAssetIds: mergeEditorAssetIds,\n      saveDirectory: currentProject?.saveDirectory || "",\n      onSaveDirectoryChange: dir => { if (currentProject?.id) updateProject(currentProject.id, { saveDirectory: dir }); },\n      onClose: () => setMergeEditorAssetIds(null)'],
]);
w1(); w2();
console.log('Xong. Bản gốc: *.bak_before_project_savedir');
