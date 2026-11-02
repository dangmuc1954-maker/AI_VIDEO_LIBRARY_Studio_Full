const fs = require('fs');
const content = fs.readFileSync('parent_app_main_index.js', 'utf8');

const slice = content.slice(451000, 465000);
fs.writeFileSync('parent_executeRpc_slice.js', slice);
console.log('Saved slice of executeRpc, length:', slice.length);
