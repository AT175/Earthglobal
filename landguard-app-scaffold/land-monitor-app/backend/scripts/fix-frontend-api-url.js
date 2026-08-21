const https = require('https');

const apiKey = 'rnd_j3bFsXirVGZ8jfaYUqkMMbJeJaI2';
const serviceId = 'srv-da3oh3rrn74s73fqvf30'; // earthglobal-app (static site)

const body = JSON.stringify([
  { key: 'VITE_API_URL', value: 'https://earthglobal-api.onrender.com' },
]);

const options = {
  hostname: 'api.render.com',
  path: `/v1/services/${serviceId}/env-vars`,
  method: 'PUT',
  headers: {
    'Authorization': `Bearer ${apiKey}`,
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(body),
  },
};

const req = https.request(options, (res) => {
  let data = '';
  res.on('data', (chunk) => (data += chunk));
  res.on('end', () => {
    console.log('Status:', res.statusCode);
    console.log('Response:', data);
  });
});

req.on('error', (e) => console.error('Error:', e.message));
req.write(body);
req.end();
