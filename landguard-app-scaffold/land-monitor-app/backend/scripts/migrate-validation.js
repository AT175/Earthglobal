/**
 * Migration: Add parcel validation (search validation) infrastructure
 *   - parcel_validation_requests: requests from owners/customers to verify land
 *   - planner_stamps: planner's stamp + signature images
 *
 * Run: node scripts/migrate-validation.js
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
    console.log('Running validation migration...\n');

    // ── 1. Create parcel_validation_requests table ──
    try {
      await client.query(`
        CREATE TABLE IF NOT EXISTS parcel_validation_requests (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,

          -- Requester info (can be an owner in the system or an external customer)
          requester_type VARCHAR(20) NOT NULL DEFAULT 'owner',
          requester_id UUID REFERENCES owners(id) ON DELETE SET NULL,
          requester_name VARCHAR(255) NOT NULL,
          requester_email VARCHAR(255),
          requester_phone VARCHAR(50),

          -- Search parameters provided by the requester
          search_parcel_name VARCHAR(255),
          search_region VARCHAR(255),
          search_coordinates JSONB,
          search_description TEXT,
          search_document_ref VARCHAR(255),

          -- Validation result (filled by planner)
          status VARCHAR(50) NOT NULL DEFAULT 'pending',
          validated_parcel_id UUID REFERENCES parcels(id) ON DELETE SET NULL,
          parcel_exists BOOLEAN,
          parcel_found_name VARCHAR(255),
          parcel_found_owner VARCHAR(255),
          parcel_found_region VARCHAR(255),
          parcel_found_area_sqm DOUBLE PRECISION,
          parcel_found_coordinates JSONB,
          parcel_found_centroid_lat DOUBLE PRECISION,
          parcel_found_centroid_lng DOUBLE PRECISION,
          planner_notes TEXT,
          planner_id UUID REFERENCES assembly_users(id) ON DELETE SET NULL,
          planner_name VARCHAR(255),
          validated_at TIMESTAMPTZ,
          certified_at TIMESTAMPTZ,

          -- Report
          report_url TEXT,
          report_generated_at TIMESTAMPTZ,
          kml_url TEXT,
          google_maps_link TEXT,

          -- Stamp + signature
          stamp_image_url TEXT,
          signature_image_url TEXT,

          created_at TIMESTAMPTZ DEFAULT now(),
          updated_at TIMESTAMPTZ DEFAULT now()
        )
      `);
      console.log('  [OK] parcel_validation_requests table created');
    } catch (e) { console.log('  [SKIP] table:', e.message); }

    // ── 2. Create planner_stamps table ──
    try {
      await client.query(`
        CREATE TABLE IF NOT EXISTS planner_stamps (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
          planner_id UUID NOT NULL REFERENCES assembly_users(id) ON DELETE CASCADE,
          planner_name VARCHAR(255) NOT NULL,
          stamp_image BYTEA,
          stamp_image_type VARCHAR(100),
          signature_image BYTEA,
          signature_image_type VARCHAR(100),
          title VARCHAR(255),
          created_at TIMESTAMPTZ DEFAULT now(),
          updated_at TIMESTAMPTZ DEFAULT now(),
          UNIQUE(organization_id, planner_id)
        )
      `);
      console.log('  [OK] planner_stamps table created');
    } catch (e) { console.log('  [SKIP] stamps table:', e.message); }

    // ── 3. Add validation_status enum for filtering ──
    try {
      await client.query('CREATE INDEX IF NOT EXISTS idx_pvr_org ON parcel_validation_requests(organization_id)');
      await client.query('CREATE INDEX IF NOT EXISTS idx_pvr_status ON parcel_validation_requests(status)');
      await client.query('CREATE INDEX IF NOT EXISTS idx_pvr_requester ON parcel_validation_requests(requester_id)');
      console.log('  [OK] Indexes created');
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
