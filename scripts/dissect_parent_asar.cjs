const fs = require('fs');
const path = require('path');

const asarPath = 'C:\\Users\\admin\\AppData\\Local\\Programs\\aiforge-studio\\resources\\app.asar';
const fd = fs.openSync(asarPath, 'r');

const headerBuf = Buffer.alloc(16);
fs.readSync(fd, headerBuf, 0, 16, 0);
const jsonLen = headerBuf.readUInt32LE(12);

const jsonBuf = Buffer.alloc(jsonLen);
fs.readSync(fd, jsonBuf, 0, jsonLen, 16);
const header = JSON.parse(jsonBuf.toString('utf-8'));
const baseDataOffset = 16 + jsonLen;

const allFiles = [];
function listFiles(node, prefix = '') {
  if (node.files) {
    for (const key of Object.keys(node.files)) {
      listFiles(node.files[key], prefix ? `${prefix}/${key}` : key);
    }
  } else {
    allFiles.push({ path: prefix, size: node.size, offset: node.offset });
  }
}
listFiles(header);

console.log('Total files in parent app.asar:', allFiles.length);

const watermarkFiles = allFiles.filter(f => f.path.toLowerCase().includes('watermark') || f.path.toLowerCase().includes('logo') || f.path.toLowerCase().includes('cleaner') || f.path.toLowerCase().includes('sharp') || f.path.toLowerCase().includes('ffmpeg'));
console.log('Relevant files:', watermarkFiles);

// Also list all files in out/
const outFiles = allFiles.filter(f => f.path.startsWith('out/'));
console.log('Out files count:', outFiles.length);
outFiles.forEach(f => console.log(' ', f.path, f.size));

fs.closeSync(fd);
