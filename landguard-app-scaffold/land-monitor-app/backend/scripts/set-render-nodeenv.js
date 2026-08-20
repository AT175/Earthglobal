const https = require('https');

const apiKey = 'rnd_j3bFsXirVGZ8jfaYUqkMMbJeJaI2';
const serviceId = 'srv-da0ta0rl550s73eb7nlg';

const envVars = [
  { key: 'NODE_ENV', value: 'production' },
];

const body = JSON.stringify(envVars);

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
    console.log('Response:', data.substring(0, 200));
  });
});

req.on('error', (e) => console.error('Error:', e.message));
req.write(body);
req.end();
