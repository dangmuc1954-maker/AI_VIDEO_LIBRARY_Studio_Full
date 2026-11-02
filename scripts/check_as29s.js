const fs = require('fs');

const logPath = 'C:/Users/admin/AppData/Local/Programs/AI VIDEO LIBRARY/resources/flow_rpc_debug.log';
if (fs.existsSync(logPath)) {
  const content = fs.readFileSync(logPath, 'utf8');
  const as29sMatches = [...content.matchAll(/as29s/g)];
  console.log('as29s occurrences in log:', as29sMatches.length);
} else {
  console.log('Log file not found');
}
