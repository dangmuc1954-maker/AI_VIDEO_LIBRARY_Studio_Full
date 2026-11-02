const fs = require('fs');
const path = require('path');
const p = path.join(process.env.LOCALAPPDATA, 'Programs', 'AI VIDEO LIBRARY', 'resources', 'app', 'out', 'main', 'google_flow_native_transport.cjs');
if (fs.existsSync(p)) {
  const c = fs.readFileSync(p, 'utf8');
  console.log('Installed transport length:', c.length);
  const target = 'cleanUrl(c[11])';
  console.log('Has cleanUrl(c[11]):', c.includes(target));
  const m = c.match(/https:\\\/\\\/flow-content\.google\\\/video\\\/[^"'\s]+/);
  console.log('Match regex in installed:', !!m);
  const m2 = c.match(/https:\/\/flow-content\.google\/video\/\[\^\s\"\'\\\\\]\+/);
  console.log('Has old regex in installed:', !!m2);
} else {
  console.log('Installed file does NOT exist!');
}
