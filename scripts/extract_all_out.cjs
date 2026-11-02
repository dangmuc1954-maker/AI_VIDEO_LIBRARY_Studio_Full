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

function extractFile(relPath, targetDest) {
  const parts = relPath.split('/');
  let cur = header;
  for (const part of parts) {
    if (!cur.files || !cur.files[part]) {
      throw new Error(`Part ${part} not found in ${relPath}`);
    }
    cur = cur.files[part];
  }
  const offset = baseDataOffset + parseInt(cur.offset, 10);
  const size = cur.size;
  const dir = path.dirname(targetDest);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  const buf = Buffer.alloc(size);
  fs.readSync(fd, buf, 0, size, offset);
  fs.writeFileSync(targetDest, buf);
}

function listFiles(node, prefix = '') {
  let res = [];
  if (node.files) {
    for (const k of Object.keys(node.files)) {
      res.push(...listFiles(node.files[k], prefix ? prefix + '/' + k : k));
    }
  } else {
    res.push(prefix);
  }
  return res;
}

const allFiles = listFiles(header);
const outFiles = allFiles.filter(f => f.startsWith('out/'));
const destBase = path.join(__dirname, '..', 'extracted_v101_out');

console.log(`Extracting ${outFiles.length} files to ${destBase}...`);
for (const f of outFiles) {
  extractFile(f, path.join(destBase, f));
}
fs.closeSync(fd);
console.log('All 93 files extracted successfully!');
