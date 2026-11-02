const fs = require('fs');
const path = require('path');

const logFile = 'C:\\Users\\admin\\AppData\\Local\\Programs\\AI VIDEO LIBRARY\\resources\\flow_rpc_debug.log';
if (fs.existsSync(logFile)) {
  const content = fs.readFileSync(logFile, 'utf8');
  const entries = content.split('\n\n').filter(Boolean);
  console.log('Total log entries:', entries.length);
  console.log('Last 3 entries:');
  for (const e of entries.slice(-3)) {
    console.log(e);
    console.log('----------------------------');
  }
} else {
  console.log('Log not found at', logFile);
}

const queueFile = path.join(process.env.APPDATA, 'AI_VIDEO_LIBRARY_DATA/queue-state.json');
if (fs.existsSync(queueFile)) {
  const q = JSON.parse(fs.readFileSync(queueFile, 'utf8'));
  const jobs = q.jobs || [];
  const latestImageJobs = jobs.filter(j => j.type === 'Image' || j.providerId === 'banana').slice(-3);
  console.log('\nLatest Image jobs:');
  for (const j of latestImageJobs) {
    console.log({
      id: j.id,
      title: j.title,
      accountId: j.accountId,
      account: j.account,
      status: j.status,
      error: j.error,
      providerErrorCode: j.providerErrorCode,
      payload: j.payload
    });
  }
}
