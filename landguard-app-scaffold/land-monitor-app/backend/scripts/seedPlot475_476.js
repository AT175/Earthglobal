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
// GPS: 7.3731°N, 2.3589°W (WGS84)
// Combined area: ~0.46 acre (~1,862 m²)
// Each plot: 90ft × 90ft (27.432m × 27.432m)
// Combined: ~180ft × 90ft (54.864m × 27.432m) = ~1,505 m²
// Scale: 1:2500, Plan Ref: TCP/BA/SWDA/FPN/REV/SEC/8/2011/02

const CENTER_LAT = 7.3731;
const CENTER_LNG = -2.3589;

// Convert feet to meters
const FT_TO_M = 0.3048;
const PLOT_WIDTH_FT = 90;
const PLOT_HEIGHT_FT = 90;
const COMBINED_WIDTH_M = PLOT_WIDTH_FT * 2 * FT_TO_M;  // 180ft = 54.864m
const COMBINED_HEIGHT_M = PLOT_HEIGHT_FT * FT_TO_M;      // 90ft = 27.432m

// Convert meters to degrees at this latitude
const LAT_PER_M = 1 / 111111; // ~1 degree = 111,111m
const LNG_PER_M = 1 / (111111 * Math.cos(CENTER_LAT * Math.PI / 180));

const HALF_W_DEG = (COMBINED_WIDTH_M / 2) * LNG_PER_M;
const HALF_H_DEG = (COMBINED_HEIGHT_M / 2) * LAT_PER_M;

// Build a rectangle centered on the GPS point
// Coordinates in GeoJSON order: [lng, lat]
const boundary = {
  type: 'Polygon',
  coordinates: [[
    [CENTER_LNG - HALF_W_DEG, CENTER_LAT - HALF_H_DEG], // SW
    [CENTER_LNG + HALF_W_DEG, CENTER_LAT - HALF_H_DEG], // SE
    [CENTER_LNG + HALF_W_DEG, CENTER_LAT + HALF_H_DEG], // NE
    [CENTER_LNG - HALF_W_DEG, CENTER_LAT + HALF_H_DEG], // NW
    [CENTER_LNG - HALF_W_DEG, CENTER_LAT - HALF_H_DEG], // SW (close ring)
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
    const parcelResult = await pool.query(
      `INSERT INTO earthglobal.parcels (owner_id, name, boundary, region, survey_date, area_sqm, perimeter_m)
       VALUES ($1, $2,
         ST_SetSRID(ST_GeomFromGeoJSON($3), 4326),
         $4, CURRENT_DATE,
         ST_Area(ST_Transform(ST_SetSRID(ST_GeomFromGeoJSON($3), 4326), 3857)),
         ST_Perimeter(ST_Transform(ST_SetSRID(ST_GeomFromGeoJSON($3), 4326), 3857))
       )
       ON CONFLICT DO NOTHING
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
      console.log(`\nParcel created: ${parcel.name}`);
      console.log(`  ID: ${parcel.id}`);
      console.log(`  Area: ${parseFloat(parcel.area_sqm).toFixed(2)} m² (${(parseFloat(parcel.area_sqm) * 0.000247105).toFixed(4)} acres)`);
      console.log(`  Perimeter: ${parseFloat(parcel.perimeter_m).toFixed(2)} m`);
      console.log(`  Center: ${CENTER_LAT}°N, ${Math.abs(CENTER_LNG)}°W`);
      console.log(`  Boundary coordinates (lng, lat):`);
      geo.coordinates[0].forEach((coord, i) => {
        console.log(`    ${i + 1}. [${coord[0].toFixed(6)}, ${coord[1].toFixed(6)}]`);
      });
    } else {
      console.log('Parcel already exists (ON CONFLICT DO NOTHING).');
    }
  } catch (e) {
    console.error('Parcel creation failed:', e.message);
  }

  // 3. Create a survey session record
  try {
    const sessionResult = await pool.query(
      `INSERT INTO earthglobal.survey_sessions (surveyed_by, method, raw_points, gps_accuracy_m, completed_at)
       VALUES ($1, 'live_gps', $2, 7.5, now())
       RETURNING id`,
      [
        ownerId,
        JSON.stringify([
          { lat: CENTER_LAT + 0.00001, lng: CENTER_LNG - 0.00001, accuracy: 6.2, captured_at: '2026-08-24T11:03:00Z' },
          { lat: CENTER_LAT - 0.00001, lng: CENTER_LNG + 0.00001, accuracy: 5.8, captured_at: '2026-08-24T11:04:00Z' },
          { lat: CENTER_LAT + 0.000005, lng: CENTER_LNG + 0.000005, accuracy: 7.1, captured_at: '2026-08-24T11:05:00Z' },
          { lat: CENTER_LAT - 0.000005, lng: CENTER_LNG - 0.000005, accuracy: 6.5, captured_at: '2026-08-24T11:06:00Z' },
        ]),
      ]
    );
    console.log(`\nSurvey session created: ${sessionResult.rows[0].id}`);
    console.log('  Method: live_gps, 4 readings averaged (11:03–11:06)');
    console.log('  Estimated accuracy: ±5–10m (avg: 7.5m)');
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
  console.log('GPS: 7.3731°N, 2.3589°W (WGS84)');
  console.log('Plan Ref: TCP/BA/SWDA/FPN/REV/SEC/8/2011/02');
  console.log('Combined area: ~0.46 acre (180ft × 90ft)');
  console.log('\nYou can now log in as this owner and view the parcel on the map.');

  await pool.end();
})();
