const axios = require('axios');

const API_URL = 'https://earthglobal-api.onrender.com';

async function test() {
  console.log('Testing map-tiles endpoints at:', API_URL);

  // 1. Login
  let token;
  try {
    const loginRes = await axios.post(`${API_URL}/auth/login`, {
      email: 'ama.posuaa@earthglobal.com',
      password: 'password123',
    });
    token = loginRes.data.token;
    console.log('1. Login: OK\n');
  } catch (e) {
    console.log('1. Login: FAILED -', e.response?.data?.error || e.message);
    return;
  }

  const headers = { Authorization: `Bearer ${token}` };

  // 2. Test satellite tiles
  console.log('2. GET /map-tiles/satellite (no bbox)');
  try {
    const res = await axios.get(`${API_URL}/map-tiles/satellite`, { headers });
    console.log('   Status:', res.status);
    console.log('   Response:', JSON.stringify(res.data));
  } catch (e) {
    console.log('   FAILED:', e.response?.status, e.response?.data?.error || e.message);
  }

  // 3. Test satellite tiles with bbox
  const bbox = '-2.36,7.37,-2.35,7.38';
  console.log(`\n3. GET /map-tiles/satellite?bbox=${bbox}`);
  try {
    const res = await axios.get(`${API_URL}/map-tiles/satellite`, { headers, params: { bbox } });
    console.log('   Status:', res.status);
    console.log('   Response:', JSON.stringify(res.data));
  } catch (e) {
    console.log('   FAILED:', e.response?.status, e.response?.data?.error || e.message);
  }

  // 4. Test NDVI tiles with bbox
  console.log(`\n4. GET /map-tiles/ndvi?bbox=${bbox}`);
  try {
    const res = await axios.get(`${API_URL}/map-tiles/ndvi`, { headers, params: { bbox } });
    console.log('   Status:', res.status);
    console.log('   Response:', JSON.stringify(res.data));
  } catch (e) {
    console.log('   FAILED:', e.response?.status, e.response?.data?.error || e.message);
  }

  // 5. Test NDVI tiles without bbox (should 400)
  console.log('\n5. GET /map-tiles/ndvi (no bbox — should error)');
  try {
    const res = await axios.get(`${API_URL}/map-tiles/ndvi`, { headers });
    console.log('   Status:', res.status);
    console.log('   Response:', JSON.stringify(res.data));
  } catch (e) {
    console.log('   Status:', e.response?.status, e.response?.data?.error || e.message);
  }
}

test().catch(console.error);
