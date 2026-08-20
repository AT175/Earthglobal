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
  try {
    await pool.query(
      `CREATE TABLE IF NOT EXISTS earthglobal.parcel_images (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        parcel_id UUID NOT NULL REFERENCES earthglobal.parcels(id) ON DELETE CASCADE,
        image_url TEXT NOT NULL,
        ndvi_value NUMERIC(5, 3),
        captured_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        source VARCHAR(50) NOT NULL DEFAULT 'sentinel-2'
      )`
    );
    console.log('parcel_images table created');

    await pool.query('CREATE INDEX IF NOT EXISTS idx_parcel_images_parcel ON earthglobal.parcel_images (parcel_id)');
    await pool.query('CREATE INDEX IF NOT EXISTS idx_parcel_images_date ON earthglobal.parcel_images (captured_at DESC)');
    console.log('Indexes created');

    const r = await pool.query("SELECT table_name FROM information_schema.tables WHERE table_schema = 'earthglobal' ORDER BY table_name");
    console.log('Tables:', r.rows.map(x => x.table_name));

    await pool.end();
  } catch (e) {
    console.error('Error:', e.message);
    await pool.end();
  }
})();
