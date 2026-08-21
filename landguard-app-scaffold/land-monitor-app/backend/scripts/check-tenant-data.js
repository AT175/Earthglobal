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
  // Check organizations
  const orgs = await pool.query('SELECT id, name, type, region, contact_email, active FROM earthglobal.organizations ORDER BY created_at');
  console.log('=== ORGANIZATIONS ===');
  console.table(orgs.rows);

  // Check assembly_users and their org
  const users = await pool.query(`
    SELECT au.email, au.role, au.active, au.organization_id, o.name as org_name
    FROM earthglobal.assembly_users au
    LEFT JOIN earthglobal.organizations o ON au.organization_id = o.id
    ORDER BY au.created_at
  `);
  console.log('=== ASSEMBLY USERS ===');
  console.table(users.rows);

  // Check which tables have organization_id and whether any rows have NULL org_id
  const tablesWithOrg = ['assembly_users', 'protected_areas', 'revenue_records', 'permits', 'buildings', 'parcel_transactions', 'building_designs', 'alerts', 'parcels'];
  for (const t of tablesWithOrg) {
    try {
      const total = await pool.query(`SELECT COUNT(*) as cnt FROM earthglobal.${t}`);
      const withOrg = await pool.query(`SELECT COUNT(*) as cnt FROM earthglobal.${t} WHERE organization_id IS NOT NULL`);
      const withoutOrg = await pool.query(`SELECT COUNT(*) as cnt FROM earthglobal.${t} WHERE organization_id IS NULL`);
      console.log(`\n=== ${t} ===`);
      console.log(`  Total: ${total.rows[0].cnt}, With org: ${withOrg.rows[0].cnt}, Without org: ${withoutOrg.rows[0].cnt}`);
    } catch (e) {
      console.log(`\n=== ${t} === (skipped: ${e.message})`);
    }
  }

  // Check building_permits specifically
  try {
    const permits = await pool.query(`
      SELECT bp.id, bp.status, bp.organization_id, o.name as org_name
      FROM earthglobal.building_permits bp
      LEFT JOIN earthglobal.organizations o ON bp.organization_id = o.id
    `);
    console.log('\n=== BUILDING_PERMITS ===');
    console.table(permits.rows);
  } catch (e) { console.log('building_permits:', e.message); }

  await pool.end();
})();
