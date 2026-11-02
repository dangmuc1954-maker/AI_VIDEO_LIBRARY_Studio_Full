const fs = require('fs');
const path = require('path');

const file = path.join(process.env.APPDATA, 'AI_VIDEO_LIBRARY_DATA/google-flow-runtime-state.json');
console.log(fs.readFileSync(file, 'utf8'));
