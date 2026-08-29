require('dotenv').config();
const { init, ee } = require('../src/config/earthEngine');

async function test() {
  console.log('Testing Earth Engine initialization...\n');
  console.log('EE_SERVICE_ACCOUNT_JSON set:', !!process.env.EE_SERVICE_ACCOUNT_JSON);
  
  const ready = await init();
  console.log('\nEE ready:', ready);

  if (ready) {
    console.log('\nTesting a simple EE computation...');
    try {
      const image = ee.Image('COPERNICUS/S2_HARMONIZED/20240101T000000_20240101T000000_T30NWL');
      const ndvi = image.normalizedDifference(['B8', 'B4']);
      ndvi.reduceRegion({
        reducer: ee.Reducer.mean(),
        geometry: ee.Geometry.Point([-2.3589, 7.3731]),
        scale: 10,
      }).getInfo((info, err) => {
        if (err) {
          console.log('EE computation error:', err.message);
        } else {
          console.log('NDVI mean at parcel center:', info);
        }
        process.exit(0);
      });
    } catch (e) {
      console.log('EE computation failed:', e.message);
      process.exit(1);
    }
  } else {
    console.log('\nEarth Engine not initialized. Check credentials.');
    process.exit(1);
  }
}

test().catch((e) => { console.error(e); process.exit(1); });
