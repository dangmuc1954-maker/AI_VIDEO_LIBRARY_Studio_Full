const fs = require('fs');
const path = require('path');

const appData = path.join(process.env.APPDATA, 'AI_VIDEO_LIBRARY_DATA');
const sessionsFile = path.join(appData, 'browser-sessions.json');
const data = JSON.parse(fs.readFileSync(sessionsFile, 'utf8'));
const sessions = data.sessions || [];

function findBestSourceSession(targetAccountId) {
  const target = sessions.find(s => s.accountId === targetAccountId);
  console.log('Target session:', target ? {
    id: target.accountId,
    provider: target.providerId,
    name: target.accountName,
    email: target.accountEmail,
    cookieCount: target.cookieCount,
    partition: target.partition
  } : 'NOT FOUND');

  const candidates = sessions.filter(s => {
    if (s.accountId === targetAccountId) return false;
    if (s.providerId !== 'veo3' && s.providerId !== 'banana') return false;
    if ((s.cookieCount || 0) < 15) return false;
    return true;
  });

  console.log(`Found ${candidates.length} candidate sessions with >= 15 cookies:`);
  for (const c of candidates) {
    console.log({
      id: c.accountId,
      provider: c.providerId,
      name: c.accountName,
      email: c.accountEmail,
      cookies: c.cookieCount,
      partition: c.partition
    });
  }

  // Priority 1: Exact email match
  if (target?.accountEmail) {
    const match = candidates.find(c => c.accountEmail && c.accountEmail.toLowerCase() === target.accountEmail.toLowerCase());
    if (match) {
      console.log('==> Selected by EMAIL match:', match.accountId);
      return match;
    }
  }

  // Priority 2: Account name match
  if (target?.accountName) {
    const match = candidates.find(c => c.accountName && c.accountName.toLowerCase() === target.accountName.toLowerCase());
    if (match) {
      console.log('==> Selected by NAME match:', match.accountId);
      return match;
    }
  }

  // Priority 3: Any active session with highest cookie count
  candidates.sort((a, b) => (b.cookieCount || 0) - (a.cookieCount || 0));
  if (candidates[0]) {
    console.log('==> Selected highest cookie count:', candidates[0].accountId);
    return candidates[0];
  }

  return null;
}

findBestSourceSession('banana-4fb85a54-8c80-48db-913a-fb8983f4c3ea');
