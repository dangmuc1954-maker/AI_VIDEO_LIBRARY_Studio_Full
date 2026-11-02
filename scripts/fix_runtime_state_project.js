const fs = require('fs');
const path = require('path');

const file = path.join(process.env.APPDATA, 'AI_VIDEO_LIBRARY_DATA/google-flow-runtime-state.json');
const data = JSON.parse(fs.readFileSync(file, 'utf8'));

console.log('Current state:');
console.log(JSON.stringify(data, null, 2));

// Update banana account with active projects of phanhongha005@gmail.com
for (const acc of data.accounts) {
  if (acc.accountId === 'banana-4fb85a54-8c80-48db-913a-fb8983f4c3ea') {
    acc.currentProjectId = '75efb461-8314-46d6-9771-d8a648053ba7';
    acc.projectIds = [
      '75efb461-8314-46d6-9771-d8a648053ba7',
      '748cb264-f806-4e2f-a7eb-f239644c0b01',
      '3086ee90-0b6d-4ec2-8280-4b7bbb7bac44',
      'a120e68e-5a02-4901-9da3-ba80ee3a547b'
    ];
    acc.invalidProjectIds = acc.invalidProjectIds || [];
    if (!acc.invalidProjectIds.includes('cda62c70-a0cd-4a8e-a27b-89db2e9a5dfb')) {
      acc.invalidProjectIds.push('cda62c70-a0cd-4a8e-a27b-89db2e9a5dfb');
    }
  }
}

fs.writeFileSync(file, JSON.stringify(data, null, 2), 'utf8');
console.log('\nUpdated state:');
console.log(JSON.stringify(data, null, 2));
