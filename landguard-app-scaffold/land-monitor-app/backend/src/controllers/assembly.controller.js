const db = require('../config/db');
const bcrypt = require('bcrypt');
const bus = require('../realtime/eventBus');
const { notifyOwnerOfAlert } = require('../services/notificationService');
const { ee, init: initEE, isReady: eeReady } = require('../config/earthEngine');
const { resolveFAOBoundary, getGeometryBbox, listGhanaDistricts, listGhanaRegions, getDistrictBoundaryByName } = require('../config/faoBoundary');
const { runBuildingChangeDetection } = require('../jobs/buildingChangeDetection');
const { estimateBuildingHeight, compareNearbyBuildings } = require('../utils/buildingHeight');
const { validateBuilding, validateBuildingsBatch } = require('../config/buildingValidation');

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
                 b.estimated_height_m, b.estimated_floors, b.height_method,
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

// ═══════════════════════════════════════════════════════════
// USER MANAGEMENT (org-scoped — assembly_admin only)
// ═══════════════════════════════════════════════════════════

// GET /assembly/users — list users in this organization
exports.listUsers = async (req, res, next) => {
  try {
    const orgId = getOrgId(req);
    if (!orgId) return res.status(400).json({ error: 'No organization associated with this account' });

    const result = await db.query(
      `SELECT id, name, email, phone, role as assembly_role, active, created_at
       FROM assembly_users WHERE organization_id = $1 ORDER BY created_at DESC`,
      [orgId]
    );
    res.json(result.rows);
  } catch (err) { next(err); }
};

// POST /assembly/users — create a new user in this organization
exports.createUser = async (req, res, next) => {
  try {
    const orgId = getOrgId(req);
    if (!orgId) return res.status(400).json({ error: 'No organization associated with this account' });

    const { name, email, phone, password, role } = req.body;
    if (!name || !email || !password) {
      return res.status(400).json({ error: 'Name, email, and password are required' });
    }

    const existing = await db.query('SELECT email FROM assembly_users WHERE email = $1', [email]);
    if (existing.rows[0]) return res.status(409).json({ error: 'An account with this email already exists' });

    const hash = await bcrypt.hash(password, 10);
    const result = await db.query(
      `INSERT INTO assembly_users (organization_id, name, email, phone, password_hash, role)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING id, name, email, phone, role as assembly_role, active, created_at`,
      [orgId, name, email, phone, hash, role || 'planning_officer']
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    if (err.code === '23505') return res.status(409).json({ error: 'Email already exists' });
    next(err);
  }
};

// PATCH /assembly/users/:id — update user (activate/deactivate, change role, edit info)
exports.updateUser = async (req, res, next) => {
  try {
    const orgId = getOrgId(req);
    const { name, phone, role, active } = req.body;

    const existing = await db.query('SELECT id FROM assembly_users WHERE id = $1 AND organization_id = $2', [req.params.id, orgId]);
    if (!existing.rows[0]) return res.status(404).json({ error: 'User not found in your organization' });

    const result = await db.query(
      `UPDATE assembly_users SET
         name = COALESCE($1, name),
         phone = COALESCE($2, phone),
         role = COALESCE($3, role),
         active = COALESCE($4, active)
       WHERE id = $5 AND organization_id = $6
       RETURNING id, name, email, phone, role as assembly_role, active`,
      [name, phone, role, active, req.params.id, orgId]
    );
    res.json(result.rows[0]);
  } catch (err) { next(err); }
};

// DELETE /assembly/users/:id — delete user from this organization
exports.deleteUser = async (req, res, next) => {
  try {
    const orgId = getOrgId(req);

    if (req.params.id === req.user.id) {
      return res.status(400).json({ error: 'You cannot delete your own account' });
    }

    const existing = await db.query('SELECT id FROM assembly_users WHERE id = $1 AND organization_id = $2', [req.params.id, orgId]);
    if (!existing.rows[0]) return res.status(404).json({ error: 'User not found in your organization' });

    await db.query('DELETE FROM assembly_users WHERE id = $1 AND organization_id = $2', [req.params.id, orgId]);
    res.json({ success: true });
  } catch (err) { next(err); }
};

// GET /assembly/organization — get current organization info
exports.getOrganization = async (req, res, next) => {
  try {
    const orgId = getOrgId(req);
    if (!orgId) return res.status(400).json({ error: 'No organization associated with this account' });

    const result = await db.query(
      `SELECT id, name, type, region, contact_email, contact_phone, address, active, created_at
       FROM organizations WHERE id = $1`,
      [orgId]
    );
    if (!result.rows[0]) return res.status(404).json({ error: 'Organization not found' });
    res.json(result.rows[0]);
  } catch (err) { next(err); }
};

// ═══════════════════════════════════════════════════════════
// PLANNING OFFICER — GEODATABASE + BUILDING DETECTION
// ═══════════════════════════════════════════════════════════

// GET /assembly/planning/parcels-geojson — all parcels as GeoJSON FeatureCollection
exports.getParcelsGeoJSON = async (req, res, next) => {
  try {
    const orgId = getOrgId(req);
    const result = await db.query(
      `SELECT id, name, region, area_sqm, survey_date, owner_id, metadata,
              centroid_lat, centroid_lng,
              ST_AsGeoJSON(boundary) as geojson,
              (SELECT name FROM owners WHERE id = p.owner_id) as owner_name
       FROM parcels p WHERE p.organization_id = $1 ORDER BY p.created_at DESC`,
      [orgId]
    );

    const features = result.rows.map((row) => ({
      type: 'Feature',
      geometry: JSON.parse(row.geojson),
      properties: {
        id: row.id,
        name: row.name,
        region: row.region,
        area_sqm: parseFloat(row.area_sqm) || 0,
        owner_name: row.owner_name,
        owner_id: row.owner_id,
        survey_date: row.survey_date,
        centroid_lat: row.centroid_lat,
        centroid_lng: row.centroid_lng,
        metadata: row.metadata || {},
      },
    }));

    res.json({ type: 'FeatureCollection', features });
  } catch (err) { next(err); }
};

// GET /assembly/planning/buildings-geojson — all detected buildings as GeoJSON
exports.getBuildingsGeoJSON = async (req, res, next) => {
  try {
    const orgId = getOrgId(req);
    const result = await db.query(
      `SELECT b.id, b.area_sqm, b.status, b.in_protected_area, b.detected_at,
              b.verified_at, b.notes, b.permit_id, b.parcel_id, b.metadata,
              b.centroid_lat, b.centroid_lng,
              b.estimated_height_m, b.estimated_floors, b.height_method, b.height_confidence,
              b.validation_status, b.validated_at, b.google_confidence, b.google_match_distance_m,
              b.osm_id, b.osm_match_distance_m, b.building_type, b.building_use, b.building_name,
              b.owner_name, b.owner_contact, b.validation_sources,
              ST_AsGeoJSON(b.footprint) as geojson,
              (SELECT name FROM parcels WHERE id = b.parcel_id) as parcel_name
       FROM buildings b WHERE b.organization_id = $1 ORDER BY b.detected_at DESC`,
      [orgId]
    );

    const features = result.rows.map((row) => ({
      type: 'Feature',
      geometry: JSON.parse(row.geojson),
      properties: {
        id: row.id,
        area_sqm: parseFloat(row.area_sqm) || 0,
        status: row.status,
        in_protected_area: row.in_protected_area,
        detected_at: row.detected_at,
        verified_at: row.verified_at,
        notes: row.notes,
        parcel_name: row.parcel_name,
        centroid_lat: row.centroid_lat,
        centroid_lng: row.centroid_lng,
        estimated_height_m: row.estimated_height_m ? parseFloat(row.estimated_height_m) : null,
        estimated_floors: row.estimated_floors || null,
        height_method: row.height_method || null,
        height_confidence: row.height_confidence ? parseFloat(row.height_confidence) : null,
        // Validation & enrichment fields
        validation_status: row.validation_status || 'pending',
        validated_at: row.validated_at,
        google_confidence: row.google_confidence ? parseFloat(row.google_confidence) : null,
        google_match_distance_m: row.google_match_distance_m ? parseFloat(row.google_match_distance_m) : null,
        osm_id: row.osm_id || null,
        osm_match_distance_m: row.osm_match_distance_m ? parseFloat(row.osm_match_distance_m) : null,
        building_type: row.building_type || null,
        building_use: row.building_use || null,
        building_name: row.building_name || null,
        owner_name: row.owner_name || null,
        owner_contact: row.owner_contact || null,
        validation_sources: row.validation_sources || [],
        metadata: row.metadata || {},
      },
    }));

    res.json({ type: 'FeatureCollection', features });
  } catch (err) { next(err); }
};

// GET /assembly/planning/protected-areas-geojson — protected areas as GeoJSON
exports.getProtectedAreasGeoJSON = async (req, res, next) => {
  try {
    const orgId = getOrgId(req);
    const result = await db.query(
      `SELECT id, name, type, description, regulations, active,
              ST_AsGeoJSON(boundary) as geojson
       FROM protected_areas WHERE organization_id = $1 AND active = true`,
      [orgId]
    );

    const features = result.rows.map((row) => ({
      type: 'Feature',
      geometry: JSON.parse(row.geojson),
      properties: {
        id: row.id,
        name: row.name,
        type: row.type,
        description: row.description,
        regulations: row.regulations,
      },
    }));

    res.json({ type: 'FeatureCollection', features });
  } catch (err) { next(err); }
};

// GET /assembly/planning/district-boundary — org boundary as GeoJSON (for map overlay)
exports.getDistrictBoundary = async (req, res, next) => {
  try {
    const orgId = getOrgId(req);
    const result = await db.query(
      `SELECT id, name, region, type,
              ST_AsGeoJSON(boundary) as geojson
       FROM organizations WHERE id = $1 AND boundary IS NOT NULL`,
      [orgId]
    );

    if (!result.rows[0]) {
      // No boundary set — return org info without geometry
      const orgResult = await db.query('SELECT id, name, region, type FROM organizations WHERE id = $1', [orgId]);
      return res.json({ ...orgResult.rows[0], boundary: null });
    }

    res.json({
      id: result.rows[0].id,
      name: result.rows[0].name,
      region: result.rows[0].region,
      type: result.rows[0].type,
      boundary: JSON.parse(result.rows[0].geojson),
    });
  } catch (err) { next(err); }
};

// GET /assembly/planning/fao-districts — list all Ghana districts + regions from FAO GAUL 2015
exports.listFAODistricts = async (req, res, next) => {
  try {
    const ready = await initEE();
    if (!ready) {
      return res.status(503).json({
        error: 'Earth Engine is not configured. Set EE_SERVICE_ACCOUNT_JSON to enable FAO boundary lookup.',
        districts: [],
        regions: [],
      });
    }

    const [districts, regions] = await Promise.all([
      listGhanaDistricts(),
      listGhanaRegions(),
    ]);

    res.json({ districts, regions });
  } catch (err) { next(err); }
};

// GET /assembly/planning/fao-district-boundary?name=...&level=district|region
// Returns the GeoJSON boundary + bbox for a specific Ghana district/region
exports.getFAODistrictBoundary = async (req, res, next) => {
  try {
    const { name } = req.query;
    if (!name) {
      return res.status(400).json({ error: 'Missing "name" query parameter' });
    }

    const ready = await initEE();
    if (!ready) {
      return res.status(503).json({
        error: 'Earth Engine is not configured. Set EE_SERVICE_ACCOUNT_JSON to enable FAO boundary lookup.',
      });
    }

    const boundary = await getDistrictBoundaryByName(name);
    if (!boundary) {
      return res.status(404).json({ error: `District/region "${name}" not found in FAO GAUL 2015` });
    }

    res.json({
      name,
      level: boundary.level,
      boundary: boundary.geojson,
      bbox: boundary.bbox,
    });
  } catch (err) { next(err); }
};

// POST /assembly/planning/detect-buildings — run EE building detection over an area
// Uses Google Earth Engine to detect buildings via ML.
// If no bbox is provided, uses the FAO GAUL 2015 boundary for the organization's
// district/region as the default area for initial building extraction.
// If districtName is provided, uses that specific district's FAO boundary.
// Vectorizes detected built-up clusters into polygons, saves to DB with centroid + metadata.
exports.detectBuildings = async (req, res, next) => {
  try {
    const orgId = getOrgId(req);
    const { bbox, useFAOBoundary, districtName } = req.body;

    const ready = await initEE();
    if (!ready) {
      return res.status(503).json({
        error: 'Earth Engine is not configured. Set EE_SERVICE_ACCOUNT_JSON to enable building detection.',
        detected: false,
      });
    }

    // ── Resolve the region geometry ──
    // Priority:
    //   1. Explicit districtName from the request (FAO boundary for selected district)
    //   2. Explicit bbox from the request (map viewport / drawn box)
    //   3. FAO GAUL 2015 boundary (default for initial extraction)
    //   4. Organization's stored boundary
    let region;
    let resolvedBbox = bbox;
    let boundarySource = 'bbox';

    if (districtName) {
      // Use the selected district's FAO boundary
      boundarySource = 'fao_gaul_2015_level2';
      const boundary = await getDistrictBoundaryByName(districtName);
      if (!boundary) {
        return res.status(404).json({
          error: `District "${districtName}" not found in FAO GAUL 2015`,
          detected: false,
        });
      }
      region = ee.Geometry(boundary.geojson);
      resolvedBbox = boundary.bbox;
      boundarySource = boundary.level === 'region' ? 'fao_gaul_2015_level1' : 'fao_gaul_2015_level2';
      console.log(`[detectBuildings] Using selected FAO boundary (${boundarySource}): ${districtName}`);
    } else if (bbox) {
      const [minLng, minLat, maxLng, maxLat] = [bbox.minLng, bbox.minLat, bbox.maxLng, bbox.maxLat];
      region = ee.Geometry.Rectangle([minLng, minLat, maxLng, maxLat], 'EPSG:4326', false);
      boundarySource = 'map_bbox';
    } else {
      // Use FAO GAUL 2015 boundary as default
      boundarySource = 'fao_gaul_2015';

      // Get org info for FAO boundary resolution
      const orgResult = await db.query(
        'SELECT name, region, ST_AsGeoJSON(boundary) as boundary_geojson FROM organizations WHERE id = $1',
        [orgId]
      );
      const org = orgResult.rows[0];

      if (!org) {
        return res.status(404).json({ error: 'Organization not found', detected: false });
      }

      // Try FAO GAUL 2015 boundary first
      const faoGeometry = await resolveFAOBoundary(org);

      if (faoGeometry) {
        region = faoGeometry;
        // Get the bbox of the FAO boundary for stats/tile purposes
        try {
          resolvedBbox = await getGeometryBbox(faoGeometry);
        } catch (e) {
          console.error('[detectBuildings] Failed to get FAO bbox:', e.message);
        }

        // Determine which FAO level matched
        const orgNameNorm = org.name?.toLowerCase() || '';
        const hasDistrict = orgNameNorm.includes('district') || orgNameNorm.includes('municipal') || orgNameNorm.includes('metro');
        boundarySource = hasDistrict ? 'fao_gaul_2015_level2' : 'fao_gaul_2015_level1';

        console.log(`[detectBuildings] Using FAO GAUL 2015 boundary (${boundarySource}) for org: ${org.name}`);
      } else if (org.boundary_geojson) {
        // Fall back to org's stored boundary
        const orgGeojson = JSON.parse(org.boundary_geojson);
        region = ee.Geometry(orgGeojson);
        boundarySource = 'org_boundary';
        console.log(`[detectBuildings] FAO boundary not found, using org boundary for: ${org.name}`);
      } else {
        return res.status(400).json({
          error: 'No bbox provided and could not resolve FAO GAUL 2015 boundary or org boundary. Provide a bbox or set up the organization boundary.',
          detected: false,
        });
      }
    }

    // ── Building detection approach ──
    // 1. Use Sentinel-2 composite for the area
    const s2 = ee.ImageCollection('COPERNICUS/S2_HARMONIZED')
      .filterDate('2024-01-01', '2025-12-31')
      .filter(ee.Filter.lt('CLOUDY_PIXEL_PERCENTAGE', 15))
      .filterBounds(region)
      .median();

    // 2. Compute building indices:
    //    - NDBI (Normalized Difference Built-up Index) = (SWIR1 - NIR) / (SWIR1 + NIR)
    //      B11 (SWIR1) = 1610nm, B8 (NIR) = 842nm
    //    - NDVI to mask out vegetation
    //    - BSI (Bare Soil Index)
    const ndbi = s2.normalizedDifference(['B11', 'B8']).rename('ndbi');
    const ndvi = s2.normalizedDifference(['B8', 'B4']).rename('ndvi');
    const bsi = s2.expression(
      '((SWIR1 + Red) - (NIR + Blue)) / ((SWIR1 + Red) + (NIR + Blue))',
      { SWIR1: s2.select('B11'), Red: s2.select('B4'), NIR: s2.select('B8'), Blue: s2.select('B2') }
    ).rename('bsi');

    // 3. Built-up mask: high NDBI + low NDVI (not vegetation) + high BSI
    const builtup = ndbi.gt(0.05).and(ndvi.lt(0.2)).and(bsi.gt(0.1)).rename('builtup');

    // 4. Get pixel-by-pixel classification as an image for visualization
    const builtupVis = builtup.visualize({ palette: ['000000', 'ff0000'], min: 0, max: 1 });

    // 5. Get map ID for tile serving (so frontend can overlay the detection result)
    builtupVis.getMapId({ min: 0, max: 255 }, (result, err) => {
      if (err || !result || !result.mapid) {
        console.error('EE building detection getMapId failed:', err ? String(err).substring(0, 200) : 'no mapid');
        return res.status(500).json({ error: 'Building detection failed', detected: false });
      }

      const tileUrl = result.urlFormat || `https://earthengine.googleapis.com/v1/${result.mapid}/tiles/{z}/{x}/{y}`;

      // 6. Compute statistics: count of built-up pixels in the region
      //    Each Sentinel-2 pixel = 10m x 10m = 100 sqm
      const stats = builtup.reduceRegion({
        reducer: ee.Reducer.count(),
        geometry: region,
        scale: 10,
        maxPixels: 1e13,
      });

      // 7. Vectorize: use reduceToVectors to extract built-up clusters as polygons
      const vectors = builtup.addBands(s2.select('B4')).reduceToVectors({
        geometry: region,
        scale: 10,
        geometryType: 'polygon',
        eightConnected: true,
        labelProperty: 'builtup',
        reducer: ee.Reducer.count(),
        maxPixels: 1e13,
      });

      // Filter to only built-up polygons (label = 1) with minimum area (avoid noise)
      const builtUpPolygons = vectors.filter(ee.Filter.eq('builtup', 1))
        .filter(ee.Filter.gte('count', 5)); // at least 5 pixels = 500sqm

      // Get the vectorized features as a list with geometry
      const featureCollection = builtUpPolygons.geometry();

      stats.evaluate((result, evalErr) => {
        const builtupPixels = result?.ndbi || 0;
        const builtupAreaSqm = builtupPixels * 100; // 10m x 10m pixels
        const estimatedBuildings = Math.max(1, Math.round(builtupAreaSqm / 120)); // avg building ~120sqm

        // Try to extract vectorized polygons for saving to DB
        builtUpPolygons.toList(500).evaluate(async (features, featErr) => {
          const savedBuildings = [];

          if (!featErr && features && features.length > 0) {
            // Save each detected building polygon to the database
            // Process in batches of 25 for height estimation (EE calls are rate-limited)
            for (const feat of features.slice(0, 200)) { // cap at 200 per detection
              try {
                const geom = feat.geometry;
                const coords = geom?.coordinates;

                if (!coords || !coords[0] || coords[0].length < 4) continue;

                // Build GeoJSON Polygon
                const geojson = {
                  type: 'Polygon',
                  coordinates: coords[0] ? [coords[0].map(c => [c[0], c[1]])] : coords,
                };

                // Compute centroid
                const lats = geojson.coordinates[0].map(c => c[1]);
                const lngs = geojson.coordinates[0].map(c => c[0]);
                const centroidLat = lats.reduce((a, b) => a + b, 0) / lats.length;
                const centroidLng = lngs.reduce((a, b) => a + b, 0) / lngs.length;

                // ── Estimate building height (shadow + DEM) ──
                let heightData = { height_m: null, estimated_floors: null, confidence: 0, method: 'none' };
                try {
                  heightData = await estimateBuildingHeight(s2, region, { lat: centroidLat, lng: centroidLng });
                } catch (e) {
                  // Height estimation is best-effort — don't fail the whole detection
                }

                // ── Compare to nearby existing buildings ──
                let comparisonData = null;
                try {
                  comparisonData = await compareNearbyBuildings(db, orgId, { lat: centroidLat, lng: centroidLng }, 0, 500);
                } catch (e) {
                  // Comparison is best-effort
                }

                // ── Validate against Google Open Buildings + OSM ──
                let validationData = {
                  validation_status: 'pending',
                  validation_sources: [],
                  validation_detail: { error: 'skipped' },
                };
                try {
                  validationData = await validateBuilding(geojson, { lat: centroidLat, lng: centroidLng }, { db, orgId });
                } catch (e) {
                  // Validation is best-effort — don't fail the save
                }

                // Compute area in sqm using ST_Area on geography
                const insertResult = await db.query(
                  `INSERT INTO buildings (organization_id, footprint, area_sqm, status, in_protected_area, detected_at, centroid_lat, centroid_lng, metadata,
                                           estimated_height_m, estimated_floors, height_method, height_confidence,
                                           validation_status, validated_at, google_confidence, google_match_distance_m,
                                           osm_id, osm_match_distance_m, building_type, building_use, building_name,
                                           owner_name, owner_contact, parcel_owner_id, validation_sources)
                   VALUES ($1, ST_SetSRID(ST_GeomFromGeoJSON($2), 4326), ST_Area(ST_SetSRID(ST_GeomFromGeoJSON($2), 4326)::geography), 'unverified', false, now(), $3, $4, $5, $6, $7, $8, $9,
                           $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22)
                   RETURNING id, area_sqm, centroid_lat, centroid_lng, estimated_height_m, estimated_floors, validation_status, building_type`,
                  [orgId, JSON.stringify(geojson), centroidLat, centroidLng, JSON.stringify({
                    detection_method: 'sentinel2_ndbi_ndvi_bsi',
                    detection_date: new Date().toISOString(),
                    detection_bbox: resolvedBbox,
                    boundary_source: boundarySource,
                    pixel_count: feat.properties?.count || 0,
                    source: 'earth_engine',
                    height_estimation: heightData,
                    nearby_comparison: comparisonData,
                    validation: validationData.validation_detail,
                  }), heightData.height_m, heightData.estimated_floors, heightData.method, heightData.confidence,
                   validationData.validation_status,
                   validationData.validated_at,
                   validationData.google_confidence,
                   validationData.google_match_distance_m,
                   validationData.osm_id,
                   validationData.osm_match_distance_m,
                   validationData.building_type,
                   validationData.building_use,
                   validationData.building_name,
                   validationData.owner_name,
                   validationData.owner_contact,
                   validationData.parcel_owner_id,
                   validationData.validation_sources || [],
                  ]
                );

                const saved = insertResult.rows[0];
                savedBuildings.push({
                  id: saved.id,
                  area_sqm: parseFloat(saved.area_sqm),
                  centroid_lat: saved.centroid_lat,
                  centroid_lng: saved.centroid_lng,
                  estimated_height_m: saved.estimated_height_m ? parseFloat(saved.estimated_height_m) : null,
                  estimated_floors: saved.estimated_floors || null,
                  height_method: heightData.method,
                  nearby_comparison: comparisonData,
                  validation_status: saved.validation_status,
                  building_type: saved.building_type,
                  google_confidence: validationData.google_confidence,
                  osm_id: validationData.osm_id,
                });
              } catch (e) {
                // Skip individual building save errors
              }
            }
          }

          res.json({
            detected: true,
            tileUrl,
            token: map.token,
            bbox: resolvedBbox,
            boundary_source: boundarySource,
            stats: {
              builtup_pixels: builtupPixels,
              builtup_area_sqm: builtupAreaSqm,
              estimated_buildings: estimatedBuildings,
              vectorized_buildings: savedBuildings.length,
              validated: savedBuildings.filter(b => b.validation_status === 'validated').length,
              pending_validation: savedBuildings.filter(b => b.validation_status === 'pending').length,
            },
            saved_buildings: savedBuildings,
            method: 'Sentinel-2 NDBI + NDVI + BSI classification + vectorization via Google Earth Engine',
            boundary: boundarySource === 'fao_gaul_2015_level2'
              ? 'FAO GAUL 2015 Level 2 (District) boundary'
              : boundarySource === 'fao_gaul_2015_level1'
              ? 'FAO GAUL 2015 Level 1 (Region) boundary'
              : boundarySource === 'fao_gaul_2015'
              ? 'FAO GAUL 2015 boundary'
              : boundarySource === 'org_boundary'
              ? 'Organization boundary'
              : 'Map viewport bbox',
            attribution: 'Building detection &copy; Copernicus Sentinel-2 via Google Earth Engine. Boundary &copy; FAO GAUL 2015.',
          });
        });
      });
    });
  } catch (err) {
    console.error('Building detection error:', err.message);
    res.status(500).json({ error: 'Building detection failed', detected: false });
  }
};

// GET /assembly/planning/satellite-tiles — get EE satellite tile URL for the org area
exports.getSatelliteTiles = async (req, res, next) => {
  // Hard timeout — if EE doesn't respond in 20s, return fallback so the
  // client gets a proper CORS-compliant response instead of a hung request.
  let settled = false;
  const timeout = setTimeout(() => {
    if (settled) return;
    settled = true;
    res.json({ url: null, provider: 'fallback', reason: 'timeout' });
  }, 20000);

  try {
    const { bbox } = req.query;
    const ready = await initEE();
    if (!ready) {
      if (settled) return;
      settled = true;
      clearTimeout(timeout);
      return res.json({ url: null, provider: 'fallback' });
    }

    const collection = ee.ImageCollection('COPERNICUS/S2_HARMONIZED')
      .filterDate('2024-01-01', '2025-12-31')
      .filter(ee.Filter.lt('CLOUDY_PIXEL_PERCENTAGE', 20));

    let filtered = collection;
    if (bbox) {
      const parts = bbox.split(',').map(parseFloat);
      if (parts.length === 4 && !parts.some(isNaN)) {
        const [minLng, minLat, maxLng, maxLat] = parts;
        const region = ee.Geometry.Rectangle([minLng, minLat, maxLng, maxLat], 'EPSG:4326', false);
        filtered = collection.filterBounds(region);
      }
    }

    const composite = filtered.median();
    const visualized = composite.visualize({ bands: ['B4', 'B3', 'B2'], min: 0, max: 3000, gamma: 1.4 });

    visualized.getMapId({ min: 0, max: 255 }, (result, err) => {
      if (settled) return;
      settled = true;
      clearTimeout(timeout);
      if (err || !result || !result.mapid) {
        return res.json({ url: null, provider: 'fallback' });
      }
      res.json({
        url: result.urlFormat || `https://earthengine.googleapis.com/v1/${result.mapid}/tiles/{z}/{x}/{y}`,
        token: result.token,
        provider: 'earth-engine',
        attribution: 'Imagery &copy; Copernicus Sentinel-2 via Google Earth Engine',
      });
    });
  } catch (err) {
    if (settled) return;
    settled = true;
    clearTimeout(timeout);
    res.json({ url: null, provider: 'fallback' });
  }
};

// POST /assembly/planning/validate-buildings — validate existing buildings against Google + OSM
// Body: { buildingIds?: [uuid], limit?: number }
// If no buildingIds provided, validates all 'pending' buildings up to limit (default 50)
exports.validateBuildings = async (req, res, next) => {
  try {
    const orgId = getOrgId(req);
    const { buildingIds, limit = 50 } = req.body;

    let query, params;
    if (buildingIds && Array.isArray(buildingIds) && buildingIds.length > 0) {
      query = `SELECT id, ST_AsGeoJSON(footprint) as geojson, centroid_lat, centroid_lng, area_sqm
               FROM buildings WHERE organization_id = $1 AND id = ANY($2::uuid[])`;
      params = [orgId, buildingIds];
    } else {
      query = `SELECT id, ST_AsGeoJSON(footprint) as geojson, centroid_lat, centroid_lng, area_sqm
               FROM buildings WHERE organization_id = $1 AND validation_status = 'pending'
               ORDER BY detected_at DESC LIMIT $2`;
      params = [orgId, limit];
    }

    const { rows } = await db.query(query, params);
    if (rows.length === 0) {
      return res.json({ validated: 0, results: [], message: 'No pending buildings to validate' });
    }

    const results = [];
    // Process in small batches (concurrency=2 to avoid EE/Overpass rate limits)
    for (let i = 0; i < rows.length; i += 2) {
      const batch = rows.slice(i, i + 2);
      const validations = await Promise.all(
        batch.map(async (row) => {
          const geojson = typeof row.geojson === 'string' ? JSON.parse(row.geojson) : row.geojson;
          const validation = await validateBuilding(geojson, { lat: row.centroid_lat, lng: row.centroid_lng }, { db, orgId });
          // Update the database
          await db.query(
            `UPDATE buildings SET
               validation_status = $2, validated_at = now(),
               google_confidence = $3, google_match_distance_m = $4,
               osm_id = $5, osm_match_distance_m = $6,
               building_type = $7, building_use = $8, building_name = $9,
               owner_name = $10, owner_contact = $11, parcel_owner_id = $12,
               validation_sources = $13,
               metadata = metadata || '{}'::jsonb || $14::jsonb
             WHERE id = $1`,
            [row.id, validation.validation_status,
             validation.google_confidence, validation.google_match_distance_m,
             validation.osm_id, validation.osm_match_distance_m,
             validation.building_type, validation.building_use, validation.building_name,
             validation.owner_name, validation.owner_contact, validation.parcel_owner_id,
             validation.validation_sources || [],
             JSON.stringify({ validation: validation.validation_detail })]
          );
          return {
            id: row.id,
            validation_status: validation.validation_status,
            building_type: validation.building_type,
            google_confidence: validation.google_confidence,
            osm_id: validation.osm_id,
            owner_name: validation.owner_name,
          };
        })
      );
      results.push(...validations);
    }

    res.json({
      validated: results.length,
      validated_count: results.filter(r => r.validation_status === 'validated').length,
      pending_count: results.filter(r => r.validation_status === 'pending').length,
      results,
    });
  } catch (err) {
    next(err);
  }
};

// PATCH /assembly/planning/buildings/:id — planner updates building info (incl. metadata)
exports.updateBuilding = async (req, res, next) => {
  try {
    const orgId = getOrgId(req);
    const { status, notes, permit_id, parcel_id, in_protected_area, metadata } = req.body;

    // Verify building belongs to this org
    const existing = await db.query('SELECT id, metadata FROM buildings WHERE id = $1 AND organization_id = $2', [req.params.id, orgId]);
    if (!existing.rows[0]) return res.status(404).json({ error: 'Building not found in your organization' });

    // Merge metadata if provided
    let mergedMetadata = existing.rows[0].metadata || {};
    if (metadata) {
      mergedMetadata = { ...mergedMetadata, ...metadata };
    }

    const result = await db.query(
      `UPDATE buildings SET
         status = COALESCE($1::building_status, status),
         notes = COALESCE($2, notes),
         permit_id = COALESCE($3, permit_id),
         parcel_id = COALESCE($4, parcel_id),
         in_protected_area = COALESCE($5, in_protected_area),
         metadata = $6,
         verified_by = $7,
         verified_at = now()
       WHERE id = $8 AND organization_id = $9
       RETURNING id, status, notes, verified_at, metadata, centroid_lat, centroid_lng`,
      [status, notes, permit_id, parcel_id, in_protected_area, JSON.stringify(mergedMetadata), req.user.id, req.params.id, orgId]
    );
    res.json(result.rows[0]);
  } catch (err) { next(err); }
};

// POST /assembly/planning/buildings — manually add a building footprint
exports.createBuilding = async (req, res, next) => {
  try {
    const orgId = getOrgId(req);
    const { footprint, parcel_id, status, notes, in_protected_area, metadata } = req.body;

    if (!footprint) return res.status(400).json({ error: 'footprint (GeoJSON Polygon) is required' });

    const result = await db.query(
      `INSERT INTO buildings (organization_id, parcel_id, footprint, area_sqm, status, notes, in_protected_area, detected_at, centroid_lat, centroid_lng, metadata)
       VALUES ($1, $2, ST_SetSRID(ST_GeomFromGeoJSON($3), 4326), ST_Area(ST_SetSRID(ST_GeomFromGeoJSON($3), 4326)::geography), COALESCE($4::building_status, 'unverified'), $5, COALESCE($6, false), now(),
               ST_Y(ST_Centroid(ST_SetSRID(ST_GeomFromGeoJSON($3), 4326))),
               ST_X(ST_Centroid(ST_SetSRID(ST_GeomFromGeoJSON($3), 4326))),
               $7)
       RETURNING id, status, detected_at, area_sqm, centroid_lat, centroid_lng, metadata`,
      [orgId, parcel_id, JSON.stringify(footprint), status, notes, in_protected_area, JSON.stringify(metadata || {})]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) { next(err); }
};

// ═══════════════════════════════════════════════════════════
// PLANNING OFFICER — KML EXPORT
// ═══════════════════════════════════════════════════════════

// Helper: escape XML special characters
function escapeXml(s) {
  if (s == null) return '';
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

// Helper: convert GeoJSON Polygon coordinates to KML coordinate string
function geoJsonPolygonToKml(geometry) {
  if (!geometry || geometry.type !== 'Polygon' || !geometry.coordinates) return '';
  const outer = geometry.coordinates[0];
  const coords = outer.map(([lng, lat]) => `${lng},${lat},0`).join(' ');
  return coords;
}

// Helper: build a KML Placemark from a GeoJSON feature
function featureToKmlPlacemark(feature, style) {
  const props = feature.properties || {};
  const name = escapeXml(props.name || props.id || 'Unnamed');
  const coords = geoJsonPolygonToKml(feature.geometry);

  // Build description with all properties
  const descLines = Object.entries(props)
    .filter(([k]) => k !== 'name')
    .map(([k, v]) => `<b>${escapeXml(k)}:</b> ${escapeXml(typeof v === 'object' ? JSON.stringify(v) : v)}`)
    .join('<br/>');

  return `      <Placemark>
        <name>${name}</name>
        <description><![CDATA[${descLines}]]></description>
        <Style>
          <LineStyle><color>${style.lineColor}</color><width>${style.lineWidth}</width></LineStyle>
          <PolyStyle><color>${style.polyColor}</color><fill>1</fill></PolyStyle>
        </Style>
        <Polygon>
          <outerBoundaryIs>
            <LinearRing>
              <coordinates>${coords}</coordinates>
            </LinearRing>
          </outerBoundaryIs>
        </Polygon>
      </Placemark>`;
}

// GET /assembly/planning/export.kml — export all geospatial data as KML
exports.exportKML = async (req, res, next) => {
  try {
    const orgId = getOrgId(req);
    const { layers } = req.query; // comma-separated: parcels,buildings,protected,district
    const requestedLayers = (layers || 'parcels,buildings,protected,district').split(',');

    // Fetch data in parallel
    const queries = [];

    if (requestedLayers.includes('parcels')) {
      queries.push(
        db.query(
          `SELECT id, name, region, area_sqm, survey_date,
                  ST_AsGeoJSON(boundary) as geojson,
                  (SELECT name FROM owners WHERE id = p.owner_id) as owner_name
           FROM parcels p WHERE p.organization_id = $1`,
          [orgId]
        ).then(r => ({ type: 'parcels', rows: r.rows }))
      );
    }

    if (requestedLayers.includes('buildings')) {
      queries.push(
        db.query(
          `SELECT b.id, b.area_sqm, b.status, b.in_protected_area, b.notes, b.metadata,
                  b.centroid_lat, b.centroid_lng,
                  ST_AsGeoJSON(b.footprint) as geojson,
                  (SELECT name FROM parcels WHERE id = b.parcel_id) as parcel_name
           FROM buildings b WHERE b.organization_id = $1`,
          [orgId]
        ).then(r => ({ type: 'buildings', rows: r.rows }))
      );
    }

    if (requestedLayers.includes('protected')) {
      queries.push(
        db.query(
          `SELECT id, name, type, description,
                  ST_AsGeoJSON(boundary) as geojson
           FROM protected_areas WHERE organization_id = $1 AND active = true`,
          [orgId]
        ).then(r => ({ type: 'protected', rows: r.rows }))
      );
    }

    if (requestedLayers.includes('district')) {
      queries.push(
        db.query(
          `SELECT id, name, region, type,
                  ST_AsGeoJSON(boundary) as geojson
           FROM organizations WHERE id = $1 AND boundary IS NOT NULL`,
          [orgId]
        ).then(r => ({ type: 'district', rows: r.rows }))
      );
    }

    const results = await Promise.all(queries);

    // Build KML folders
    const styles = {
      parcels: { lineColor: 'ff3ba7ff', polyColor: '301677ff', lineWidth: 2 },
      buildings: { lineColor: 'fffbbf24', polyColor: '30fbbf24', lineWidth: 2 },
      protected: { lineColor: 'ff22c55e', polyColor: '3022c55e', lineWidth: 2 },
      district: { lineColor: 'ff5ce1ff', polyColor: '155ce1ff', lineWidth: 3 },
    };

    const folderNames = {
      parcels: 'Parcels',
      buildings: 'Detected Buildings',
      protected: 'Protected Areas',
      district: 'District Boundary',
    };

    const folders = results.map(({ type, rows }) => {
      const placemarks = rows.map(row => {
        const feature = {
          type: 'Feature',
          geometry: JSON.parse(row.geojson),
          properties: { ...row, geojson: undefined },
        };
        delete feature.properties.geojson;
        return featureToKmlPlacemark(feature, styles[type] || styles.parcels);
      }).join('\n');

      return `    <Folder>
      <name>${folderNames[type] || type}</name>
${placemarks}
    </Folder>`;
    }).join('\n');

    // Get org name for document title
    const orgResult = await db.query('SELECT name FROM organizations WHERE id = $1', [orgId]);
    const orgName = orgResult.rows[0]?.name || 'District Assembly';

    const kml = `<?xml version="1.0" encoding="UTF-8"?>
<kml xmlns="http://www.opengis.net/kml/2.2">
  <Document>
    <name>${escapeXml(orgName)} — Geospatial Export</name>
    <description>Exported from EarthGlobal Planning System on ${new Date().toISOString()}</description>
    <Style id="parcelStyle">
      <LineStyle><color>ff3ba7ff</color><width>2</width></LineStyle>
      <PolyStyle><color>301677ff</color><fill>1</fill></PolyStyle>
    </Style>
    <Style id="buildingStyle">
      <LineStyle><color>fffbbf24</color><width>2</width></LineStyle>
      <PolyStyle><color>30fbbf24</color><fill>1</fill></PolyStyle>
    </Style>
    <Style id="protectedStyle">
      <LineStyle><color>ff22c55e</color><width>2</width></LineStyle>
      <PolyStyle><color>3022c55e</color><fill>1</fill></PolyStyle>
    </Style>
    <Style id="districtStyle">
      <LineStyle><color>ff5ce1ff</color><width>3</width></LineStyle>
      <PolyStyle><color>155ce1ff</color><fill>1</fill></PolyStyle>
    </Style>
${folders}
  </Document>
</kml>`;

    const filename = `${orgName.replace(/[^a-zA-Z0-9]/g, '_')}_export_${Date.now()}.kml`;
    res.setHeader('Content-Type', 'application/vnd.google-earth.kml+xml');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(kml);
  } catch (err) { next(err); }
};

// ═══════════════════════════════════════════════════════════
// PLANNING OFFICER — LAND OWNERSHIP TRANSFER
// ═══════════════════════════════════════════════════════════

// GET /assembly/planning/owners — list all owners in this org (for transfer dropdown)
exports.listOrgOwners = async (req, res, next) => {
  try {
    const orgId = getOrgId(req);
    const result = await db.query(
      `SELECT id, name, email, phone, approved, created_at,
              (SELECT COUNT(*) FROM parcels WHERE owner_id = o.id) as parcel_count
       FROM owners o WHERE o.organization_id = $1
       ORDER BY o.name`,
      [orgId]
    );
    res.json(result.rows);
  } catch (err) { next(err); }
};

// POST /assembly/planning/transfer-land — transfer parcel ownership to a new owner
exports.transferLand = async (req, res, next) => {
  const client = await db.pool.connect();
  try {
    const orgId = getOrgId(req);
    const { parcel_id, new_owner_id, transfer_reason, transfer_document_ref } = req.body;

    if (!parcel_id) return res.status(400).json({ error: 'parcel_id is required' });
    if (!new_owner_id) return res.status(400).json({ error: 'new_owner_id is required' });

    await client.query('BEGIN');

    // Verify parcel belongs to this org
    const parcelResult = await client.query(
      `SELECT id, name, owner_id, organization_id, transfer_history FROM parcels WHERE id = $1 AND organization_id = $2 FOR UPDATE`,
      [parcel_id, orgId]
    );
    if (!parcelResult.rows[0]) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Parcel not found in your organization' });
    }

    const parcel = parcelResult.rows[0];
    const oldOwnerId = parcel.owner_id;

    // Verify new owner exists and belongs to this org
    const ownerResult = await client.query(
      'SELECT id, name, email FROM owners WHERE id = $1 AND organization_id = $2',
      [new_owner_id, orgId]
    );
    if (!ownerResult.rows[0]) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'New owner not found in your organization' });
    }

    // Get old owner name
    let oldOwnerName = 'Unknown';
    if (oldOwnerId) {
      const oldOwner = await client.query('SELECT name FROM owners WHERE id = $1', [oldOwnerId]);
      if (oldOwner.rows[0]) oldOwnerName = oldOwner.rows[0].name;
    }

    // Build transfer history entry
    const transferEntry = {
      date: new Date().toISOString(),
      from_owner_id: oldOwnerId,
      from_owner_name: oldOwnerName,
      to_owner_id: new_owner_id,
      to_owner_name: ownerResult.rows[0].name,
      to_owner_email: ownerResult.rows[0].email,
      reason: transfer_reason || 'Administrative transfer by planning officer',
      document_ref: transfer_document_ref || null,
      transferred_by: req.user.name || req.user.email,
      transferred_by_id: req.user.id,
    };

    const existingHistory = parcel.transfer_history || [];
    existingHistory.push(transferEntry);

    // Update parcel owner + transfer history
    const updated = await client.query(
      `UPDATE parcels SET owner_id = $1, transfer_history = $2 WHERE id = $3
       RETURNING id, name, owner_id`,
      [new_owner_id, JSON.stringify(existingHistory), parcel_id]
    );

    // Also create a parcel_transaction record for audit trail
    await client.query(
      `INSERT INTO parcel_transactions (organization_id, parcel_id, seller_name, buyer_name, transaction_date, status, documentation_status, stamp_duty_paid, registration_fee_paid)
       VALUES ($1, $2, $3, $4, CURRENT_DATE, 'completed', 'proper', 0, 0)`,
      [orgId, parcel_id, oldOwnerName, ownerResult.rows[0].name]
    );

    await client.query('COMMIT');

    res.json({
      success: true,
      parcel: updated.rows[0],
      transfer: transferEntry,
      message: `Parcel "${parcel.name}" transferred from ${oldOwnerName} to ${ownerResult.rows[0].name}`,
    });
  } catch (err) {
    await client.query('ROLLBACK');
    next(err);
  } finally {
    client.release();
  }
};

// ═══════════════════════════════════════════════════════════
// PLANNING OFFICER — PARCEL GEOSPATIAL CRUD
// ═══════════════════════════════════════════════════════════

// POST /assembly/planning/parcels — create a new parcel with boundary polygon
exports.createParcel = async (req, res, next) => {
  try {
    const orgId = getOrgId(req);
    const { name, region, boundary, owner_id, survey_date, metadata } = req.body;

    if (!name) return res.status(400).json({ error: 'Parcel name is required' });
    if (!boundary || boundary.type !== 'Polygon') return res.status(400).json({ error: 'boundary (GeoJSON Polygon) is required' });

    const result = await db.query(
      `INSERT INTO parcels (owner_id, organization_id, name, boundary, region, survey_date, area_sqm, centroid_lat, centroid_lng, metadata)
       VALUES ($1, $2, $3, ST_SetSRID(ST_GeomFromGeoJSON($4), 4326), $5, $6,
               ST_Area(ST_SetSRID(ST_GeomFromGeoJSON($4), 4326)::geography),
               ST_Y(ST_Centroid(ST_SetSRID(ST_GeomFromGeoJSON($4), 4326))),
               ST_X(ST_Centroid(ST_SetSRID(ST_GeomFromGeoJSON($4), 4326))),
               $7)
       RETURNING id, name, region, area_sqm, survey_date, centroid_lat, centroid_lng`,
      [owner_id || null, orgId, name, JSON.stringify(boundary), region || null, survey_date || null, JSON.stringify(metadata || {})]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) { next(err); }
};

// PATCH /assembly/planning/parcels/:id — update parcel boundary and/or metadata
exports.updateParcel = async (req, res, next) => {
  try {
    const orgId = getOrgId(req);
    const { name, region, boundary, owner_id, survey_date, metadata } = req.body;

    // Verify parcel belongs to this org
    const existing = await db.query('SELECT id, metadata FROM parcels WHERE id = $1 AND organization_id = $2', [req.params.id, orgId]);
    if (!existing.rows[0]) return res.status(404).json({ error: 'Parcel not found in your organization' });

    let mergedMetadata = existing.rows[0].metadata || {};
    if (metadata) mergedMetadata = { ...mergedMetadata, ...metadata };

    // Build dynamic update
    const updates = [];
    const params = [];
    let paramCount = 0;

    if (name) { updates.push(`name = $${++paramCount}`); params.push(name); }
    if (region) { updates.push(`region = $${++paramCount}`); params.push(region); }
    if (owner_id !== undefined) { updates.push(`owner_id = $${++paramCount}`); params.push(owner_id); }
    if (survey_date !== undefined) { updates.push(`survey_date = $${++paramCount}`); params.push(survey_date); }
    if (metadata) { updates.push(`metadata = $${++paramCount}`); params.push(JSON.stringify(mergedMetadata)); }

    if (boundary && boundary.type === 'Polygon') {
      updates.push(`boundary = ST_SetSRID(ST_GeomFromGeoJSON($${++paramCount}), 4326)`);
      params.push(JSON.stringify(boundary));
      updates.push(`area_sqm = ST_Area(ST_SetSRID(ST_GeomFromGeoJSON($${++paramCount}), 4326)::geography)`);
      params.push(JSON.stringify(boundary));
      updates.push(`centroid_lat = ST_Y(ST_Centroid(ST_SetSRID(ST_GeomFromGeoJSON($${++paramCount}), 4326)))`);
      params.push(JSON.stringify(boundary));
      updates.push(`centroid_lng = ST_X(ST_Centroid(ST_SetSRID(ST_GeomFromGeoJSON($${++paramCount}), 4326)))`);
      params.push(JSON.stringify(boundary));
    }

    if (updates.length === 0) return res.json({ message: 'No updates provided' });

    params.push(req.params.id, orgId);
    const result = await db.query(
      `UPDATE parcels SET ${updates.join(', ')} WHERE id = $${++paramCount} AND organization_id = $${++paramCount}
       RETURNING id, name, region, area_sqm, survey_date, centroid_lat, centroid_lng, metadata`,
      params
    );
    res.json(result.rows[0]);
  } catch (err) { next(err); }
};

// DELETE /assembly/planning/parcels/:id — delete a parcel
exports.deleteParcel = async (req, res, next) => {
  try {
    const orgId = getOrgId(req);
    const result = await db.query(
      'DELETE FROM parcels WHERE id = $1 AND organization_id = $2 RETURNING id, name',
      [req.params.id, orgId]
    );
    if (!result.rows[0]) return res.status(404).json({ error: 'Parcel not found in your organization' });
    res.json({ success: true, deleted: result.rows[0] });
  } catch (err) { next(err); }
};

// ═══════════════════════════════════════════════════════════
// PLANNING OFFICER — BUILDING CHANGE DETECTION
// ═══════════════════════════════════════════════════════════

// POST /assembly/planning/change-detection — run building change detection
// Compares satellite imagery between two time periods to find new buildings
exports.runChangeDetection = async (req, res, next) => {
  try {
    const orgId = getOrgId(req);
    const { bbox, baselineStart, baselineEnd, periodStart, periodEnd } = req.body;

    if (!bbox) return res.status(400).json({ error: 'bbox is required' });

    // Default date ranges: current = last 3 months, baseline = previous 3 months
    const now = new Date();
    const threeMonthsAgo = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
    const sixMonthsAgo = new Date(now.getTime() - 180 * 24 * 60 * 60 * 1000);

    const finalBaselineStart = baselineStart || new Date(sixMonthsAgo.getTime() - 90 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
    const finalBaselineEnd = baselineEnd || sixMonthsAgo.toISOString().slice(0, 10);
    const finalPeriodStart = periodStart || threeMonthsAgo.toISOString().slice(0, 10);
    const finalPeriodEnd = periodEnd || now.toISOString().slice(0, 10);

    const result = await runBuildingChangeDetection({
      orgId,
      bbox,
      baselineStart: finalBaselineStart,
      baselineEnd: finalBaselineEnd,
      periodStart: finalPeriodStart,
      periodEnd: finalPeriodEnd,
      startedBy: req.user.id,
    });

    res.json(result);
  } catch (err) {
    console.error('Change detection error:', err.message);
    res.status(500).json({ error: err.message || 'Change detection failed' });
  }
};

// GET /assembly/planning/change-detection/history — list past detection runs
exports.listChangeDetections = async (req, res, next) => {
  try {
    const orgId = getOrgId(req);
    const result = await db.query(
      `SELECT id, status, period_start, period_end, baseline_start, baseline_end,
              new_buildings_count, new_builtup_area_sqm, method,
              before_tile_url, after_tile_url, change_tile_url,
              error_message, started_at, completed_at
       FROM building_change_detections
       WHERE organization_id = $1
       ORDER BY started_at DESC LIMIT 20`,
      [orgId]
    );
    res.json(result.rows);
  } catch (err) { next(err); }
};

// GET /assembly/planning/change-detection/:id — get a specific detection run
exports.getChangeDetection = async (req, res, next) => {
  try {
    const orgId = getOrgId(req);
    const result = await db.query(
      `SELECT * FROM building_change_detections WHERE id = $1 AND organization_id = $2`,
      [req.params.id, orgId]
    );
    if (!result.rows[0]) return res.status(404).json({ error: 'Detection run not found' });
    res.json(result.rows[0]);
  } catch (err) { next(err); }
};

// GET /assembly/planning/new-buildings — get buildings from the latest change detection
exports.getNewBuildings = async (req, res, next) => {
  try {
    const orgId = getOrgId(req);
    const result = await db.query(
      `SELECT b.id, b.area_sqm, b.status, b.in_protected_area, b.detected_at,
              b.metadata, b.centroid_lat, b.centroid_lng, b.change_detection_id,
              ST_AsGeoJSON(b.footprint) as geojson,
              (SELECT name FROM parcels WHERE id = b.parcel_id) as parcel_name
       FROM buildings b
       WHERE b.organization_id = $1 AND b.change_detection_id IS NOT NULL
       ORDER BY b.detected_at DESC LIMIT 200`,
      [orgId]
    );

    const features = result.rows.map((row) => ({
      type: 'Feature',
      geometry: JSON.parse(row.geojson),
      properties: {
        id: row.id,
        area_sqm: parseFloat(row.area_sqm) || 0,
        status: row.status,
        in_protected_area: row.in_protected_area,
        detected_at: row.detected_at,
        parcel_name: row.parcel_name,
        centroid_lat: row.centroid_lat,
        centroid_lng: row.centroid_lng,
        metadata: row.metadata || {},
        change_detection_id: row.change_detection_id,
      },
    }));

    res.json({ type: 'FeatureCollection', features });
  } catch (err) { next(err); }
};
