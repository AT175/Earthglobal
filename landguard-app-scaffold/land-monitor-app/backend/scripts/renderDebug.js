const https = require('https');
const API_KEY = 'rnd_lujceBBwoYYZIGHVOcO0hhjXNCLo';
const SERVICE_ID = 'srv-da3oh3rrn74s73fqvf20';

function renderRequest(method, path, body) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'api.render.com',
      path: path,
      method: method,
      headers: {
        'Authorization': `Bearer ${API_KEY}`,
        'Accept': 'application/json',
        'Content-Type': 'application/json',
      },
    };
    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', (c) => { data += c; });
      res.on('end', () => resolve({ status: res.statusCode, raw: data }));
    });
    req.on('error', reject);
    if (body) req.write(JSON.stringify(body));
    req.end();
  });
}

async function main() {
  const res = await renderRequest('GET', `/v1/services/${SERVICE_ID}/env-vars`);
  console.log('Status:', res.status);
  console.log('Raw (first 3000):', res.raw.substring(0, 3000));
}

main().catch(console.error);
