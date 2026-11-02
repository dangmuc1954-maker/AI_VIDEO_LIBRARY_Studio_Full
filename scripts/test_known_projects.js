const path = require('path');
const fs = require('fs');

function getAppDataDir() {
  return path.join(process.env.APPDATA, 'AI_VIDEO_LIBRARY_DATA');
}

function getKnownProjectsForAccount(accountId, email) {
  try {
    const file = path.join(getAppDataDir(), 'google-flow-runtime-state.json');
    if (!fs.existsSync(file)) return [];
    const data = JSON.parse(fs.readFileSync(file, 'utf8'));
    const accounts = data.accounts || [];

    const acc = accounts.find(a => a.accountId === accountId);
    const result = [];

    // Projects from matching email first!
    if (email) {
      for (const a of accounts) {
        if (a.email && a.email.toLowerCase() === email.toLowerCase()) {
          if (a.currentProjectId && !result.includes(a.currentProjectId)) result.push(a.currentProjectId);
          if (Array.isArray(a.projectIds)) {
            for (const pid of a.projectIds) {
              if (pid && !result.includes(pid)) result.push(pid);
            }
          }
        }
      }
    }

    if (acc) {
      if (acc.currentProjectId && !result.includes(acc.currentProjectId)) result.push(acc.currentProjectId);
      if (Array.isArray(acc.projectIds)) {
        for (const pid of acc.projectIds) {
          if (pid && !result.includes(pid)) result.push(pid);
        }
      }
    }

    const invalidIds = new Set(acc?.invalidProjectIds || []);
    return result.filter(id => id && !invalidIds.has(id));
  } catch (e) {
    return [];
  }
}

console.log('Known projects for Banana account (phanhongha005@gmail.com):');
console.log(getKnownProjectsForAccount('banana-4fb85a54-8c80-48db-913a-fb8983f4c3ea', 'phanhongha005@gmail.com'));
