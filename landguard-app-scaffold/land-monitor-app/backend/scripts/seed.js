const { Pool } = require('pg');
const bcrypt = require('bcrypt');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_SSL === 'true' ? { rejectUnauthorized: false } : undefined,
});

const SEED_PASSWORD = process.env.SEED_PASSWORD || '$SEED_PASSWORD';

(async () => {
  const hash = await bcrypt.hash(SEED_PASSWORD, 10);

  // Seed super admin (full platform access, including finance oversight + admin creation)
  try {
    await pool.query(
      `INSERT INTO earthglobal.admins (name, email, password_hash, role)
       VALUES ($1, $2, $3, 'super_admin')
       ON CONFLICT (email) DO UPDATE SET role = 'super_admin'`,
      ['Admin User', 'admin@earthglobal.com', hash]
    );
    console.log('Super admin seeded: admin@earthglobal.com / $SEED_PASSWORD (role: super_admin)');
  } catch (e) { console.log('Super admin error:', e.message.substring(0, 120)); }

  // Seed finance officer (finance dashboard only — cannot create/delete admins)
  try {
    await pool.query(
      `INSERT INTO earthglobal.admins (name, email, password_hash, role)
       VALUES ($1, $2, $3, 'finance_officer')
       ON CONFLICT (email) DO UPDATE SET role = 'finance_officer'`,
      ['Finance Officer', 'finance@earthglobal.com', hash]
    );
    console.log('Finance officer seeded: finance@earthglobal.com / $SEED_PASSWORD (role: finance_officer)');
  } catch (e) { console.log('Finance officer error:', e.message.substring(0, 120)); }

  // Seed agent
  try {
    await pool.query(
      'INSERT INTO earthglobal.agents (name, email, phone, region, password_hash) VALUES ($1, $2, $3, $4, $5) ON CONFLICT (email) DO NOTHING',
      ['Field Agent', 'agent@earthglobal.com', '+233240000000', 'Eastern Region', hash]
    );
    console.log('Agent seeded: agent@earthglobal.com / $SEED_PASSWORD');
  } catch (e) { console.log('Agent error:', e.message.substring(0, 120)); }

  // Seed owner
  try {
    await pool.query(
      'INSERT INTO earthglobal.owners (name, email, phone, password_hash) VALUES ($1, $2, $3, $4) ON CONFLICT (email) DO NOTHING',
      ['Test Owner', 'owner@earthglobal.com', '+233241111111', hash]
    );
    console.log('Owner seeded: owner@earthglobal.com / $SEED_PASSWORD');
  } catch (e) { console.log('Owner error:', e.message.substring(0, 120)); }

  // Verify
  const admins = await pool.query('SELECT email, role FROM earthglobal.admins ORDER BY created_at');
  console.log('Admins:', admins.rows.map(r => `${r.email} (${r.role})`));
  const agents = await pool.query('SELECT email FROM earthglobal.agents');
  console.log('Agents:', agents.rows.map(r => r.email));
  const owners = await pool.query('SELECT email FROM earthglobal.owners');
  console.log('Owners:', owners.rows.map(r => r.email));

  await pool.end();
})();
