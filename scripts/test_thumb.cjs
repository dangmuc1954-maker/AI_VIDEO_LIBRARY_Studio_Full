const https = require('https');
const fs = require('fs');

const url = 'https://aitoolforge.shop/v1/workflow-store/products/2f0f0fed-b25f-4970-af89-1a2d0a05423c/thumbnail?v=1789572248837';

console.log('Testing thumbnail fetch:', url);
https.get(url, res => {
  console.log('Thumbnail status:', res.statusCode);
  console.log('Headers:', res.headers['content-type'], res.headers['content-length']);
  if (res.statusCode === 200) {
    const stream = fs.createWriteStream('scripts/test_thumb.jpg');
    res.pipe(stream);
    stream.on('finish', () => {
      console.log('Thumbnail saved! Size:', fs.statSync('scripts/test_thumb.jpg').size);
    });
  }
});
