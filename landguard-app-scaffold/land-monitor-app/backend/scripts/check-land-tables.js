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
  const c = await pool.connect();
  try {
    await c.query('SET search_path TO earthglobal, public, extensions');
    const r = await c.query("SELECT tablename FROM pg_tables WHERE schemaname='earthglobal' AND tablename LIKE 'land%'");
    console.log('Land tables:', r.rows);

    const r2 = await c.query('SELECT count(*) FROM land_listings');
    console.log('Listing count:', r2.rows[0]);

    // Try the exact query from browseListings
    const r3 = await c.query(`SELECT id, title, region, area_sqm, price, currency, centroid_lat, centroid_lng, images, view_count, inquiry_count, published_at, EXTRACT(EPOCH FROM published_at) * 1000 as published_timestamp FROM land_listings WHERE status = 'published'`);
    console.log('Browse query OK, rows:', r3.rows.length);
  } catch (e) {
    console.error('ERROR:', e.message);
  } finally {
    c.release();
    await pool.end();
  }
})();
