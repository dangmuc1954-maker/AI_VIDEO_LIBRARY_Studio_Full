const fs = require('fs');
const path = require('path');

const sessionsFile = path.join(process.env.APPDATA, 'AI_VIDEO_LIBRARY_DATA/browser-sessions.json');
const raw = fs.readFileSync(sessionsFile, 'utf8');
const data = JSON.parse(raw);

console.log('Keys of data:', Object.keys(data));
if (data.sessions) {
  for (const s of data.sessions) {
    console.log({
      id: s.id,
      providerId: s.providerId,
      name: s.name,
      partition: s.partition,
      cookieCount: s.cookieCount,
      lastUrl: s.lastUrl
    });
  }
} else {
  console.log('Raw sample:', raw.slice(0, 500));
}
