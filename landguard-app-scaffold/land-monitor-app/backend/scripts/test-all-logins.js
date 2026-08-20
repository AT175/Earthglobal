const https = require('https');

function testLogin(email, password) {
  return new Promise((resolve) => {
    const body = JSON.stringify({ email, password });
    const options = {
      hostname: 'earthglobal.onrender.com',
      path: '/auth/login',
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(body) },
    };
    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => (data += chunk));
      res.on('end', () => {
        try {
          const json = JSON.parse(data);
          console.log(`${email}: Status ${res.statusCode} | Role: ${json.role} | Name: ${json.owner?.name}`);
        } catch {
          console.log(`${email}: Status ${res.statusCode} | ${data}`);
        }
        resolve();
      });
    });
    req.on('error', (e) => { console.error(`${email}: Error`, e.message); resolve(); });
    req.write(body);
    req.end();
  });
}

(async () => {
  await testLogin('owner@earthglobal.com', 'password123');
  await testLogin('agent@earthglobal.com', 'password123');
  await testLogin('admin@earthglobal.com', 'password123');
})();
