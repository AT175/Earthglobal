const fs = require('fs');
const https = require('https');

const apiKey = 'rnd_j3bFsXirVGZ8jfaYUqkMMbJeJaI2';
const serviceId = 'srv-da0ta0rl550s73eb7nlg';
const keyContent = fs.readFileSync('C:\\Users\\ATTA\\Downloads\\earthglobal-ee-1f08e9a0c5ce.json', 'utf8');

const body = JSON.stringify([{ key: 'EE_SERVICE_ACCOUNT_JSON', value: keyContent }]);

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
