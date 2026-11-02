const fs = require('fs');
const path = require('path');

const p1 = 'C:\\Users\\admin\\AppData\\Local\\Programs\\AI VIDEO LIBRARY\\flow_rpc_debug.log';
if (fs.existsSync(p1)) {
  console.log('Found log in Programs:');
  const content = fs.readFileSync(p1, 'utf8');
  console.log('Size:', content.length);
  const lines = content.split('\n\n').filter(Boolean);
  for (const entry of lines.slice(-5)) {
    console.log(entry);
    console.log('------------------');
  }
} else {
  console.log('No log at', p1);
}
