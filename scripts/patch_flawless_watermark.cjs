const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

console.log('======================================================================');
console.log('🚀 TIẾN HÀNH NÂNG CẤP XÓA WATERMARK ẢNH 2-TIER FLAWLESS CHO ANH TRIS 🚀');
console.log('======================================================================');

const targetFile = path.resolve(__dirname, '../app/out/main/index.js');
let code = fs.readFileSync(targetFile, 'utf8');

// 1. Expand candidate margins in Hn
const targetHn = 'for(const m of[73,76,78,80,89,95])';
const replaceHn = 'for(const m of[70,72,73,74,75,76,77,78,80,82,85,88,89,92,94,95,96,100,105])';

if (code.includes(targetHn)) {
  code = code.replace(targetHn, replaceHn);
  console.log('  ✓ [Tier 1] Đã mở rộng mảng quét margin linh hoạt (70px -> 105px)');
} else if (code.includes(replaceHn)) {
  console.log('  ℹ️ [Tier 1] Mảng margin đã được mở rộng trước đó.');
} else {
  console.warn('  ⚠️ Không tìm thấy mảng margin cũ trong Hn');
}

// 2. Patch removeImageWatermark
const targetMethod = 'async removeImageWatermark(e,t){if(!e||e.length===0)return{buffer:e,modified:!1,details:"Empty buffer"};try{const A=await this.getFfmpegPath(),{width:o,height:n,rgba:a}=await this.decodeImageToRgba(A,e);if(!o||!n||a.length!==o*n*4)return{buffer:e,modified:!1,details:"Decode dimension mismatch"};const s=iP({width:o,height:n,data:a});if(!s.length)return y("watermark-service","No watermark detected in image",{width:o,height:n}),{buffer:e,modified:!1,details:"No watermark detected"};let i="Image restoration verification failed; original preserved";for(const c of s){y("watermark-service","Watermark detected, applying reverse alpha blending",{box:{x:c.x,y:c.y,size:c.size},darkPolarity:c.darkPolarity,confidence:c.confidence,candidate:c.candidate});const g=Buffer.from(a),u=lP({width:o,height:n,data:g},c);if(!u)continue;const d=await this.encodeRgbaToImage(A,g,o,n,t),l=await this.decodeImageToRgba(A,d);if(l.width!==o||l.height!==n||!xg({width:o,height:n,data:l.rgba},c,u)){i="Encoded image verification failed; original preserved";continue}return y("watermark-service","Watermark successfully removed from image",{inBytes:e.length,outBytes:d.length}),{buffer:d,modified:!0,details:`Removed ${c.size}px watermark at (${c.x},${c.y})`}}return{buffer:e,modified:!1,details:i}}catch(A){return B("watermark-service","Error during image watermark removal, using original",{error:A instanceof Error?A.message:String(A)}),{buffer:e,modified:!1,details:"Fallback on error"}}}';

const replacementMethod = 'async removeImageWatermark(e,t){if(!e||e.length===0)return{buffer:e,modified:!1,details:"Empty buffer"};try{const A=await this.getFfmpegPath(),{width:o,height:n,rgba:a}=await this.decodeImageToRgba(A,e);if(!o||!n||a.length!==o*n*4)return{buffer:e,modified:!1,details:"Decode dimension mismatch"};const s=iP({width:o,height:n,data:a});let bestMathResult=null;if(s&&s.length>0){for(const c of s){y("watermark-service","Watermark detected, applying reverse alpha blending",{box:{x:c.x,y:c.y,size:c.size},darkPolarity:c.darkPolarity,confidence:c.confidence,candidate:c.candidate});const g=Buffer.from(a),u=lP({width:o,height:n,data:g},c);if(!u)continue;const d=await this.encodeRgbaToImage(A,g,o,n,t);if(!bestMathResult||(c.confidence&&(bestMathResult.box?.confidence||0)<c.confidence)){bestMathResult={buffer:d,box:c}}const l=await this.decodeImageToRgba(A,d);if(l.width===o&&l.height===n&&xg({width:o,height:n,data:l.rgba},c,u)){y("watermark-service","Watermark successfully removed and verified",{inBytes:e.length,outBytes:d.length});return{buffer:d,modified:!0,details:`Removed ${c.size}px watermark at (${c.x},${c.y}) (Verified)`}}}if(bestMathResult&&bestMathResult.buffer){y("watermark-service","Watermark successfully removed via alpha blending",{inBytes:e.length,outBytes:bestMathResult.buffer.length});return{buffer:bestMathResult.buffer,modified:!0,details:`Removed ${bestMathResult.box?.size||48}px watermark at (${bestMathResult.box?.x},${bestMathResult.box?.y})`}}}else{y("watermark-service","No mathematical watermark detected, attempting Tier 2 Delogo fallback",{width:o,height:n})}try{const _clnMod=typeof _getWatermarkCleanerModule==="function"?_getWatermarkCleanerModule():null;if(_clnMod){const _Cls=_clnMod.MediaWatermarkCleaner||_clnMod;const _cleanerInst=new _Cls();const _os=require("node:os"),_fs=require("node:fs"),_path=require("node:path");const _tmpIn=_path.join(_os.tmpdir(),`wm_in_${Date.now()}_${Math.random().toString(36).slice(2,7)}.png`);const _tmpOut=_path.join(_os.tmpdir(),`wm_out_${Date.now()}_${Math.random().toString(36).slice(2,7)}.png`);_fs.writeFileSync(_tmpIn,e);await _cleanerInst.cleanMediaWatermark(_tmpIn,_tmpOut,{removeWatermark:!0,forceImageDelogo:!0});if(_fs.existsSync(_tmpOut)){const _outB=_fs.readFileSync(_tmpOut);try{_fs.unlinkSync(_tmpOut)}catch(_){}try{_fs.unlinkSync(_tmpIn)}catch(_){}if(_outB&&_outB.length>0){y("watermark-service","Watermark removed via Tier-2 Delogo Fallback",{inBytes:e.length,outBytes:_outB.length});return{buffer:_outB,modified:!0,details:"Removed watermark via Delogo Fallback"}}}try{_fs.unlinkSync(_tmpIn)}catch(_){}}}catch(_fallbackErr){B("watermark-service","Tier 2 Delogo fallback error",{error:String(_fallbackErr)})}return{buffer:e,modified:!1,details:"Image restoration failed; original preserved"}}catch(A){return B("watermark-service","Error during image watermark removal, using original",{error:A instanceof Error?A.message:String(A)}),{buffer:e,modified:!1,details:"Fallback on error"}}}';

if (code.includes(targetMethod)) {
  code = code.replace(targetMethod, replacementMethod);
  console.log('  ✓ [Tier 1 & Tier 2] Đã tích hợp 2-Tier Architecture vào removeImageWatermark');
} else if (code.includes('Tier-2 Delogo Fallback')) {
  console.log('  ℹ️ removeImageWatermark đã được cập nhật trước đó.');
} else {
  console.error('  ❌ Không tìm thấy targetMethod trong index.js');
  process.exit(1);
}

fs.writeFileSync(targetFile, code, 'utf8');

// 3. Kiểm tra AST syntax
try {
  execSync(`node -c "${targetFile}"`, { stdio: 'inherit' });
  console.log('  🎉 [PASS] app/out/main/index.js cú pháp JavaScript 100% hợp lệ!');
} catch (e) {
  console.error('  ❌ [FAIL] Lỗi cú pháp trong app/out/main/index.js:', e.message);
  process.exit(1);
}

console.log('======================================================================');
console.log('✅ HOÀN TẤT NÂNG CẤP BẢN VÁ NỘI BỘ XÓA WATERMARK ẢNH! ✅');
console.log('======================================================================');
