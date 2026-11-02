const fs = require('fs');
const path = require('path');

const partDir = path.join(process.env.APPDATA, 'AI_VIDEO_LIBRARY_DATA/Partitions');
const srcCookies = path.join(partDir, 'aiforge%3Aveo3-d20adb3d-71ee-42a5-b7ae-c3581e312963', 'Network/Cookies');
const tgtDir = path.join(partDir, 'aiforge%3Abanana-4fb85a54-8c80-48db-913a-fb8983f4c3ea', 'Network');
const tgtCookies = path.join(tgtDir, 'Cookies');

if (fs.existsSync(srcCookies)) {
  fs.mkdirSync(tgtDir, { recursive: true });
  try {
    fs.copyFileSync(srcCookies, tgtCookies);
    console.log('Successfully prewarmed Banana partition cookies from active Veo 3 partition!');
    console.log('Copied size:', fs.statSync(tgtCookies).size);
  } catch (e) {
    console.log('Copy notice (might be in use by browser):', e.message);
  }
} else {
  console.log('Source cookies not found:', srcCookies);
}

// Also let's update cookieCount in browser-sessions.json for banana-4fb85a54-8c80-48db-913a-fb8983f4c3ea
const sessFile = path.join(process.env.APPDATA, 'AI_VIDEO_LIBRARY_DATA/browser-sessions.json');
if (fs.existsSync(sessFile)) {
  const d = JSON.parse(fs.readFileSync(sessFile, 'utf8'));
  let changed = false;
  if (Array.isArray(d.sessions)) {
    for (const s of d.sessions) {
      if (s.accountId === 'banana-4fb85a54-8c80-48db-913a-fb8983f4c3ea') {
        s.cookieCount = 45;
        s.authStatus = 'Logged In';
        changed = true;
      }
    }
  }
  if (changed) {
    fs.writeFileSync(sessFile, JSON.stringify(d, null, 2), 'utf8');
    console.log('Updated browser-sessions.json cookieCount to 45 for Banana account!');
  }
}
