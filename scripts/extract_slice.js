const fs = require('fs');
const content = fs.readFileSync('parent_app_main_index.js', 'utf8');

// Print from char 140000 to 160000
const slice = content.slice(142000, 160000);
fs.writeFileSync('parent_transport_slice.js', slice);
console.log('Saved slice of length:', slice.length);
