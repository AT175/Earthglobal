/**
 * Migration: Add environmental hazard infrastructure
 *   - environmental_hazards: detected hazards (water pollution, flood, illegal mining, open dumps)
 *   - hazard_alerts: alerts sent to planners/owners about hazards
 *
 * Run: node scripts/migrate-hazards.js
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
    console.log('Running environmental hazards migration...\n');

    // ── 1. Create environmental_hazards table ──
    try {
      await client.query(`
        CREATE TABLE IF NOT EXISTS environmental_hazards (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,

          -- Hazard classification
          hazard_type VARCHAR(50) NOT NULL,
          -- Types: 'water_pollution', 'flood_prone', 'illegal_mining', 'open_dump'

          -- Location
          centroid_lat DOUBLE PRECISION NOT NULL,
          centroid_lng DOUBLE PRECISION NOT NULL,
          boundary JSONB,
          bbox JSONB,
          region VARCHAR(255),
          area_sqm DOUBLE PRECISION,

          -- Detection details
          severity VARCHAR(20) NOT NULL DEFAULT 'moderate',
          -- Severity: 'low', 'moderate', 'high', 'critical'

          confidence DOUBLE PRECISION,
          -- 0.0 to 1.0 — ML confidence score

          -- Detection source
          detection_method VARCHAR(50) NOT NULL DEFAULT 'earth_engine',
          -- 'earth_engine', 'manual', 'report', 'satellite'

          -- Spectral indices / measurements
          indices JSONB,
          -- e.g. { "ndwi": -0.3, "turbidity": 0.8, "chlorophyll_a": 12.5 }

          -- Description + evidence
          description TEXT,
          evidence_images JSONB,
          -- Array of image URLs / EE tile URLs

          -- EE tile URL for map overlay
          tile_url TEXT,

          -- Status
          status VARCHAR(20) NOT NULL DEFAULT 'active',
          -- 'active', 'verified', 'resolved', 'false_positive'

          -- Temporal
          detected_at TIMESTAMPTZ DEFAULT now(),
          last_checked_at TIMESTAMPTZ DEFAULT now(),
          resolved_at TIMESTAMPTZ,

          -- Who detected/verified
          detected_by VARCHAR(100),
          verified_by UUID REFERENCES assembly_users(id) ON DELETE SET NULL,
          verifier_name VARCHAR(255),

          -- Metadata for flexible extra data
          metadata JSONB,

          created_at TIMESTAMPTZ DEFAULT now(),
          updated_at TIMESTAMPTZ DEFAULT now()
        )
      `);
      console.log('  [OK] environmental_hazards table created');
    } catch (e) { console.log('  [SKIP] table:', e.message); }

    // ── 2. Create hazard_alerts table ──
    try {
      await client.query(`
        CREATE TABLE IF NOT EXISTS hazard_alerts (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
          hazard_id UUID NOT NULL REFERENCES environmental_hazards(id) ON DELETE CASCADE,

          -- Alert target
          target_type VARCHAR(20) NOT NULL DEFAULT 'planner',
          -- 'planner', 'owner', 'public'
          target_user_id UUID,
          -- NULL = broadcast to all planners in org

          -- Alert content
          alert_type VARCHAR(50) NOT NULL,
          title VARCHAR(255) NOT NULL,
          message TEXT,

          -- Notification status
          delivery_status VARCHAR(20) DEFAULT 'sent',
          -- 'sent', 'delivered', 'read', 'failed'
          read_at TIMESTAMPTZ,

          created_at TIMESTAMPTZ DEFAULT now()
        )
      `);
      console.log('  [OK] hazard_alerts table created');
    } catch (e) { console.log('  [SKIP] alerts table:', e.message); }

    // ── 3. Add hazard columns to parcel_validation_requests ──
    try {
      await client.query(`
        ALTER TABLE parcel_validation_requests
          ADD COLUMN IF NOT EXISTS nearby_hazards JSONB DEFAULT '[]'::jsonb
      `);
      console.log('  [OK] Added nearby_hazards column to parcel_validation_requests');
    } catch (e) { console.log('  [SKIP] alter pvr:', e.message); }

    // ── 4. Indexes ──
    try {
      await client.query('CREATE INDEX IF NOT EXISTS idx_eh_org ON environmental_hazards(organization_id)');
      await client.query('CREATE INDEX IF NOT EXISTS idx_eh_type ON environmental_hazards(hazard_type)');
      await client.query('CREATE INDEX IF NOT EXISTS idx_eh_status ON environmental_hazards(status)');
      await client.query('CREATE INDEX IF NOT EXISTS idx_eh_severity ON environmental_hazards(severity)');
      await client.query('CREATE INDEX IF NOT EXISTS idx_eh_location ON environmental_hazards USING GIST (ST_SetSRID(ST_MakePoint(centroid_lng, centroid_lat), 4326))');
      await client.query('CREATE INDEX IF NOT EXISTS idx_eh_detected ON environmental_hazards(detected_at DESC)');
      await client.query('CREATE INDEX IF NOT EXISTS idx_ha_org ON hazard_alerts(organization_id)');
      await client.query('CREATE INDEX IF NOT EXISTS idx_ha_hazard ON hazard_alerts(hazard_id)');
      console.log('  [OK] Indexes created');
    } catch (e) { console.log('  [SKIP] indexes:', e.message); }

    // ── 5. Enable PostGIS if not already ──
    try {
      await client.query('CREATE EXTENSION IF NOT EXISTS postgis');
      console.log('  [OK] PostGIS extension ready');
    } catch (e) { console.log('  [SKIP] postgis:', e.message); }

    console.log('\nMigration complete!');
  } catch (err) {
    console.error('Migration error:', err.message);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
})();
