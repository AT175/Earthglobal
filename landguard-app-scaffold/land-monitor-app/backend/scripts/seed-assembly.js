const { Pool } = require('pg');
const bcrypt = require('bcrypt');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_SSL === 'true' ? { rejectUnauthorized: false } : undefined,
});

const SEED_PASSWORD = process.env.SEED_PASSWORD || '$SEED_PASSWORD';

(async () => {
  const hash = await bcrypt.hash('$SEED_PASSWORD', 10);

  // Create test organization (District Assembly)
  let orgId;
  try {
    const orgResult = await pool.query(
      `INSERT INTO earthglobal.organizations (name, type, region, contact_email, contact_phone, address)
       VALUES ($1, $2, $3, $4, $5, $6)
       ON CONFLICT DO NOTHING RETURNING id`,
      ['Amansie West District Assembly', 'district_assembly', 'Ashanti Region', 'assembly@amansie-west.gov.gh', '+233240000001', 'Manso Nkwanta, Ashanti Region, Ghana']
    );
    if (orgResult.rows[0]) {
      orgId = orgResult.rows[0].id;
      console.log('Organization created:', orgId);
    } else {
      // Get existing org
      const existing = await pool.query("SELECT id FROM earthglobal.organizations WHERE name = 'Amansie West District Assembly'");
      orgId = existing.rows[0]?.id;
      console.log('Organization already exists:', orgId);
    }
  } catch (e) { console.error('Org error:', e.message); }

  if (!orgId) { console.error('No org ID'); await pool.end(); return; }

  // Create assembly users (different roles)
  const users = [
    { name: 'Assembly Admin', email: 'assembly@earthglobal.com', role: 'assembly_admin' },
    { name: 'Planning Officer', email: 'planning@earthglobal.com', role: 'planning_officer' },
    { name: 'Revenue Officer', email: 'revenue@earthglobal.com', role: 'revenue_officer' },
    { name: 'Inspector', email: 'inspector@earthglobal.com', role: 'inspector' },
  ];

  for (const u of users) {
    try {
      await pool.query(
        `INSERT INTO earthglobal.assembly_users (organization_id, name, email, phone, password_hash, role)
         VALUES ($1, $2, $3, $4, $5, $6) ON CONFLICT (email) DO NOTHING`,
        [orgId, u.name, u.email, '+233240000000', hash, u.role]
      );
      console.log(`Assembly user seeded: ${u.email} / $SEED_PASSWORD (${u.role})`);
    } catch (e) { console.error(`User ${u.email}:`, e.message); }
  }

  // Create a sample protected area
  try {
    await pool.query(
      `INSERT INTO earthglobal.protected_areas (organization_id, name, type, boundary, description, regulations)
       VALUES ($1, $2, $3, ST_SetSRID(ST_GeomFromGeoJSON($4), 4326), $5, $6) ON CONFLICT DO NOTHING`,
      [orgId, 'Mamiri Forest Reserve', 'forest_reserve',
       JSON.stringify({ type: 'Polygon', coordinates: [[[-1.85, 6.20], [-1.80, 6.20], [-1.80, 6.25], [-1.85, 6.25], [-1.85, 6.20]]] }),
       'Protected forest reserve — no construction allowed',
       'No building, farming, or logging permitted within boundary']
    );
    console.log('Protected area seeded: Mamiri Forest Reserve');
  } catch (e) { console.error('Protected area:', e.message); }

  // Create sample revenue records
  const revenueItems = [
    { category: 'permit_fee', description: 'Building permit — Residential', amount: 500.00 },
    { category: 'permit_fee', description: 'Building permit — Commercial', amount: 1500.00 },
    { category: 'transaction_fee', description: 'Parcel transfer fee', amount: 200.00 },
    { category: 'stamp_duty', description: 'Stamp duty — land sale', amount: 800.00 },
    { category: 'penalty', description: 'Fine — unpermitted construction', amount: 2500.00 },
    { category: 'inspection_fee', description: 'Site inspection fee', amount: 150.00 },
  ];

  for (const r of revenueItems) {
    try {
      await pool.query(
        `INSERT INTO earthglobal.revenue_records (organization_id, category, description, amount, currency, payment_method, payer_name, collected_by)
         VALUES ($1, $2, $3, $4, 'GHS', 'cash', 'Test Payer', NULL)`,
        [orgId, r.category, r.description, r.amount]
      );
    } catch (e) {}
  }
  console.log('Revenue records seeded:', revenueItems.length, 'items');

  // Verify
  const orgs = await pool.query('SELECT id, name, region FROM earthglobal.organizations');
  console.log('Organizations:', orgs.rows);
  const asmUsers = await pool.query('SELECT email, role FROM earthglobal.assembly_users');
  console.log('Assembly users:', asmUsers.rows);

  await pool.end();
})();
