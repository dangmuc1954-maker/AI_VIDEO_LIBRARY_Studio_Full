/*
 * Tris 12/11/2026: hiệu ứng viền LED chạy vòng quanh node workflow khi node đang chạy (chỉ giao diện).
 * Chỉ THÊM lớp "wf-node-running" vào thẻ node khi e.status==="running"; màu/animation nằm trong workflow_clean_theme.css.
 */
const fs = require('fs');
const path = require('path');
const F = path.join(__dirname, '..', 'app', 'out', 'renderer', 'assets', 'WorkflowEditor-LHGC9K3C.js');
let s = fs.readFileSync(F, 'utf8');
if (s.includes('wf-node-running')) { console.error('Đã vá trước đó — dừng.'); process.exit(1); }
const A = 'className:`workflow-node-card nokey group/node relative';
const B = 'className:`workflow-node-card ${e.status==="running"?"wf-node-running":""} nokey group/node relative';
const c = s.split(A).length - 1;
if (c !== 1) { console.error(`KHÔNG KHỚP (${c}). Không ghi.`); process.exit(1); }
s = s.replace(A, () => B);
fs.writeFileSync(F, s, 'utf8');
console.log('  ✓ thẻ node có lớp wf-node-running khi đang chạy');
