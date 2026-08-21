/**
 * Migration: Add building change detection infrastructure
 *   - Add 'new_building' and 'building_change' to alert_type enum
 *   - Create building_change_detections table for tracking detection runs
 *   - Add change_detection_id to buildings for linking to the run that found them
 *
 * Run: node scripts/migrate-building-change-detection.js
 */
const { Pool } = require('pg');

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
    await client.query("SET search_path TO earthglobal, public, extensions");
    console.log('Running building change detection migration...\n');

    // ── 1. Add new alert types ──
    try {
      await client.query("ALTER TYPE alert_type ADD VALUE IF NOT EXISTS 'new_building'");
      console.log('  [OK] alert_type: added new_building');
    } catch (e) { console.log('  [SKIP] alert_type new_building:', e.message); }

    try {
      await client.query("ALTER TYPE alert_type ADD VALUE IF NOT EXISTS 'building_change'");
      console.log('  [OK] alert_type: added building_change');
    } catch (e) { console.log('  [SKIP] alert_type building_change:', e.message); }

    // ── 2. Create building_change_detections table ──
    try {
      await client.query(`
        CREATE TABLE IF NOT EXISTS building_change_detections (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
          status VARCHAR(50) NOT NULL DEFAULT 'running',
          period_start DATE NOT NULL,
          period_end DATE NOT NULL,
          baseline_start DATE NOT NULL,
          baseline_end DATE NOT NULL,
          bbox JSONB,
          new_buildings_count INTEGER DEFAULT 0,
          new_builtup_area_sqm DOUBLE PRECISION DEFAULT 0,
          method TEXT,
          before_tile_url TEXT,
          after_tile_url TEXT,
          change_tile_url TEXT,
          error_message TEXT,
          started_by UUID REFERENCES assembly_users(id),
          started_at TIMESTAMPTZ DEFAULT now(),
          completed_at TIMESTAMPTZ
        )
      `);
      console.log('  [OK] building_change_detections table created');
    } catch (e) { console.log('  [SKIP] table:', e.message); }

    // ── 3. Add change_detection_id to buildings ──
    try {
      await client.query(`
        ALTER TABLE buildings ADD COLUMN IF NOT EXISTS change_detection_id UUID
        REFERENCES building_change_detections(id) ON DELETE SET NULL
      `);
      console.log('  [OK] buildings.change_detection_id column added');
    } catch (e) { console.log('  [SKIP] buildings.change_detection_id:', e.message); }

    // ── 4. Add indexes ──
    try {
      await client.query('CREATE INDEX IF NOT EXISTS idx_bcd_org ON building_change_detections(organization_id)');
      await client.query('CREATE INDEX IF NOT EXISTS idx_bcd_status ON building_change_detections(status)');
      await client.query('CREATE INDEX IF NOT EXISTS idx_buildings_cd ON buildings(change_detection_id)');
      console.log('  [OK] Indexes created');
    } catch (e) { console.log('  [SKIP] indexes:', e.message); }

    // ── 5. Add metadata columns for change tracking on alerts ──
    try {
      await client.query('ALTER TABLE alerts ADD COLUMN IF NOT EXISTS change_detection_id UUID REFERENCES building_change_detections(id) ON DELETE SET NULL');
      await client.query('ALTER TABLE alerts ADD COLUMN IF NOT EXISTS building_count INTEGER');
      await client.query('ALTER TABLE alerts ADD COLUMN IF NOT EXISTS builtup_area_sqm DOUBLE PRECISION');
      console.log('  [OK] alerts: change detection columns added');
    } catch (e) { console.log('  [SKIP] alerts columns:', e.message); }

    console.log('\nMigration complete!');
  } catch (err) {
    console.error('Migration error:', err.message);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
})();
