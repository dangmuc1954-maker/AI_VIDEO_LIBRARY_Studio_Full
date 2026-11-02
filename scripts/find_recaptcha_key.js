fetch('https://flow.google.com/')
  .then(r => r.text())
  .then(t => {
    // search for 6L
    const matches = [...t.matchAll(/6L[a-zA-Z0-9_-]{38}/g)];
    console.log('Found recaptcha keys:', matches.map(m => m[0]));
    // search for recaptcha
    const rcIdx = t.indexOf('recaptcha');
    console.log('Recaptcha index:', rcIdx);
    if (rcIdx !== -1) {
      console.log('Around recaptcha:', t.slice(Math.max(0, rcIdx - 50), rcIdx + 200));
    }
  })
  .catch(e => console.error(e));
