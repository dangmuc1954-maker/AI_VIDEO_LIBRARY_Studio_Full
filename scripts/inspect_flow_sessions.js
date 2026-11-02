const fs = require('fs');
const path = require('path');

const sessionsFile = path.join(process.env.APPDATA, 'AI_VIDEO_LIBRARY_DATA/browser-sessions.json');
const data = JSON.parse(fs.readFileSync(sessionsFile, 'utf8'));

for (const s of data.sessions) {
  if (s.accountId === 'banana-4fb85a54-8c80-48db-913a-fb8983f4c3ea' || s.providerId === 'banana' || s.providerId === 'veo3') {
    console.log({
      accountId: s.accountId,
      providerId: s.providerId,
      accountName: s.accountName,
      authStatus: s.authStatus,
      viewState: s.viewState,
      cookieCount: s.cookieCount,
      partition: s.partition
    });
  }
}
