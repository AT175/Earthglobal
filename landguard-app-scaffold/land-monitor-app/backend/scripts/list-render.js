const https = require('https');

const apiKey = 'rnd_j3bFsXirVGZ8jfaYUqkMMbJeJaI2';

const options = {
  hostname: 'api.render.com',
  path: '/v1/services?limit=20',
  method: 'GET',
  headers: { 'Authorization': `Bearer ${apiKey}` },
};

const req = https.request(options, (res) => {
  let data = '';
  res.on('data', (chunk) => (data += chunk));
  res.on('end', () => {
    console.log('Status:', res.statusCode);
    try {
      const json = JSON.parse(data);
      if (json.services) {
        json.services.forEach((s) => {
          console.log(`ID: ${s.service.id} | Name: ${s.service.name} | Type: ${s.service.type} | URL: ${s.service.serviceDetails.url || 'N/A'}`);
        });
      } else {
        console.log('Response:', data);
      }
    } catch (e) {
      console.log('Response:', data);
    }
  });
});

req.on('error', (e) => console.error('Error:', e.message));
req.end();
