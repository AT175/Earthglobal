require('dotenv').config();
const { Pool } = require('pg');
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_SSL === 'true' ? { rejectUnauthorized: false } : undefined,
});

async function check() {
  // Check building_change_detections columns
  const cols = await pool.query(
    "SELECT column_name, data_type FROM information_schema.columns WHERE table_schema='earthglobal' AND table_name='building_change_detections' ORDER BY ordinal_position"
  );
  console.log('building_change_detections columns:');
  cols.rows.forEach(c => console.log('  -', c.column_name, ':', c.data_type));

  // Check for existing detection records
  const detections = await pool.query(
    'SELECT * FROM earthglobal.building_change_detections ORDER BY 1 DESC LIMIT 5'
  );
  console.log('\nExisting detection records:', detections.rows.length);
  if (detections.rows.length > 0) {
    detections.rows.forEach(d => console.log('  -', JSON.stringify(d).substring(0, 300)));
  }

  // Check organizations table structure
  const orgCols = await pool.query(
    "SELECT column_name, data_type FROM information_schema.columns WHERE table_schema='earthglobal' AND table_name='organizations' ORDER BY ordinal_position"
  );
  console.log('\norganizations columns:');
  orgCols.rows.forEach(c => console.log('  -', c.column_name, ':', c.data_type));

  // Check the org record
  const org = await pool.query('SELECT * FROM earthglobal.organizations WHERE active = true');
  console.log('\nOrganization data:');
  if (org.rows[0]) {
    const o = org.rows[0];
    console.log('  id:', o.id);
    console.log('  name:', o.name);
    console.log('  region:', o.region);
    console.log('  boundary:', o.boundary ? 'has geometry' : 'NULL');
    console.log('  All keys:', Object.keys(o).join(', '));
  }

  await pool.end();
}

check().catch(e => { console.log('Error:', e.message); pool.end(); });
