const fs = require('fs');
const content = fs.readFileSync('app/out/main/index.js', 'utf8');
const matches = content.match(/providerId\s*===?\s*["'][^"']+["']/g) || [];
console.log(Array.from(new Set(matches)));
