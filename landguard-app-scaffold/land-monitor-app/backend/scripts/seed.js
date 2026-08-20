const { Pool } = require('pg');
const bcrypt = require('bcrypt');

const pool = new Pool({
  host: 'aws-0-eu-west-2.pooler.supabase.com',
  port: 5432,
  user: 'postgres.plvtvsavhqaayjspxmst',
  password: 'Echendaa@2024',
  database: 'postgres',
  ssl: { rejectUnauthorized: false },
});

(async () => {
  const hash = await bcrypt.hash('password123', 10);

  // Seed admin
  try {
    await pool.query(
      'INSERT INTO earthglobal.admins (name, email, password_hash) VALUES ($1, $2, $3) ON CONFLICT (email) DO NOTHING',
      ['Admin User', 'admin@earthglobal.com', hash]
    );
    console.log('Admin seeded: admin@earthglobal.com / password123');
  } catch (e) { console.log('Admin error:', e.message.substring(0, 120)); }

  // Seed agent
  try {
    await pool.query(
      'INSERT INTO earthglobal.agents (name, email, phone, region, password_hash) VALUES ($1, $2, $3, $4, $5) ON CONFLICT (email) DO NOTHING',
      ['Field Agent', 'agent@earthglobal.com', '+233240000000', 'Eastern Region', hash]
    );
    console.log('Agent seeded: agent@earthglobal.com / password123');
  } catch (e) { console.log('Agent error:', e.message.substring(0, 120)); }

  // Seed owner
  try {
    await pool.query(
      'INSERT INTO earthglobal.owners (name, email, phone, password_hash) VALUES ($1, $2, $3, $4) ON CONFLICT (email) DO NOTHING',
      ['Test Owner', 'owner@earthglobal.com', '+233241111111', hash]
    );
    console.log('Owner seeded: owner@earthglobal.com / password123');
  } catch (e) { console.log('Owner error:', e.message.substring(0, 120)); }

  // Verify
  const admins = await pool.query('SELECT email FROM earthglobal.admins');
  console.log('Admins:', admins.rows.map(r => r.email));
  const agents = await pool.query('SELECT email FROM earthglobal.agents');
  console.log('Agents:', agents.rows.map(r => r.email));
  const owners = await pool.query('SELECT email FROM earthglobal.owners');
  console.log('Owners:', owners.rows.map(r => r.email));

  await pool.end();
})();
