const fs = require('fs');
const c = fs.readFileSync('app/out/main/index.js', 'utf8');

console.log('=== cacheQueueAsset & downloadRemoteAsset ===');
console.log(c.substring(789500, 793500));
