const path = require('path');
const fs = require('fs');

function getAppDataDir() {
  return process.env.APPDATA ? path.join(process.env.APPDATA, 'AI_VIDEO_LIBRARY_DATA') : '';
}

function findBestSourceFlowSession(targetAccountId, targetEmail, targetName) {
  try {
    const sessionsFile = path.join(getAppDataDir(), 'browser-sessions.json');
    if (!fs.existsSync(sessionsFile)) return null;
    const data = JSON.parse(fs.readFileSync(sessionsFile, 'utf8'));
    const sessions = data.sessions || [];

    const candidates = sessions.filter(s => {
      if (s.accountId === targetAccountId) return false;
      if (s.providerId !== 'veo3' && s.providerId !== 'banana') return false;
      if ((s.cookieCount || 0) < 15) return false;
      return true;
    });

    if (candidates.length === 0) return null;

    if (targetEmail) {
      const match = candidates.find(c => c.accountEmail && c.accountEmail.toLowerCase() === targetEmail.toLowerCase());
      if (match) return match;
    }

    if (targetName) {
      const match = candidates.find(c => c.accountName && c.accountName.toLowerCase() === targetName.toLowerCase());
      if (match) return match;
    }

    candidates.sort((a, b) => (b.cookieCount || 0) - (a.cookieCount || 0));
    return candidates[0] || null;
  } catch (err) {
    return null;
  }
}

console.log('Test 1 (Banana Ha Phan):', findBestSourceFlowSession('banana-4fb85a54-8c80-48db-913a-fb8983f4c3ea', 'phanhongha005@gmail.com', 'Hà Phan')?.accountId);
console.log('Test 2 (Empty email, only name):', findBestSourceFlowSession('banana-dummy', null, 'Hà Phan')?.accountId);
console.log('Test 3 (Unknown account, fallback to most active):', findBestSourceFlowSession('banana-unknown', null, null)?.accountId);
