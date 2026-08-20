const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

const pool = new Pool({
  host: 'aws-0-eu-west-2.pooler.supabase.com',
  port: 5432,
  user: 'postgres.plvtvsavhqaayjspxmst',
  password: 'Echendaa@2024',
  database: 'postgres',
  ssl: { rejectUnauthorized: false },
});

(async () => {
  const schema = fs.readFileSync(path.join(__dirname, '..', '..', 'schema.sql'), 'utf8');

  try {
    await pool.query(schema);
    console.log('Schema migration complete');

    // Verify new tables
    const r = await pool.query("SELECT table_name FROM information_schema.tables WHERE table_schema = 'earthglobal' ORDER BY table_name");
    console.log('Tables:', r.rows.map(x => x.table_name));

    await pool.end();
  } catch (e) {
    console.error('Migration error:', e.message);
    await pool.end();
  }
})();
