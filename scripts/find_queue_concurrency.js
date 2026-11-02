const fs = require('fs');
const content = fs.readFileSync('app/out/main/index.js', 'utf8');

const regex = /status\s*===?\s*["']Queued["']/g;
let match;
while ((match = regex.exec(content)) !== null) {
  const start = Math.max(0, match.index - 250);
  const end = Math.min(content.length, match.index + 250);
  console.log('--- MATCH at ' + match.index + ' ---');
  console.log(content.slice(start, end));
}
