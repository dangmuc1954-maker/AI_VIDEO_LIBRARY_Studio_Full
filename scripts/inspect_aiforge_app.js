const fs = require('fs');
const path = require('path');

const targetDir = 'C:/Users/admin/AppData/Local/Programs/aiforge-studio/resources';
if (fs.existsSync(targetDir)) {
  console.log('RESOURCES FILES:', fs.readdirSync(targetDir));
} else {
  console.log('RESOURCES DIR DOES NOT EXIST:', targetDir);
}
