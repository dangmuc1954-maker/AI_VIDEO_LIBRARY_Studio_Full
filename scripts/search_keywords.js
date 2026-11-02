const fs = require('fs');

const content = fs.readFileSync('parent_app_main_index.js', 'utf8');

const keywords = ['veo', 'banana', 'google', 'recaptcha', 'flow', 'rpc', 'PUBLIC_ERROR', 'AiSandbox'];

for (const kw of keywords) {
  const re = new RegExp(kw, 'gi');
  const count = (content.match(re) || []).length;
  console.log(`Keyword "${kw}": ${count} occurrences`);
}
