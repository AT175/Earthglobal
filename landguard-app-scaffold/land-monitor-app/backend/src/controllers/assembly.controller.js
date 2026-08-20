const db = require('../config/db');
const bus = require('../realtime/eventBus');
const { notifyOwnerOfAlert } = require('../services/notificationService');

// ── Helper: get org_id from authenticated assembly user ──
function getOrgId(req) {
  return req.user.organizationId || req.user.organization_id;
}

// ═══════════════════════════════════════════════════════════
// DASHBOARD STATS
// ═══════════════════════════════════════════════════════════

// GET /assembly/stats — overview dashboard numbers
exports.getStats = async (req, res, next) => {
  try {
    const orgId = getOrgId(req);
    if (!orgId) return res.status(400).json({ error: 'No organization associated with this account' });

    const [parcels, buildings, permits, transactions, revenue, alerts, protectedAreas] = await Promise.all([
      db.query('SELECT COUNT(*) FROM parcels WHERE organization_id = $1', [orgId]),
      db.query("SELECT COUNT(*) FROM buildings WHERE organization_id = $1", [orgId]),
      db.query("SELECT COUNT(*) FILTER (WHERE status = 'approved') as approved, COUNT(*) FILTER (WHERE status = 'pending') as pending, COUNT(*) FILTER (WHERE status = 'rejected') as rejected FROM building_permits WHERE organization_id = $1", [orgId]),
      db.query("SELECT COUNT(*) FILTER (WHERE documentation_status = 'proper') as proper, COUNT(*) FILTER (WHERE documentation_status = 'improper') as improper, COUNT(*) FILTER (WHERE documentation_status = 'missing') as missing FROM parcel_transactions WHERE organization_id = $1", [orgId]),
      db.query("SELECT COALESCE(SUM(amount), 0) as total FROM revenue_records WHERE organization_id = $1", [orgId]),
      db.query("SELECT COUNT(*) FILTER (WHERE alert_type = 'unpermitted_building') as unpermitted, COUNT(*) FILTER (WHERE alert_type = 'protected_area_violation') as protected_violations, COUNT(*) FILTER (WHERE verified = false) as unverified FROM alerts WHERE organization_id = $1", [orgId]),
      db.query('SELECT COUNT(*) FROM protected_areas WHERE organization_id = $1 AND active = true', [orgId]),
    ]);

    res.json({
      parcels: parseInt(parcels.rows[0].count),
      buildings: {
        total: parseInt(buildings.rows[0].count),
      },
      permits: {
        approved: parseInt(permits.rows[0].approved),
        pending: parseInt(permits.rows[0].pending),
        rejected: parseInt(permits.rows[0].rejected),
      },
      transactions: {
        proper: parseInt(transactions.rows[0].proper),
        improper: parseInt(transactions.rows[0].improper),
        missing: parseInt(transactions.rows[0].missing),
      },
      revenue: {
        total: parseFloat(revenue.rows[0].total),
      },
      alerts: {
        unpermitted: parseInt(alerts.rows[0].unpermitted),
        protectedViolations: parseInt(alerts.rows[0].protected_violations),
        unverified: parseInt(alerts.rows[0].unverified),
      },
      protectedAreas: parseInt(protectedAreas.rows[0].count),
    });
  } catch (err) {
    next(err);
  }
};

// ═══════════════════════════════════════════════════════════
// BUILDING PERMITS
// ═══════════════════════════════════════════════════════════

// GET /assembly/permits — list permits with optional status filter
exports.listPermits = async (req, res, next) => {
  try {
    const orgId = getOrgId(req);
    const { status, type } = req.query;
    let query = `SELECT id, applicant_name, applicant_phone, permit_type, status, permit_number,
                 estimated_cost, fee_paid, submitted_at, approved_at, expires_at,
                 ST_AsGeoJSON(building_footprint) as footprint_geojson
                 FROM building_permits WHERE organization_id = $1`;
    const params = [orgId];
    let paramCount = 1;

    if (status) { query += ` AND status = $${++paramCount}`; params.push(status); }
    if (type) { query += ` AND permit_type = $${++paramCount}`; params.push(type); }

    query += ' ORDER BY submitted_at DESC LIMIT 100';
    const result = await db.query(query, params);
    res.json(result.rows);
  } catch (err) { next(err); }
};

// POST /assembly/permits — create a new permit application
exports.createPermit = async (req, res, next) => {
  try {
    const orgId = getOrgId(req);
    const { parcel_id, applicant_name, applicant_phone, permit_type, building_description, building_footprint, estimated_cost, fee_paid, expires_at } = req.body;

    const permitNumber = `EG-${Date.now().toString(36).toUpperCase()}`;
    const result = await db.query(
      `INSERT INTO building_permits (organization_id, parcel_id, applicant_name, applicant_phone, permit_type, permit_number, building_description, building_footprint, estimated_cost, fee_paid, expires_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, ST_SetSRID(ST_GeomFromGeoJSON($8), 4326), $9, $10, $11)
       RETURNING id, permit_number, status, submitted_at`,
      [orgId, parcel_id, applicant_name, applicant_phone, permit_type, permitNumber, building_description, JSON.stringify(building_footprint), estimated_cost, fee_paid, expires_at]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) { next(err); }
};

// PATCH /assembly/permits/:id — approve/reject a permit
exports.updatePermitStatus = async (req, res, next) => {
  try {
    const { status, review_notes } = req.body;
    const result = await db.query(
      `UPDATE building_permits SET status = $1, approved_by = $2, approved_at = CASE WHEN $1 = 'approved' THEN now() ELSE approved_at END
       WHERE id = $3 AND organization_id = $4 RETURNING id, permit_number, status`,
      [status, req.user.id, req.params.id, getOrgId(req)]
    );
    if (!result.rows[0]) return res.status(404).json({ error: 'Permit not found' });
    res.json(result.rows[0]);
  } catch (err) { next(err); }
};

// ═══════════════════════════════════════════════════════════
// BUILDINGS (detected from satellite)
// ═══════════════════════════════════════════════════════════

// GET /assembly/buildings — list detected buildings with filters
exports.listBuildings = async (req, res, next) => {
  try {
    const orgId = getOrgId(req);
    const { status, in_protected_area } = req.query;
    let query = `SELECT b.id, b.detected_at, b.area_sqm, b.status, b.in_protected_area, b.verified_at,
                 b.permit_id, b.parcel_id, b.latest_image,
                 ST_AsGeoJSON(b.footprint) as footprint_geojson,
                 p.name as parcel_name
                 FROM buildings b LEFT JOIN parcels p ON b.parcel_id = p.id
                 WHERE b.organization_id = $1`;
    const params = [orgId];
    let paramCount = 1;

    if (status) { query += ` AND b.status = $${++paramCount}`; params.push(status); }
    if (in_protected_area === 'true') { query += ` AND b.in_protected_area = true`; }

    query += ' ORDER BY b.detected_at DESC LIMIT 100';
    const result = await db.query(query, params);
    res.json(result.rows);
  } catch (err) { next(err); }
};

// PATCH /assembly/buildings/:id — verify a building (link to permit or mark unpermitted)
exports.verifyBuilding = async (req, res, next) => {
  try {
    const { status, permit_id, notes } = req.body;
    const result = await db.query(
      `UPDATE buildings SET status = $1, permit_id = $2, verified_by = $3, verified_at = now(), notes = $4
       WHERE id = $5 AND organization_id = $6 RETURNING *`,
      [status, permit_id, req.user.id, notes, req.params.id, getOrgId(req)]
    );
    if (!result.rows[0]) return res.status(404).json({ error: 'Building not found' });
    res.json(result.rows[0]);
  } catch (err) { next(err); }
};

// ═══════════════════════════════════════════════════════════
// PROTECTED AREAS
// ═══════════════════════════════════════════════════════════

// GET /assembly/protected-areas — list protected areas
exports.listProtectedAreas = async (req, res, next) => {
  try {
    const result = await db.query(
      `SELECT id, name, type, description, regulations, active,
       ST_AsGeoJSON(boundary) as boundary_geojson
       FROM protected_areas WHERE organization_id = $1 ORDER BY name`,
      [getOrgId(req)]
    );
    res.json(result.rows);
  } catch (err) { next(err); }
};

// POST /assembly/protected-areas — create a protected area
exports.createProtectedArea = async (req, res, next) => {
  try {
    const { name, type, boundary, description, regulations } = req.body;
    const result = await db.query(
      `INSERT INTO protected_areas (organization_id, name, type, boundary, description, regulations)
       VALUES ($1, $2, $3, ST_SetSRID(ST_GeomFromGeoJSON($4), 4326), $5, $6)
       RETURNING id, name, type, active`,
      [getOrgId(req), name, type, JSON.stringify(boundary), description, regulations]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) { next(err); }
};

// ═══════════════════════════════════════════════════════════
// PARCEL TRANSACTIONS
// ═══════════════════════════════════════════════════════════

// GET /assembly/transactions — list transactions with documentation filter
exports.listTransactions = async (req, res, next) => {
  try {
    const orgId = getOrgId(req);
    const { documentation_status, status } = req.query;
    let query = `SELECT id, seller_name, buyer_name, sale_price, transaction_date,
                 status, documentation_status, stamp_duty_paid, registration_fee_paid,
                 deed_document_url, parcel_id, created_at
                 FROM parcel_transactions WHERE organization_id = $1`;
    const params = [orgId];
    let paramCount = 1;

    if (documentation_status) { query += ` AND documentation_status = $${++paramCount}`; params.push(documentation_status); }
    if (status) { query += ` AND status = $${++paramCount}`; params.push(status); }

    query += ' ORDER BY transaction_date DESC LIMIT 100';
    const result = await db.query(query, params);
    res.json(result.rows);
  } catch (err) { next(err); }
};

// POST /assembly/transactions — record a new transaction
exports.createTransaction = async (req, res, next) => {
  try {
    const { parcel_id, seller_name, buyer_name, seller_phone, buyer_phone, sale_price, transaction_date, documentation_status, deed_document_url, stamp_duty_paid, registration_fee_paid } = req.body;
    const result = await db.query(
      `INSERT INTO parcel_transactions (organization_id, parcel_id, seller_name, buyer_name, seller_phone, buyer_phone, sale_price, transaction_date, documentation_status, deed_document_url, stamp_duty_paid, registration_fee_paid)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
       RETURNING id, status, documentation_status, created_at`,
      [getOrgId(req), parcel_id, seller_name, buyer_name, seller_phone, buyer_phone, sale_price, transaction_date, documentation_status, deed_document_url, stamp_duty_paid, registration_fee_paid]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) { next(err); }
};

// PATCH /assembly/transactions/:id — review/update documentation status
exports.reviewTransaction = async (req, res, next) => {
  try {
    const { documentation_status, status, notes } = req.body;
    const result = await db.query(
      `UPDATE parcel_transactions SET documentation_status = $1, status = $2, reviewed_by = $3, reviewed_at = now(), notes = $4
       WHERE id = $5 AND organization_id = $6 RETURNING *`,
      [documentation_status, status, req.user.id, notes, req.params.id, getOrgId(req)]
    );
    if (!result.rows[0]) return res.status(404).json({ error: 'Transaction not found' });
    res.json(result.rows[0]);
  } catch (err) { next(err); }
};

// ═══════════════════════════════════════════════════════════
// BUILDING DESIGNS (owner-submitted)
// ═══════════════════════════════════════════════════════════

// GET /assembly/designs — list submitted building designs
exports.listDesigns = async (req, res, next) => {
  try {
    const { status } = req.query;
    let query = `SELECT d.id, d.design_name, d.designer_name, d.estimated_cost, d.status, d.submitted_at, d.reviewed_at,
                 d.review_notes, d.design_document_url, d.parcel_id,
                 ST_AsGeoJSON(d.footprint) as footprint_geojson,
                 p.name as parcel_name
                 FROM building_designs d LEFT JOIN parcels p ON d.parcel_id = p.id
                 WHERE d.organization_id = $1`;
    const params = [getOrgId(req)];
    if (status) { query += ` AND d.status = $2`; params.push(status); }
    query += ' ORDER BY d.submitted_at DESC LIMIT 100';
    const result = await db.query(query, params);
    res.json(result.rows);
  } catch (err) { next(err); }
};

// PATCH /assembly/designs/:id — approve/reject a building design
exports.reviewDesign = async (req, res, next) => {
  try {
    const { status, review_notes } = req.body;
    const result = await db.query(
      `UPDATE building_designs SET status = $1, reviewed_by = $2, reviewed_at = now(), review_notes = $3
       WHERE id = $4 AND organization_id = $5 RETURNING *`,
      [status, req.user.id, review_notes, req.params.id, getOrgId(req)]
    );
    if (!result.rows[0]) return res.status(404).json({ error: 'Design not found' });
    res.json(result.rows[0]);
  } catch (err) { next(err); }
};

// ═══════════════════════════════════════════════════════════
// REVENUE
// ═══════════════════════════════════════════════════════════

// GET /assembly/revenue — list revenue records with optional category filter
exports.listRevenue = async (req, res, next) => {
  try {
    const { category } = req.query;
    let query = `SELECT id, category, description, amount, currency, payment_method, payer_name, payer_phone, collected_at
                 FROM revenue_records WHERE organization_id = $1`;
    const params = [getOrgId(req)];
    if (category) { query += ` AND category = $2`; params.push(category); }
    query += ' ORDER BY collected_at DESC LIMIT 100';
    const result = await db.query(query, params);
    res.json(result.rows);
  } catch (err) { next(err); }
};

// GET /assembly/revenue/summary — revenue breakdown by category
exports.revenueSummary = async (req, res, next) => {
  try {
    const result = await db.query(
      `SELECT category, COUNT(*) as count, SUM(amount) as total
       FROM revenue_records WHERE organization_id = $1
       GROUP BY category ORDER BY total DESC`,
      [getOrgId(req)]
    );
    res.json(result.rows);
  } catch (err) { next(err); }
};

// POST /assembly/revenue — record a revenue collection
exports.createRevenue = async (req, res, next) => {
  try {
    const { category, description, amount, currency, payment_method, reference_id, reference_type, payer_name, payer_phone } = req.body;
    const result = await db.query(
      `INSERT INTO revenue_records (organization_id, category, description, amount, currency, payment_method, reference_id, reference_type, collected_by, payer_name, payer_phone)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
       RETURNING id, category, amount, collected_at`,
      [getOrgId(req), category, description, amount, currency || 'GHS', payment_method, reference_id, reference_type, req.user.id, payer_name, payer_phone]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) { next(err); }
};

// ═══════════════════════════════════════════════════════════
// ALERTS (assembly-scoped)
// ═══════════════════════════════════════════════════════════

// GET /assembly/alerts — list alerts for the organization
exports.listAlerts = async (req, res, next) => {
  try {
    const { alert_type } = req.query;
    let query = `SELECT a.id, a.alert_type, a.detected_at, a.verified, a.image_url,
                 a.ndvi_before, a.ndvi_after, a.change_score, a.parcel_id,
                 p.name as parcel_name
                 FROM alerts a LEFT JOIN parcels p ON a.parcel_id = p.id
                 WHERE a.organization_id = $1`;
    const params = [getOrgId(req)];
    if (alert_type) { query += ` AND a.alert_type = $2`; params.push(alert_type); }
    query += ' ORDER BY a.detected_at DESC LIMIT 100';
    const result = await db.query(query, params);
    res.json(result.rows);
  } catch (err) { next(err); }
};
