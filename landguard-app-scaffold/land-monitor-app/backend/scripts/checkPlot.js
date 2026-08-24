const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_SSL === 'true' ? { rejectUnauthorized: false } : undefined,
});

(async () => {
  try {
    const owner = await pool.query(
      "SELECT id, name, email, approved FROM earthglobal.owners WHERE email = 'ama.posuaa@earthglobal.com'"
    );
    console.log('Owner:', owner.rows[0] || 'NOT FOUND');

    if (owner.rows[0]) {
      const parcels = await pool.query(
        'SELECT id, name, region, area_sqm, perimeter_m, ST_AsGeoJSON(boundary) as geojson FROM earthglobal.parcels WHERE owner_id = $1',
        [owner.rows[0].id]
      );
      console.log(`\nParcels found: ${parcels.rows.length}`);
      parcels.rows.forEach((r) => {
        console.log(`  - Name: ${r.name}`);
        console.log(`  - Region: ${r.region}`);
        console.log(`  - Area: ${r.area_sqm} m²`);
        console.log(`  - Perimeter: ${r.perimeter_m} m`);
        console.log(`  - Boundary: ${r.geojson}`);
      });

      const sessions = await pool.query(
        'SELECT id, method, gps_accuracy_m, completed_at FROM earthglobal.survey_sessions WHERE surveyed_by = $1',
        [owner.rows[0].id]
      );
      console.log(`\nSurvey sessions: ${sessions.rows.length}`);
      sessions.rows.forEach((r) => {
        console.log(`  - Method: ${r.method}, Accuracy: ${r.gps_accuracy_m}m, Completed: ${r.completed_at}`);
      });
    }
    // Check if alerts table exists and query it
    const tables = await pool.query(
      "SELECT table_name FROM information_schema.tables WHERE table_schema = 'earthglobal' AND table_name IN ('alerts', 'visit_requests', 'parcels', 'owners') ORDER BY table_name"
    );
    console.log('\nTables found:', tables.rows.map((r) => r.table_name));

    const parcelId = '242e47e8-2d83-47aa-9094-4de3d22969c4';

    // Test the exact queries the ParcelDetail page makes
    console.log('\n--- Testing ParcelDetail API queries ---');

    // 1. GET /parcels/:id
    try {
      const p1 = await pool.query(
        'SELECT id, name, region, survey_date, area_sqm, perimeter_m, ST_AsGeoJSON(boundary) AS boundary_geojson FROM earthglobal.parcels WHERE id = $1',
        [parcelId]
      );
      console.log('1. GET /parcels/:id =>', p1.rows[0] ? 'OK (' + p1.rows[0].name + ')' : 'NOT FOUND');
    } catch (e) { console.log('1. GET /parcels/:id => ERROR:', e.message); }

    // 2. GET /parcels/:id/alerts
    try {
      const p2 = await pool.query(
        'SELECT * FROM earthglobal.alerts WHERE parcel_id = $1 ORDER BY detected_at DESC',
        [parcelId]
      );
      console.log('2. GET /parcels/:id/alerts => OK (' + p2.rows.length + ' alerts)');
    } catch (e) { console.log('2. GET /parcels/:id/alerts => ERROR:', e.message); }

    // 3. GET /visit-requests
    try {
      const p3 = await pool.query(
        'SELECT * FROM earthglobal.visit_requests WHERE parcel_id = $1',
        [parcelId]
      );
      console.log('3. GET /visit-requests (filtered) => OK (' + p3.rows.length + ' visits)');
    } catch (e) { console.log('3. GET /visit-requests => ERROR:', e.message); }

  } catch (e) {
    console.error('Error:', e.message);
  }
  await pool.end();
})();
