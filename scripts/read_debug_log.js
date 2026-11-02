const fs = require('fs');
const path = require('path');

const logFile = path.resolve(__dirname, '../flow_rpc_debug.log');
if (fs.existsSync(logFile)) {
  const content = fs.readFileSync(logFile, 'utf8');
  console.log('Log length:', content.length);
  const lines = content.split('\n\n');
  console.log('Last 5 entries:');
  for (const entry of lines.slice(-6)) {
    console.log(entry);
    console.log('------------------');
  }
} else {
  console.log('No flow_rpc_debug.log');
}
