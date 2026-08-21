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
  const client = await pool.connect();
  try {
    await client.query("SET search_path TO earthglobal, public, extensions");

    // ── 1. Get or create the organization (tenant) ──
    let orgId;
    const existingOrg = await client.query("SELECT id FROM organizations WHERE name = 'Amansie West District Assembly'");
    if (existingOrg.rows[0]) {
      orgId = existingOrg.rows[0].id;
      console.log('Using existing organization:', orgId);
    } else {
      const orgResult = await client.query(
        `INSERT INTO organizations (name, type, region, contact_email, contact_phone, address)
         VALUES ($1, $2, $3, $4, $5, $6) RETURNING id`,
        ['Amansie West District Assembly', 'district_assembly', 'Ashanti Region', 'assembly@amansie-west.gov.gh', '+233240000001', 'Manso Nkwanta, Ashanti Region, Ghana']
      );
      orgId = orgResult.rows[0].id;
      console.log('Created organization:', orgId);
    }

    // ── 2. Get or create the assembly admin + users ──
    const hash = await bcrypt.hash('password123', 10);
    const users = [
      { name: 'Assembly Admin', email: 'assembly@earthglobal.com', role: 'assembly_admin', phone: '+233240000001' },
      { name: 'Planning Officer', email: 'planning@earthglobal.com', role: 'planning_officer', phone: '+233240000002' },
      { name: 'Revenue Officer', email: 'revenue@earthglobal.com', role: 'revenue_officer', phone: '+233240000003' },
      { name: 'Inspector', email: 'inspector@earthglobal.com', role: 'inspector', phone: '+233240000004' },
    ];
    let adminUserId;
    for (const u of users) {
      const existing = await client.query('SELECT id FROM assembly_users WHERE email = $1', [u.email]);
      if (existing.rows[0]) {
        if (u.role === 'assembly_admin') adminUserId = existing.rows[0].id;
        console.log(`  User exists: ${u.email}`);
      } else {
        const result = await client.query(
          `INSERT INTO assembly_users (organization_id, name, email, phone, password_hash, role)
           VALUES ($1, $2, $3, $4, $5, $6) RETURNING id`,
          [orgId, u.name, u.email, u.phone, hash, u.role]
        );
        if (u.role === 'assembly_admin') adminUserId = result.rows[0].id;
        console.log(`  Created user: ${u.email} / password123 (${u.role})`);
      }
    }

    // ── 3. Get or create an owner (for parcels) ──
    let ownerId;
    const existingOwner = await client.query("SELECT id FROM owners WHERE email = 'owner@earthglobal.com'");
    if (existingOwner.rows[0]) {
      ownerId = existingOwner.rows[0].id;
      // Link owner to this org
      await client.query('UPDATE owners SET organization_id = $1 WHERE id = $2', [orgId, ownerId]);
      console.log('Using existing owner:', ownerId);
    } else {
      const ownerResult = await client.query(
        'INSERT INTO owners (name, email, phone, password_hash, approved, organization_id) VALUES ($1, $2, $3, $4, true, $5) RETURNING id',
        ['Test Owner', 'owner@earthglobal.com', '+233240000000', hash, orgId]
      );
      ownerId = ownerResult.rows[0].id;
      console.log('Created owner:', ownerId);
    }

    // ── 4. Create parcels (linked to org + owner) ──
    const parcels = [
      {
        name: 'Farm at Manso Nkwanta',
        region: 'Ashanti Region',
        boundary: { type: 'Polygon', coordinates: [[[-1.850, 6.200], [-1.845, 6.200], [-1.845, 6.205], [-1.850, 6.205], [-1.850, 6.200]]] },
        survey_date: '2024-01-15',
      },
      {
        name: 'Land at Manso Abena',
        region: 'Ashanti Region',
        boundary: { type: 'Polygon', coordinates: [[[-1.820, 6.210], [-1.815, 6.210], [-1.815, 6.215], [-1.820, 6.215], [-1.820, 6.210]]] },
        survey_date: '2024-02-20',
      },
      {
        name: 'Property at Akwasiase',
        region: 'Ashanti Region',
        boundary: { type: 'Polygon', coordinates: [[[-1.870, 6.190], [-1.865, 6.190], [-1.865, 6.195], [-1.870, 6.195], [-1.870, 6.190]]] },
        survey_date: '2024-03-10',
      },
    ];

    const parcelIds = [];
    for (const p of parcels) {
      const existing = await client.query('SELECT id FROM parcels WHERE name = $1 AND owner_id = $2', [p.name, ownerId]);
      if (existing.rows[0]) {
        parcelIds.push(existing.rows[0].id);
        console.log(`  Parcel exists: ${p.name}`);
      } else {
        const result = await client.query(
          `INSERT INTO parcels (owner_id, organization_id, name, boundary, region, survey_date, area_sqm)
           VALUES ($1, $2, $3, ST_SetSRID(ST_GeomFromGeoJSON($4), 4326), $5, $6, ST_Area(ST_SetSRID(ST_GeomFromGeoJSON($4), 4326)::geography))
           RETURNING id`,
          [ownerId, orgId, p.name, JSON.stringify(p.boundary), p.region, p.survey_date]
        );
        parcelIds.push(result.rows[0].id);
        console.log(`  Created parcel: ${p.name}`);
      }
    }

    // ── 5. Create building permits (org-scoped) ──
    const permits = [
      { parcel_id: parcelIds[0], applicant_name: 'Kwame Asante', applicant_phone: '+233241111111', permit_type: 'residential', status: 'approved', estimated_cost: 80000, fee_paid: 500 },
      { parcel_id: parcelIds[1], applicant_name: 'Ama Serwaa', applicant_phone: '+233242222222', permit_type: 'commercial', status: 'pending', estimated_cost: 250000, fee_paid: 0 },
      { parcel_id: parcelIds[2], applicant_name: 'Kofi Mensah', applicant_phone: '+233243333333', permit_type: 'renovation', status: 'approved', estimated_cost: 45000, fee_paid: 300 },
      { parcel_id: null, applicant_name: 'Yaw Boateng', applicant_phone: '+233244444444', permit_type: 'residential', status: 'rejected', estimated_cost: 60000, fee_paid: 0 },
    ];

    for (const p of permits) {
      const permitNumber = `EG-${Date.now().toString(36).toUpperCase()}-${Math.floor(Math.random() * 1000)}`;
      const footprint = { type: 'Polygon', coordinates: [[[-1.848, 6.202], [-1.846, 6.202], [-1.846, 6.204], [-1.848, 6.204], [-1.848, 6.202]]] };
      const existing = await client.query('SELECT id FROM building_permits WHERE applicant_name = $1 AND organization_id = $2', [p.applicant_name, orgId]);
      if (existing.rows[0]) {
        console.log(`  Permit exists: ${p.applicant_name}`);
      } else {
        await client.query(
          `INSERT INTO building_permits (organization_id, parcel_id, applicant_name, applicant_phone, permit_type, permit_number, building_footprint, estimated_cost, fee_paid, status, approved_by, approved_at, submitted_at)
           VALUES ($1, $2, $3, $4, $5::permit_type, $6, ST_SetSRID(ST_GeomFromGeoJSON($7), 4326), $8, $9, $10::permit_status, $11, CASE WHEN $10 = 'approved' THEN now() ELSE NULL END, now() - INTERVAL '${Math.floor(Math.random() * 30)} days')`,
          [orgId, p.parcel_id, p.applicant_name, p.applicant_phone, p.permit_type, permitNumber, JSON.stringify(footprint), p.estimated_cost, p.fee_paid, p.status, p.status === 'approved' ? adminUserId : null]
        );
        console.log(`  Created permit: ${p.applicant_name} (${p.status})`);
      }
    }

    // ── 6. Create detected buildings (org-scoped) ──
    const buildings = [
      { parcel_id: parcelIds[0], status: 'verified_permitted', in_protected: false, area: 120 },
      { parcel_id: parcelIds[1], status: 'unverified', in_protected: false, area: 85 },
      { parcel_id: null, status: 'verified_unpermitted', in_protected: true, area: 200 },
      { parcel_id: parcelIds[2], status: 'under_investigation', in_protected: false, area: 150 },
    ];

    for (const b of buildings) {
      const footprint = { type: 'Polygon', coordinates: [[[-1.847, 6.203], [-1.8465, 6.203], [-1.8465, 6.2035], [-1.847, 6.2035], [-1.847, 6.203]]] };
      const existing = await client.query('SELECT id FROM buildings WHERE organization_id = $1 AND area_sqm = $2 AND status = $3', [orgId, b.area, b.status]);
      if (existing.rows[0]) {
        console.log(`  Building exists: ${b.status} (${b.area}sqm)`);
      } else {
        await client.query(
          `INSERT INTO buildings (organization_id, parcel_id, footprint, area_sqm, status, in_protected_area, detected_at)
           VALUES ($1, $2, ST_SetSRID(ST_GeomFromGeoJSON($3), 4326), $4, $5::building_status, $6, now() - INTERVAL '${Math.floor(Math.random() * 60)} days')`,
          [orgId, b.parcel_id, JSON.stringify(footprint), b.area, b.status, b.in_protected]
        );
        console.log(`  Created building: ${b.status} (${b.area}sqm)`);
      }
    }

    // ── 7. Create parcel transactions (org-scoped) ──
    const transactions = [
      { parcel_id: parcelIds[0], seller: 'Old Owner 1', buyer: 'Kwame Asante', price: 50000, status: 'completed', doc: 'proper', stamp: 2000, reg: 500 },
      { parcel_id: parcelIds[1], seller: 'Old Owner 2', buyer: 'Ama Serwaa', price: 120000, status: 'pending', doc: 'under_review', stamp: 0, reg: 0 },
      { parcel_id: parcelIds[2], seller: 'Old Owner 3', buyer: 'Kofi Mensah', price: 35000, status: 'completed', doc: 'improper', stamp: 1000, reg: 300 },
    ];

    for (const t of transactions) {
      const existing = await client.query('SELECT id FROM parcel_transactions WHERE organization_id = $1 AND buyer_name = $2', [orgId, t.buyer]);
      if (existing.rows[0]) {
        console.log(`  Transaction exists: ${t.buyer}`);
      } else {
        await client.query(
          `INSERT INTO parcel_transactions (organization_id, parcel_id, seller_name, buyer_name, sale_price, transaction_date, status, documentation_status, stamp_duty_paid, registration_fee_paid)
           VALUES ($1, $2, $3, $4, $5, CURRENT_DATE - INTERVAL '${Math.floor(Math.random() * 90)} days', $6::transaction_status, $7::documentation_status, $8, $9)`,
          [orgId, t.parcel_id, t.seller, t.buyer, t.price, t.status, t.doc, t.stamp, t.reg]
        );
        console.log(`  Created transaction: ${t.buyer} (${t.status})`);
      }
    }

    // ── 8. Create building designs (org-scoped) ──
    const designs = [
      { parcel_id: parcelIds[0], owner_id: ownerId, design_name: '2-Bedroom House', designer: 'ArchiTech Ltd', cost: 80000, status: 'approved' },
      { parcel_id: parcelIds[1], owner_id: ownerId, design_name: 'Commercial Shop', designer: 'BuildRight Co.', cost: 150000, status: 'under_review' },
      { parcel_id: parcelIds[2], owner_id: ownerId, design_name: 'Warehouse Extension', designer: 'ProStruct Ltd', cost: 60000, status: 'submitted' },
    ];

    for (const d of designs) {
      const existing = await client.query('SELECT id FROM building_designs WHERE organization_id = $1 AND design_name = $2', [orgId, d.design_name]);
      if (existing.rows[0]) {
        console.log(`  Design exists: ${d.design_name}`);
      } else {
        await client.query(
          `INSERT INTO building_designs (organization_id, parcel_id, owner_id, design_name, designer_name, estimated_cost, design_document_url, status, submitted_at)
           VALUES ($1, $2, $3, $4, $5, $6, 'https://example.com/designs/${d.design_name.replace(/\s/g, '_').toLowerCase()}.pdf', $7::design_status, now() - INTERVAL '${Math.floor(Math.random() * 30)} days')`,
          [orgId, d.parcel_id, d.owner_id, d.design_name, d.designer, d.cost, d.status]
        );
        console.log(`  Created design: ${d.design_name} (${d.status})`);
      }
    }

    // ── 9. Create alerts (org-scoped) ──
    const alerts = [
      { parcel_id: parcelIds[0], type: 'unpermitted_building', verified: false, ndvi_before: 0.65, ndvi_after: 0.32, score: 0.33 },
      { parcel_id: parcelIds[1], type: 'clearing', verified: true, ndvi_before: 0.72, ndvi_after: 0.41, score: 0.31 },
      { parcel_id: parcelIds[2], type: 'protected_area_violation', verified: false, ndvi_before: 0.68, ndvi_after: 0.35, score: 0.33 },
    ];

    for (const a of alerts) {
      const existing = await client.query('SELECT id FROM alerts WHERE organization_id = $1 AND parcel_id = $2 AND alert_type = $3', [orgId, a.parcel_id, a.type]);
      if (existing.rows[0]) {
        console.log(`  Alert exists: ${a.type} for parcel ${a.parcel_id}`);
      } else {
        await client.query(
          `INSERT INTO alerts (organization_id, parcel_id, alert_type, ndvi_before, ndvi_after, change_score, verified, detected_at)
           VALUES ($1, $2, $3::alert_type, $4, $5, $6, $7, now() - INTERVAL '${Math.floor(Math.random() * 14)} days')`,
          [orgId, a.parcel_id, a.type, a.ndvi_before, a.ndvi_after, a.score, a.verified]
        );
        console.log(`  Created alert: ${a.type} for parcel ${a.parcel_id}`);
      }
    }

    // ── 10. Create protected area (org-scoped) ──
    const existingPA = await client.query("SELECT id FROM protected_areas WHERE name = 'Mamiri Forest Reserve' AND organization_id = $1", [orgId]);
    if (existingPA.rows[0]) {
      console.log('  Protected area exists: Mamiri Forest Reserve');
    } else {
      await client.query(
        `INSERT INTO protected_areas (organization_id, name, type, boundary, description, regulations)
         VALUES ($1, $2, $3::protected_area_type, ST_SetSRID(ST_GeomFromGeoJSON($4), 4326), $5, $6)`,
        [orgId, 'Mamiri Forest Reserve', 'forest_reserve',
         JSON.stringify({ type: 'Polygon', coordinates: [[[-1.85, 6.20], [-1.80, 6.20], [-1.80, 6.25], [-1.85, 6.25], [-1.85, 6.20]]] }),
         'Protected forest reserve — no construction allowed',
         'No building, farming, or logging permitted within boundary']
      );
      console.log('  Created protected area: Mamiri Forest Reserve');
    }

    // ── 11. Create revenue records (org-scoped) ──
    const revenueItems = [
      { category: 'permit_fee', description: 'Building permit — Residential', amount: 500.00 },
      { category: 'permit_fee', description: 'Building permit — Commercial', amount: 1500.00 },
      { category: 'transaction_fee', description: 'Parcel transfer fee', amount: 200.00 },
      { category: 'stamp_duty', description: 'Stamp duty — land sale', amount: 800.00 },
      { category: 'penalty', description: 'Fine — unpermitted construction', amount: 2500.00 },
      { category: 'inspection_fee', description: 'Site inspection fee', amount: 150.00 },
      { category: 'registration_fee', description: 'Land registration fee', amount: 300.00 },
    ];

    for (const r of revenueItems) {
      const existing = await client.query('SELECT id FROM revenue_records WHERE organization_id = $1 AND description = $2', [orgId, r.description]);
      if (existing.rows[0]) {
        console.log(`  Revenue exists: ${r.description}`);
      } else {
        await client.query(
          `INSERT INTO revenue_records (organization_id, category, description, amount, currency, payment_method, payer_name, collected_by, collected_at)
           VALUES ($1, $2::revenue_category, $3, $4, 'GHS', 'cash', 'Test Payer', $5, now() - INTERVAL '${Math.floor(Math.random() * 60)} days')`,
          [orgId, r.category, r.description, r.amount, adminUserId]
        );
        console.log(`  Created revenue: ${r.description} (GHS ${r.amount})`);
      }
    }

    // ── Verify ──
    console.log('\n══════════════════════════════════════════════');
    console.log('VERIFICATION — All data for tenant:', orgId);
    console.log('══════════════════════════════════════════════');

    const tables = ['assembly_users', 'parcels', 'building_permits', 'buildings', 'parcel_transactions', 'building_designs', 'alerts', 'protected_areas', 'revenue_records'];
    for (const t of tables) {
      const total = await client.query(`SELECT COUNT(*) as cnt FROM ${t} WHERE organization_id = $1`, [orgId]);
      const withoutOrg = await client.query(`SELECT COUNT(*) as cnt FROM ${t} WHERE organization_id IS NULL`);
      console.log(`  ${t}: ${total.rows[0].cnt} rows (org-scoped), ${withoutOrg.rows[0].cnt} rows without org`);
    }

    // Check for any orphaned data (rows with NULL org_id in NOT NULL tables)
    console.log('\nData separation check:');
    const orphaned = await client.query(`
      SELECT 'building_permits' as tbl, COUNT(*) as cnt FROM building_permits WHERE organization_id IS NULL
      UNION ALL
      SELECT 'buildings', COUNT(*) FROM buildings WHERE organization_id IS NULL
      UNION ALL
      SELECT 'parcel_transactions', COUNT(*) FROM parcel_transactions WHERE organization_id IS NULL
      UNION ALL
      SELECT 'building_designs', COUNT(*) FROM building_designs WHERE organization_id IS NULL
      UNION ALL
      SELECT 'protected_areas', COUNT(*) FROM protected_areas WHERE organization_id IS NULL
      UNION ALL
      SELECT 'revenue_records', COUNT(*) FROM revenue_records WHERE organization_id IS NULL
      UNION ALL
      SELECT 'assembly_users', COUNT(*) FROM assembly_users WHERE organization_id IS NULL
    `);
    const hasOrphans = orphaned.rows.some(r => parseInt(r.cnt) > 0);
    console.log(hasOrphans ? 'WARNING: Some rows have NULL organization_id!' : 'OK — All tenant data has organization_id set');

    console.log('\nLogin credentials:');
    console.log('  Assembly Admin: assembly@earthglobal.com / password123');
    console.log('  Planning Officer: planning@earthglobal.com / password123');
    console.log('  Revenue Officer: revenue@earthglobal.com / password123');
    console.log('  Inspector: inspector@earthglobal.com / password123');

  } catch (err) {
    console.error('Seed error:', err);
  } finally {
    client.release();
    await pool.end();
  }
})();
