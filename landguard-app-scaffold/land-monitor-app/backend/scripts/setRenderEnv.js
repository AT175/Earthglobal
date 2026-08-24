const https = require('https');
require('dotenv').config();

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
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, data: JSON.parse(data) });
        } catch (e) {
          resolve({ status: res.statusCode, raw: data });
        }
      });
    });
    req.on('error', reject);
    if (body) req.write(JSON.stringify(body));
    req.end();
  });
}

async function main() {
  // 1. Get current env vars
  console.log('Fetching env vars for earthglobal-api (srv-da3oh3rrn74s73fqvf20)...');
  const envRes = await renderRequest('GET', `/v1/services/${SERVICE_ID}/env-vars`);

  if (envRes.status !== 200) {
    console.log('Failed:', envRes.status, JSON.stringify(envRes.data || envRes.raw));
    return;
  }

  const existingVars = envRes.data;
  console.log(`Found ${existingVars.length} existing env vars:`);
  existingVars.forEach(v => {
    const isEE = v.key === 'EE_SERVICE_ACCOUNT_JSON';
    console.log(`  - ${v.key}: ${isEE ? 'ALREADY SET' : 'exists'}`);
  });

  // 2. Get EE credentials from local .env
  const eeValue = process.env.EE_SERVICE_ACCOUNT_JSON;
  if (!eeValue) {
    console.log('\nERROR: EE_SERVICE_ACCOUNT_JSON not found in local .env');
    return;
  }
  console.log(`\nEE_SERVICE_ACCOUNT_JSON length: ${eeValue.length}`);

  // 3. Build full env var list with EE credentials added/updated
  const allVars = existingVars.map(v => ({ key: v.key, value: v.value }));
  const eeIndex = allVars.findIndex(v => v.key === 'EE_SERVICE_ACCOUNT_JSON');
  if (eeIndex >= 0) {
    allVars[eeIndex].value = eeValue;
    console.log('Updating existing EE_SERVICE_ACCOUNT_JSON...');
  } else {
    allVars.push({ key: 'EE_SERVICE_ACCOUNT_JSON', value: eeValue });
    console.log('Adding new EE_SERVICE_ACCOUNT_JSON...');
  }

  console.log(`\nSending ${allVars.length} env vars to Render...`);
  const updateRes = await renderRequest('PUT', `/v1/services/${SERVICE_ID}/env-vars`, allVars);

  console.log('Response status:', updateRes.status);
  if (updateRes.status === 200 || updateRes.status === 202) {
    console.log('\nSuccess! EE_SERVICE_ACCOUNT_JSON has been set on Render.');
    console.log('The service will redeploy automatically.');
  } else {
    console.log('Response:', JSON.stringify(updateRes.data || updateRes.raw));
  }
}

main().catch(console.error);
