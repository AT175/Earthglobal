const { Pool } = require('pg');
const bcrypt = require('bcrypt');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_SSL === 'true' ? { rejectUnauthorized: false } : undefined,
});

// ── Plot 475 & 476 Data ──
// Owner: Ama Posuaa
// Location: Fiapre North, Sector 8, Block H
// District: Sunyani West, Region: Brong Ahafo
// GPS points taken with phone at plot corners (WGS84)
// Scale: 1:2500, Plan Ref: TCP/BA/SWDA/FPN/REV/SEC/8/2011/02

// Actual GPS readings converted from DMS to decimal degrees:
//   Point 1 (11:03): 7°22'24.178"N, 2°21'31.673"W → 7.373383, -2.358798
//   Point 2 (11:05): 7°22'22.285"N, 2°21'31.994"W → 7.372857, -2.358889
//   Point 3 (11:04): 7°22'23.566"N, 2°21'31.202"W → 7.373213, -2.358667
//   Point 4 (11:06): 7°22'22.870"N, 2°21'32.802"W → 7.373019, -2.359112

const GPS_POINTS = [
  { lat: 7.373383, lng: -2.358798, accuracy: 6.2, captured_at: '2026-08-24T11:03:00Z' }, // P1 (N)
  { lat: 7.373213, lng: -2.358667, accuracy: 7.1, captured_at: '2026-08-24T11:04:00Z' }, // P3 (E)
  { lat: 7.372857, lng: -2.358889, accuracy: 5.8, captured_at: '2026-08-24T11:05:00Z' }, // P2 (S)
  { lat: 7.373019, lng: -2.359112, accuracy: 6.5, captured_at: '2026-08-24T11:06:00Z' }, // P4 (W)
];

// Build polygon from actual GPS points, ordered N→E→S→W (clockwise)
// GeoJSON coordinates are [lng, lat]
const boundary = {
  type: 'Polygon',
  coordinates: [[
    ...GPS_POINTS.map((p) => [p.lng, p.lat]),
    [GPS_POINTS[0].lng, GPS_POINTS[0].lat], // close the ring
  ]],
};

const SEED_PASSWORD = process.env.SEED_PASSWORD || 'password123';

(async () => {
  const hash = await bcrypt.hash(SEED_PASSWORD, 10);

  console.log('Seeding Ama Posuaa — Plot 475 & 476, Fiapre North, Sunyani West...\n');

  // 1. Create owner
  let ownerId;
  try {
    const ownerResult = await pool.query(
      `INSERT INTO earthglobal.owners (name, email, phone, password_hash, approved)
       VALUES ($1, $2, $3, $4, true)
       ON CONFLICT (email) DO UPDATE SET name = EXCLUDED.name, approved = true
       RETURNING id`,
      ['Ama Posuaa', 'ama.posuaa@earthglobal.com', '+233240000002', hash]
    );
    ownerId = ownerResult.rows[0].id;
    console.log(`Owner created: Ama Posuaa (ID: ${ownerId})`);
    console.log(`  Login: ama.posuaa@earthglobal.com / ${SEED_PASSWORD}`);
  } catch (e) {
    console.error('Owner creation failed:', e.message);
    await pool.end();
    return;
  }

  // 2. Create the combined parcel with boundary
  try {
    // Calculate area using PostGIS
    // Delete existing parcel for this owner before re-seeding with corrected GPS
    await pool.query(`DELETE FROM earthglobal.parcels WHERE owner_id = $1`, [ownerId]);

    const parcelResult = await pool.query(
      `INSERT INTO earthglobal.parcels (owner_id, name, boundary, region, survey_date, area_sqm, perimeter_m)
       VALUES ($1, $2,
         ST_SetSRID(ST_GeomFromGeoJSON($3), 4326),
         $4, CURRENT_DATE,
         ST_Area(ST_Transform(ST_SetSRID(ST_GeomFromGeoJSON($3), 4326), 3857)),
         ST_Perimeter(ST_Transform(ST_SetSRID(ST_GeomFromGeoJSON($3), 4326), 3857))
       )
       RETURNING id, name, area_sqm, perimeter_m, ST_AsGeoJSON(boundary) as geojson`,
      [
        ownerId,
        'Plot 475 & 476 — Fiapre North, Sector 8, Block H',
        JSON.stringify(boundary),
        'Brong Ahafo',
      ]
    );

    if (parcelResult.rows.length > 0) {
      const parcel = parcelResult.rows[0];
      const geo = JSON.parse(parcel.geojson);
      const centroidLat = GPS_POINTS.reduce((s, p) => s + p.lat, 0) / GPS_POINTS.length;
      const centroidLng = GPS_POINTS.reduce((s, p) => s + p.lng, 0) / GPS_POINTS.length;
      console.log(`\nParcel created: ${parcel.name}`);
      console.log(`  ID: ${parcel.id}`);
      console.log(`  Area: ${parseFloat(parcel.area_sqm).toFixed(2)} m² (${(parseFloat(parcel.area_sqm) * 0.000247105).toFixed(4)} acres)`);
      console.log(`  Perimeter: ${parseFloat(parcel.perimeter_m).toFixed(2)} m`);
      console.log(`  Centroid: ${centroidLat.toFixed(6)}°N, ${Math.abs(centroidLng).toFixed(6)}°W`);
      console.log(`  Boundary coordinates (lng, lat):`);
      geo.coordinates[0].forEach((coord, i) => {
        console.log(`    ${i + 1}. [${coord[0].toFixed(6)}, ${coord[1].toFixed(6)}]`);
      });
    } else {
      console.log('Parcel creation failed — no rows returned.');
    }
  } catch (e) {
    console.error('Parcel creation failed:', e.message);
  }

  // 3. Create a survey session record
  try {
    // Delete old survey sessions for this owner before re-seeding
    await pool.query(`DELETE FROM earthglobal.survey_sessions WHERE surveyed_by = $1`, [ownerId]);

    const avgAccuracy = GPS_POINTS.reduce((s, p) => s + p.accuracy, 0) / GPS_POINTS.length;
    const sessionResult = await pool.query(
      `INSERT INTO earthglobal.survey_sessions (surveyed_by, method, raw_points, gps_accuracy_m, completed_at)
       VALUES ($1, 'live_gps', $2, $3, now())
       RETURNING id`,
      [
        ownerId,
        JSON.stringify(GPS_POINTS),
        avgAccuracy,
      ]
    );
    console.log(`\nSurvey session created: ${sessionResult.rows[0].id}`);
    console.log(`  Method: live_gps, 4 GPS corner readings (11:03–11:06)`);
    console.log(`  Average accuracy: ±${avgAccuracy.toFixed(1)}m`);
  } catch (e) {
    console.error('Survey session creation failed:', e.message);
  }

  // 4. Summary
  console.log('\n── Seed Complete ──');
  console.log('Owner: Ama Posuaa');
  console.log('Email: ama.posuaa@earthglobal.com');
  console.log('Password:', SEED_PASSWORD);
  console.log('Parcel: Plot 475 & 476 — Fiapre North, Sector 8, Block H');
  console.log('Location: Fiapre North, Sunyani West, Brong Ahafo');
  console.log('GPS: 4 corner points from phone survey (WGS84)');
  console.log('Plan Ref: TCP/BA/SWDA/FPN/REV/SEC/8/2011/02');
  console.log('\nYou can now log in as this owner and view the parcel on the map.');

  await pool.end();
})();
