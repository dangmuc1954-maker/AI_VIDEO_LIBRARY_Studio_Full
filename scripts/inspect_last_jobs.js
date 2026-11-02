const fs = require('fs');
const path = require('path');

const file = path.join(process.env.APPDATA, 'AI_VIDEO_LIBRARY_DATA/queue-state.json');
const q = JSON.parse(fs.readFileSync(file, 'utf8'));

const jobs = q.jobs || [];
const lastJobs = jobs.slice(-5);
for (const j of lastJobs) {
  console.log({
    id: j.id,
    type: j.type,
    providerId: j.providerId,
    accountId: j.accountId,
    status: j.status,
    error: j.error,
    payload: j.payload
  });
}
