const fs = require('fs');
const content = fs.readFileSync('parent_app_main_index.js', 'utf8');

const slice = content.slice(201000, 206000);
console.log(slice);
