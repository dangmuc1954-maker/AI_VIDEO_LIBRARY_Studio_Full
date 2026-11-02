const fs = require('fs');

['app/out/main/google_flow_native_transport.cjs', 'app/out/main/index.cjs'].forEach(f => {
  if (fs.existsSync(f)) {
    const c = fs.readFileSync(f, 'utf8');
    console.log(f, 'length:', c.length);
    let idx = 0;
    while ((idx = c.indexOf('flow-content.google', idx)) !== -1) {
      console.log('  match at', idx, ':', c.substring(Math.max(0, idx - 50), idx + 100));
      idx += 19;
    }
  }
});
