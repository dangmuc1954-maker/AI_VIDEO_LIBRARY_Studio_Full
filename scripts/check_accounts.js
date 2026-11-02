const fs = require('fs');
const path = require('path');

const file = path.join(process.env.APPDATA, 'AI_VIDEO_LIBRARY_DATA/accounts.json');
if (fs.existsSync(file)) {
  const data = JSON.parse(fs.readFileSync(file, 'utf8'));
  console.log('Accounts:');
  const arr = Array.isArray(data) ? data : data.accounts || [];
  for (const a of arr) {
    console.log({
      id: a.id,
      providerId: a.providerId,
      name: a.name,
      email: a.email,
      status: a.status
    });
  }
} else {
  console.log('No accounts.json found');
}
