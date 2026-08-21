/**
 * Migration: Add metadata JSONB column to buildings table
 *            + add centroid_lat/centroid_lng columns for fast geolocation lookup
 *            + add metadata JSONB to parcels table
 *            + add transfer_history JSONB to parcels table
 *
 * Run: node scripts/migrate-geospatial.js
 */
const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  host: 'aws-0-eu-west-2.pooler.supabase.com',
  port: 5432,
  user: 'postgres.plvtvsavhqaayjspxmst',
  password: 'Echendaa@2024',
  database: 'postgres',
  ssl: { rejectUnauthorized: false },
});

(async () => {
  const client = await pool.connect();
  try {
    // Set search path for Supabase schema
    await client.query("SET search_path TO earthglobal, public, extensions");

    console.log('Running geospatial migration...\n');

    // ── 1. Add metadata JSONB to buildings ──
    try {
      await client.query('ALTER TABLE buildings ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT \'{}\'::jsonb');
      console.log('  [OK] buildings.metadata JSONB column added');
    } catch (e) { console.log('  [SKIP] buildings.metadata:', e.message); }

    // ── 2. Add centroid_lat / centroid_lng to buildings (computed from footprint) ──
    try {
      await client.query('ALTER TABLE buildings ADD COLUMN IF NOT EXISTS centroid_lat DOUBLE PRECISION');
      await client.query('ALTER TABLE buildings ADD COLUMN IF NOT EXISTS centroid_lng DOUBLE PRECISION');
      // Backfill existing rows
      await client.query(`
        UPDATE buildings
        SET centroid_lat = ST_Y(ST_Centroid(footprint)),
            centroid_lng = ST_X(ST_Centroid(footprint))
        WHERE centroid_lat IS NULL AND footprint IS NOT NULL
      `);
      console.log('  [OK] buildings.centroid_lat/lng columns added + backfilled');
    } catch (e) { console.log('  [SKIP] buildings.centroid:', e.message); }

    // ── 3. Add metadata JSONB to parcels ──
    try {
      await client.query('ALTER TABLE parcels ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT \'{}\'::jsonb');
      console.log('  [OK] parcels.metadata JSONB column added');
    } catch (e) { console.log('  [SKIP] parcels.metadata:', e.message); }

    // ── 4. Add transfer_history JSONB to parcels ──
    try {
      await client.query('ALTER TABLE parcels ADD COLUMN IF NOT EXISTS transfer_history JSONB DEFAULT \'[]\'::jsonb');
      console.log('  [OK] parcels.transfer_history JSONB column added');
    } catch (e) { console.log('  [SKIP] parcels.transfer_history:', e.message); }

    // ── 5. Add centroid_lat / centroid_lng to parcels ──
    try {
      await client.query('ALTER TABLE parcels ADD COLUMN IF NOT EXISTS centroid_lat DOUBLE PRECISION');
      await client.query('ALTER TABLE parcels ADD COLUMN IF NOT EXISTS centroid_lng DOUBLE PRECISION');
      await client.query(`
        UPDATE parcels
        SET centroid_lat = ST_Y(ST_Centroid(boundary)),
            centroid_lng = ST_X(ST_Centroid(boundary))
        WHERE centroid_lat IS NULL AND boundary IS NOT NULL
      `);
      console.log('  [OK] parcels.centroid_lat/lng columns added + backfilled');
    } catch (e) { console.log('  [SKIP] parcels.centroid:', e.message); }

    // ── 6. Create index on buildings centroid for spatial queries ──
    try {
      await client.query('CREATE INDEX IF NOT EXISTS idx_buildings_centroid ON buildings(centroid_lat, centroid_lng)');
      await client.query('CREATE INDEX IF NOT EXISTS idx_parcels_centroid ON parcels(centroid_lat, centroid_lng)');
      console.log('  [OK] Spatial indexes on centroid columns created');
    } catch (e) { console.log('  [SKIP] indexes:', e.message); }

    console.log('\nMigration complete!');
  } catch (err) {
    console.error('Migration error:', err.message);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
})();
