const https = require('https');

https.get('https://earthglobal-app.onrender.com', (r) => {
  let d = '';
  r.on('data', (c) => (d += c));
  r.on('end', () => {
    // Check which API URL is baked into the JS bundle
    const matches = d.match(/earthglobal[^"']*onrender[^"']*/g);
    console.log('API URLs in HTML:', matches);

    // Also check the JS files
    const jsFiles = d.match(/assets\/index-[^"]*\.js/g);
    if (jsFiles && jsFiles.length > 0) {
      console.log('Checking JS bundle:', jsFiles[0]);
      https.get(`https://earthglobal-app.onrender.com/${jsFiles[0]}`, (r2) => {
        let js = '';
        r2.on('data', (c) => (js += c));
        r2.on('end', () => {
          const apiMatches = js.match(/https:\/\/earthglobal[^"']*onrender[^"']*/g);
          console.log('API URLs in JS bundle:', apiMatches);
        });
      }).on('error', (e) => console.log('ERR', e.message));
    }
  });
}).on('error', (e) => console.log('ERR', e.message));
