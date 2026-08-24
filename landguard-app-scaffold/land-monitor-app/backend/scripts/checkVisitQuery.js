const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_SSL === 'true' ? { rejectUnauthorized: false } : undefined,
});

pool.on('connect', (client) => {
  client.query("SET search_path TO earthglobal, public, extensions");
});

(async () => {
  // Check if media table exists
  const tables = await pool.query(
    "SELECT table_name FROM information_schema.tables WHERE table_schema = 'earthglobal' ORDER BY table_name"
  );
  console.log('All tables:', tables.rows.map((r) => r.table_name));

  // Test the exact visit-requests list query for an owner
  const ownerId = '73074342-3d13-405c-879e-d910e152ea3f';
  try {
    const result = await pool.query(
      `SELECT v.*, p.name as parcel_name, p.region,
              o.name as owner_name, o.phone as owner_phone,
              a.name as agent_name,
              (SELECT COUNT(*) FROM media m WHERE m.visit_request_id = v.id) AS media_count
       FROM visit_requests v
       JOIN parcels p ON v.parcel_id = p.id
       JOIN owners o ON v.owner_id = o.id
       LEFT JOIN agents a ON v.agent_id = a.id
       WHERE v.owner_id = $1 ORDER BY v.requested_at DESC`,
      [ownerId]
    );
    console.log('\nVisit-requests list query: OK (' + result.rows.length + ' rows)');
  } catch (e) {
    console.log('\nVisit-requests list query: ERROR -', e.message);
  }

  await pool.end();
})();
