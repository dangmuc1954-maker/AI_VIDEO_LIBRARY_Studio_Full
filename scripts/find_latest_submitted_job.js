const fs = require('fs');
const path = require('path');

const appData = process.env.APPDATA || 'C:/Users/admin/AppData/Roaming';
const dataDir = path.join(appData, 'AI_VIDEO_LIBRARY_DATA');
const qPath = path.join(dataDir, 'queue-state.json');

const qData = JSON.parse(fs.readFileSync(qPath, 'utf8'));
const jobs = qData.jobs || [];

const found = jobs.filter(j => 
  JSON.stringify(j).includes('1a7501d4-ac44-408b-8c1c-70204f549c5d') ||
  JSON.stringify(j).includes('a120e68e-5a02-4901-9da3-ba80ee3a547b')
);

console.log('FOUND LATEST RUNNING JOB:', found.length);
if (found.length > 0) {
  console.log(JSON.stringify(found[0], null, 2));
} else {
  console.log('Latest job not matched by ID, let us inspect last 5 jobs:');
  for (const j of jobs.slice(-5)) {
    console.log(j.id, j.title, j.status, j.progress, j.statusText, j.updatedAt);
  }
}
