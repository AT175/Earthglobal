const axios = require('axios');
const API_URL = 'https://earthglobal-api.onrender.com';

async function test() {
  const loginRes = await axios.post(`${API_URL}/auth/login`, {
    email: 'ama.posuaa@earthglobal.com',
    password: 'password123',
  });
  const headers = { Authorization: `Bearer ${loginRes.data.token}` };

  // Test NDVI with correct bbox
  const bbox = '-2.36,7.37,-2.35,7.38';
  console.log('GET /map-tiles/ndvi?bbox=' + bbox);
  try {
    const res = await axios.get(`${API_URL}/map-tiles/ndvi`, { headers, params: { bbox } });
    console.log('Status:', res.status);
    const d = res.data;
    console.log('url:', d.url ? d.url.substring(0, 80) + '...' : null);
    console.log('provider:', d.provider);
    console.log('error:', d.error ? String(d.error).substring(0, 500) : null);
    console.log('token:', d.token ? 'present' : 'none');
  } catch (e) {
    console.log('FAILED:', e.response?.status, e.response?.data);
  }

  // Test satellite with bbox
  console.log('\nGET /map-tiles/satellite?bbox=' + bbox);
  try {
    const res = await axios.get(`${API_URL}/map-tiles/satellite`, { headers, params: { bbox } });
    console.log('Status:', res.status);
    const d = res.data;
    console.log('url:', d.url ? d.url.substring(0, 80) + '...' : null);
    console.log('provider:', d.provider);
    console.log('error:', d.error ? String(d.error).substring(0, 500) : null);
  } catch (e) {
    console.log('FAILED:', e.response?.status, e.response?.data);
  }
}

test().catch(console.error);
