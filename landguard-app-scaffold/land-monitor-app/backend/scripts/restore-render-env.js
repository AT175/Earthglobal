const https = require('https');
const fs = require('fs');

const apiKey = 'rnd_j3bFsXirVGZ8jfaYUqkMMbJeJaI2';
const serviceId = 'srv-da3oh3rrn74s73fqvf20'; // earthglobal-api

// Read EE service account JSON from file
let eeKey = '';
try {
  eeKey = fs.readFileSync('C:\\Users\\ATTA\\Downloads\\earthglobal-ee-1f08e9a0c5ce.json', 'utf8');
} catch (e) {
  console.log('Warning: EE key file not found, EE_SERVICE_ACCOUNT_JSON will be empty');
}

// Restore ALL env vars (Render's PUT replaces the entire set)
const body = JSON.stringify([
  { key: 'PORT', value: '10000' },
  { key: 'CORS_ORIGINS', value: 'https://earthglobalgh.netlify.app,https://earthglobal-app.onrender.com,https://earthglobal.onrender.com' },
  { key: 'JWT_SECRET', value: 'fBCzB4rTkL6PnWvUAXKEkB0m1g1WT+ETqzKUFwrcKVw=' },
  { key: 'DATABASE_SSL', value: 'true' },
  { key: 'DATABASE_URL', value: 'postgresql://postgres.plvtvsavhqaayjspxmst:Echendaa%402024@aws-0-eu-west-2.pooler.supabase.com:5432/postgres' },
  { key: 'NODE_ENV', value: 'production' },
  { key: 'EE_SERVICE_ACCOUNT_JSON', value: eeKey },
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
    console.log('Response:', data.slice(0, 2000));
  });
});

req.on('error', (e) => console.error('Error:', e.message));
req.write(body);
req.end();
