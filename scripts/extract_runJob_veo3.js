const fs = require('fs');
const content = fs.readFileSync('parent_app_main_index.js', 'utf8');

const slice = content.slice(441500, 452000);
fs.writeFileSync('parent_runJob_veo3.js', slice);
console.log('Saved slice of length:', slice.length);
