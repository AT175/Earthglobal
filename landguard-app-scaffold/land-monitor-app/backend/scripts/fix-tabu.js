require('dotenv').config();
const { Pool } = require('pg');
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_SSL === 'true' ? { rejectUnauthorized: false } : undefined,
});
(async () => {
  try {
    const r = await pool.query("UPDATE earthglobal.plans SET name = 'Turbo Search' WHERE name = 'Taboo Search'");
    console.log(`Updated ${r.rowCount} row(s): Taboo Search → Turbo Search`);
  } catch (e) {
    console.log('Update error:', e.message.substring(0, 120));
  } finally {
    await pool.end();
  }
})();
