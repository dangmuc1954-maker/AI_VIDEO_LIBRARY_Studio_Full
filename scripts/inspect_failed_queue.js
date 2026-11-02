const fs = require('fs');

const path = process.env.APPDATA + '/AI_VIDEO_LIBRARY_DATA/queue-state.json';
const data = JSON.parse(fs.readFileSync(path, 'utf8'));
const jobs = data.jobs || data;

console.log('Total jobs in queue:', jobs.length);

// Find jobs with error or failed or challenge
const failed = jobs.filter(j => j.status === 'Failed' || (j.error && j.error.includes('xác minh')) || (j.providerErrorCode && j.providerErrorCode.includes('CHALLENGE')));
console.log('Failed / Challenge jobs:', failed.length);

if (failed.length > 0) {
  const latest = failed[failed.length - 1];
  console.log('Latest failed job:\n', JSON.stringify({
    id: latest.id,
    title: latest.title,
    provider: latest.provider,
    status: latest.status,
    error: latest.error,
    failureReason: latest.failureReason,
    providerErrorCode: latest.providerErrorCode,
    providerErrorDetails: latest.providerErrorDetails,
    createdAt: latest.createdAt,
    updatedAt: latest.updatedAt
  }, null, 2));
}

// Find any job created today (2026-10-24)
const today = jobs.filter(j => j.createdAt && j.createdAt.includes('2026-10-24'));
console.log('Jobs created today (2026-10-24):', today.length);
if (today.length > 0) {
  console.log('Last job today:\n', JSON.stringify(today[today.length - 1], null, 2));
}
