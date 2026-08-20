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
  // Approve all existing owners so they can still log in
  const result = await pool.query('UPDATE earthglobal.owners SET approved = true WHERE approved = false RETURNING id, name, email');
  console.log(`Approved ${result.rows.length} existing owners:`, result.rows);
  await pool.end();
})();
