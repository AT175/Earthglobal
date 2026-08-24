const axios = require('axios');

const API_URL = 'https://earthglobal-api.onrender.com';

async function test() {
  console.log('Testing API at:', API_URL);

  // 1. Login as Ama Posuaa
  let token;
  try {
    const loginRes = await axios.post(`${API_URL}/auth/login`, {
      email: 'ama.posuaa@earthglobal.com',
      password: 'password123',
    });
    token = loginRes.data.token;
    console.log('1. Login: OK (token received)');
    console.log('   User:', JSON.stringify(loginRes.data.user));
  } catch (e) {
    console.log('1. Login: FAILED -', e.response?.data?.error || e.message);
    return;
  }

  const headers = { Authorization: `Bearer ${token}` };

  // 2. List parcels
  let parcelId;
  try {
    const parcelsRes = await axios.get(`${API_URL}/parcels`, { headers });
    console.log('2. GET /parcels: OK (' + parcelsRes.data.length + ' parcels)');
    if (parcelsRes.data[0]) {
      parcelId = parcelsRes.data[0].id;
      console.log('   Parcel:', parcelsRes.data[0].name);
      console.log('   Boundary:', JSON.stringify(parcelsRes.data[0].boundary));
    }
  } catch (e) {
    console.log('2. GET /parcels: FAILED -', e.response?.data?.error || e.message);
    return;
  }

  if (!parcelId) {
    console.log('No parcels found');
    return;
  }

  // 3. Get parcel by ID
  try {
    const res = await axios.get(`${API_URL}/parcels/${parcelId}`, { headers });
    console.log('3. GET /parcels/:id: OK');
    console.log('   Name:', res.data.name);
    console.log('   Boundary type:', res.data.boundary?.type);
    console.log('   Coords count:', res.data.boundary?.coordinates?.[0]?.length);
  } catch (e) {
    console.log('3. GET /parcels/:id: FAILED -', e.response?.status, e.response?.data?.error || e.message);
  }

  // 4. Get parcel alerts
  try {
    const res = await axios.get(`${API_URL}/parcels/${parcelId}/alerts`, { headers });
    console.log('4. GET /parcels/:id/alerts: OK (' + res.data.length + ' alerts)');
  } catch (e) {
    console.log('4. GET /parcels/:id/alerts: FAILED -', e.response?.status, e.response?.data?.error || e.message);
  }

  // 5. Get visit requests
  try {
    const res = await axios.get(`${API_URL}/visit-requests`, { headers });
    console.log('5. GET /visit-requests: OK (' + res.data.length + ' visits)');
  } catch (e) {
    console.log('5. GET /visit-requests: FAILED -', e.response?.status, e.response?.data?.error || e.message);
  }

  // 6. Check alerts trends
  try {
    const res = await axios.get(`${API_URL}/alerts/trends`, { headers });
    console.log('6. GET /alerts/trends: OK (' + res.data.length + ' months)');
  } catch (e) {
    console.log('6. GET /alerts/trends: FAILED -', e.response?.status, e.response?.data?.error || e.message);
  }
}

test().catch(console.error);
