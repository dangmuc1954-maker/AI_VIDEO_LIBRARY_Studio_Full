fetch('https://flow.google.com/')
  .then(r => r.text())
  .then(t => {
    // find WIZ_global_data
    const m = t.match(/window\.WIZ_global_data\s*=\s*(\{.*?\});/s);
    if (m) {
      try {
        const data = JSON.parse(m[1]);
        console.log('WIZ_global_data keys:', Object.keys(data));
        console.log('cfb2h:', data.cfb2h);
        console.log('SNlM0e:', data.SNlM0e);
        console.log('FdrFJe:', data.FdrFJe);
      } catch (e) {
        console.log('Match found but json parse failed, match snippet:', m[1].slice(0, 300));
      }
    } else {
      console.log('WIZ_global_data regex not matched');
      // search for recaptcha
      const rc = t.match(/recaptcha\/enterprise\.js\?render=([^"&]+)/);
      console.log('Recaptcha siteKey in html:', rc ? rc[1] : 'not found');
    }
  })
  .catch(e => console.error(e));
