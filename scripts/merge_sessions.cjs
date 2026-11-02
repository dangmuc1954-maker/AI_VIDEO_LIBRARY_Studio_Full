const fs = require('fs');
const path = require('path');

const appdata = process.env.APPDATA;
const targetPath = path.join(appdata, 'AI_VIDEO_LIBRARY_DATA', 'browser-sessions.json');
const srcPath = path.join(appdata, 'aiforge-studio', 'browser-sessions.json');

if (fs.existsSync(srcPath)) {
  const srcData = JSON.parse(fs.readFileSync(srcPath, 'utf8'));
  let targetData = { sessions: [] };
  if (fs.existsSync(targetPath)) {
    try {
      targetData = JSON.parse(fs.readFileSync(targetPath, 'utf8')) || { sessions: [] };
    } catch (_) {}
  }
  const sessionMap = new Map();
  for (const s of (targetData.sessions || [])) {
    if (s && s.accountId) sessionMap.set(s.accountId, s);
  }
  let added = 0;
  for (const s of (srcData.sessions || [])) {
    if (s && s.accountId && !sessionMap.has(s.accountId)) {
      sessionMap.set(s.accountId, s);
      added++;
    }
  }
  targetData.sessions = Array.from(sessionMap.values());
  fs.writeFileSync(targetPath, JSON.stringify(targetData, null, 2), 'utf8');
  console.log(`Merged ${added} new sessions from aiforge-studio into AI_VIDEO_LIBRARY_DATA. Total sessions now: ${targetData.sessions.length}`);
} else {
  console.log('Source browser-sessions.json not found in aiforge-studio');
}
