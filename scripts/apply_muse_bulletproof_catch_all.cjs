const fs = require('fs');
const path = require('path');

console.log('=== [MASTER PATCH] NÂNG CẤP BỘ BẮT VIDEO MUSE AI CHỐNG MASCOT 100% CHO MÁY KHÁCH ===');

const targetFile = path.resolve(__dirname, '../app/out/main/index.js');
let code = fs.readFileSync(targetFile, 'utf8');

const startMarker = 'class MuseVideoRuntime {';
const endMarker = 'class Ys{';

const startIdx = code.indexOf(startMarker);
const endIdx = code.indexOf(endMarker, startIdx);

if (startIdx === -1 || endIdx === -1) {
  console.error('❌ Không tìm thấy vị trí class MuseVideoRuntime trong app/out/main/index.js');
  process.exit(1);
}

const cleanRuntimeFile = path.resolve(__dirname, 'muse_runtime_clean.js');
const newRuntimeCode = fs.readFileSync(cleanRuntimeFile, 'utf8').trim() + '\n';

const updatedCode = code.slice(0, startIdx) + newRuntimeCode + code.slice(endIdx);
fs.writeFileSync(targetFile, updatedCode, 'utf8');

console.log('✅ ĐÃ NÂNG CẤP THÀNH CÔNG CLASS MuseVideoRuntime TRONG app/out/main/index.js!');
