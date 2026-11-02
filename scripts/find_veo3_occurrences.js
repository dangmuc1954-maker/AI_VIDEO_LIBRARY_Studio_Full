const fs = require('fs');
const content = fs.readFileSync('app/out/main/index.js', 'utf8');
let idx = 0;
while ((idx = content.indexOf('"veo3"', idx + 1)) !== -1) {
  console.log('Idx:', idx, content.slice(Math.max(0, idx - 50), idx + 200));
}
