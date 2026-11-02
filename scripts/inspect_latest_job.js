const fs = require('fs');
const path = require('path');

const appData = process.env.APPDATA || 'C:/Users/admin/AppData/Roaming';
const dataDir = path.join(appData, 'AI_VIDEO_LIBRARY_DATA');

console.log('DATA DIR:', dataDir);

try {
  const qPath = path.join(dataDir, 'queue-state.json');
  if (fs.existsSync(qPath)) {
    const qData = JSON.parse(fs.readFileSync(qPath, 'utf8'));
    const jobs = qData.jobs || [];
    console.log(`TOTAL JOBS: ${jobs.length}`);
    const latestJobs = jobs.slice(-3);
    for (const j of latestJobs) {
      console.log('JOB:', {
        id: j.id,
        title: j.title,
        status: j.status,
        progress: j.progress,
        statusText: j.statusText,
        resultAssets: j.result?.assets
      });
    }
  }
} catch (e) {
  console.error('Error reading queue-state:', e.message);
}

try {
  const aPath = path.join(dataDir, 'asset-state.json');
  if (fs.existsSync(aPath)) {
    const aData = JSON.parse(fs.readFileSync(aPath, 'utf8'));
    const assets = aData.assets || [];
    console.log(`TOTAL ASSETS: ${assets.length}`);
    const latestAssets = assets.slice(0, 3);
    for (const a of latestAssets) {
      console.log('ASSET:', {
        id: a.id,
        name: a.name,
        type: a.type,
        url: a.url,
        remoteUrl: a.remoteUrl,
        localPath: a.localPath,
        thumbnailPath: a.thumbnailPath,
        thumbnailUrl: a.thumbnailUrl,
        localExists: a.localPath ? fs.existsSync(a.localPath) : false
      });
    }
  }
} catch (e) {
  console.error('Error reading asset-state:', e.message);
}
