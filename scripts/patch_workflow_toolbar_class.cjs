/*
 * Tris 12/11/2026: giao diện thanh công cụ dọc của Workflow theo mẫu (chỉ giao diện).
 * Chỉ THÊM tên lớp CSS (workflow-left-toolbar, wf-tb-add, wf-tb-run) để file workflow_clean_theme.css tô màu.
 * Không đổi hành vi nút nào.
 */
const fs = require('fs');
const path = require('path');
const F = path.join(__dirname, '..', 'app', 'out', 'renderer', 'assets', 'WorkflowEditor-LHGC9K3C.js');
let s = fs.readFileSync(F, 'utf8');
if (s.includes('workflow-left-toolbar')) { console.error('Đã vá trước đó — dừng.'); process.exit(1); }
const edits = [
  ['thanh công cụ', 'className:"absolute left-6 top-6 bg-[#130f24f7] border border-border-secondary rounded-xl p-1.5 flex flex-col gap-1.5', 'className:"workflow-left-toolbar absolute left-6 top-6 bg-[#130f24f7] border border-border-secondary rounded-xl p-1.5 flex flex-col gap-1.5'],
  ['nút thêm node', 't.jsx("button",{onClick:l,className:"w-9 h-9 rounded-lg flex items-center justify-center text-text-secondary hover:text-text-primary hover:bg-bg-hover transition-colors",title:m("workflow.toolbarAddNode")', 't.jsx("button",{onClick:l,className:"wf-tb-add w-9 h-9 rounded-lg flex items-center justify-center text-text-secondary hover:text-text-primary hover:bg-bg-hover transition-colors",title:m("workflow.toolbarAddNode")'],
  ['nút chạy', 't.jsx("button",{onClick:i,className:`w-9 h-9 rounded-lg flex items-center justify-center transition-colors ${o?', 't.jsx("button",{onClick:i,className:`wf-tb-run ${o?"is-running":""} w-9 h-9 rounded-lg flex items-center justify-center transition-colors ${o?'],
];
for (const [n, a, b] of edits) {
  const c = s.split(a).length - 1;
  if (c !== 1) { console.error(`KHÔNG KHỚP (${c}) — ${n}. Không ghi.`); process.exit(1); }
  s = s.replace(a, () => b); console.log('  ✓ ' + n);
}
fs.writeFileSync(F, s, 'utf8');
