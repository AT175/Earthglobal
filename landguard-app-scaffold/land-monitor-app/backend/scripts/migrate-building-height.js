/**
 * Migration: Add building height + comparison columns to buildings table
 *   - estimated_height_m:  estimated building height in meters (from shadow analysis + DEM)
 * - estimated_floors:     estimated number of floors (height / 3.5m)
 * - height_method:        how height was estimated ('shadow', 'dem', 'combined', null)
 *
 * Run: node scripts/migrate-building-height.js
 */
const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_SSL === 'true' ? { rejectUnauthorized: false } : undefined,
});

(async () => {
  const client = await pool.connect();
  try {
    await client.query("SET search_path TO earthglobal, public, extensions");
    console.log('Running building height migration...\n');

    const cols = [
      ['estimated_height_m', 'DOUBLE PRECISION'],
      ['estimated_floors', 'INTEGER'],
      ['height_method', "VARCHAR(20)"],
      ['height_confidence', 'DOUBLE PRECISION'],
    ];

    for (const [col, def] of cols) {
      try {
        await client.query(`ALTER TABLE buildings ADD COLUMN IF NOT EXISTS ${col} ${def}`);
        console.log(`  [OK] buildings.${col} added`);
      } catch (e) { console.log(`  [SKIP] buildings.${col}: ${e.message}`); }
    }

    // Add new hazard types to the hazard_type check constraint (if using VARCHAR)
    // The environmental_hazards.hazard_type is VARCHAR(50), so no enum change needed.

    // Add new alert types for new hazard types
    const newAlertTypes = ['deforestation', 'air_quality', 'urban_heat', 'wetland_loss'];
    for (const t of newAlertTypes) {
      try {
        await client.query(`ALTER TYPE alert_type ADD VALUE IF NOT EXISTS '${t}'`);
        console.log(`  [OK] alert_type: added ${t}`);
      } catch (e) { console.log(`  [SKIP] alert_type ${t}: ${e.message}`); }
    }

    console.log('\nMigration complete!');
  } catch (err) {
    console.error('Migration error:', err.message);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
})();
