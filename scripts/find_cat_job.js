const fs = require('fs');
const path = require('path');

const appData = process.env.APPDATA || 'C:/Users/admin/AppData/Roaming';
const dataDir = path.join(appData, 'AI_VIDEO_LIBRARY_DATA');
const qPath = path.join(dataDir, 'queue-state.json');

const qData = JSON.parse(fs.readFileSync(qPath, 'utf8'));
const jobs = qData.jobs || [];

const found = jobs.filter(j => j.title && j.title.includes('mèo'));
console.log('FOUND JOBS:', found.length);
for (const j of found) {
  console.log(JSON.stringify(j, null, 2));
}
