require('dotenv').config();
const { Pool } = require('pg');
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_SSL === 'true' ? { rejectUnauthorized: false } : undefined,
});
(async () => {
  const statements = [
    `ALTER TABLE earthglobal.visit_requests ADD COLUMN IF NOT EXISTS agent_notes TEXT`,
    `ALTER TABLE earthglobal.visit_requests ADD COLUMN IF NOT EXISTS survey_session_id UUID REFERENCES earthglobal.survey_sessions(id) ON DELETE SET NULL`,
  ];
  for (const sql of statements) {
    try {
      await pool.query(sql);
      console.log('OK:', sql.substring(0, 80));
    } catch (e) {
      console.log('SKIP:', e.message.substring(0, 100));
    }
  }
  await pool.end();
})();
