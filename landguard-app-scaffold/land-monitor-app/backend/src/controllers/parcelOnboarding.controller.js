const db = require('../config/db');
const turf = require('@turf/turf');

// ═══════════════════════════════════════════════════════════
// PARCEL ONBOARDING REQUESTS
// Landowners register an account, then request that a parcel be onboarded
// (surveyed and added to the platform), optionally attaching a supporting
// document (deed / site plan / sketch). An admin reviews the request and
// performs the actual boundary capture, which creates the parcel and links
// it back to the request.
// ═══════════════════════════════════════════════════════════

// POST /parcel-onboarding-requests — owner creates a request
exports.createRequest = async (req, res) => {
  try {
    const { name, region, notes, site_plan_doc_url, site_plan_doc_name } = req.body;
    if (!name) return res.status(400).json({ error: 'Parcel name is required' });

    const result = await db.query(
      `INSERT INTO parcel_onboarding_requests
         (owner_id, name, region, notes, site_plan_doc_url, site_plan_doc_name)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING id, name, region, notes, status, requested_at`,
      [req.user.id, name, region || null, notes || null, site_plan_doc_url || null, site_plan_doc_name || null]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('[ParcelOnboarding] CreateRequest error:', err.message);
    res.status(500).json({ error: 'Failed to create onboarding request' });
  }
};

// GET /parcel-onboarding-requests — list requests (role-scoped)
exports.listRequests = async (req, res) => {
  try {
    const role = req.user.role;
    let query, params;

    if (role === 'admin') {
      query = `SELECT r.*, o.name AS owner_name, o.phone AS owner_phone, o.email AS owner_email,
                      p.name AS resulting_parcel_name,
                      a.name AS assigned_agent_name, a.phone AS assigned_agent_phone, a.region AS assigned_agent_region
               FROM parcel_onboarding_requests r
               LEFT JOIN owners o ON r.owner_id = o.id
               LEFT JOIN parcels p ON r.resulting_parcel_id = p.id
               LEFT JOIN agents a ON r.assigned_agent_id = a.id
               ORDER BY r.requested_at DESC`;
      params = [];
    } else if (role === 'agent') {
      query = `SELECT r.*, o.name AS owner_name, o.phone AS owner_phone, o.email AS owner_email,
                      p.name AS resulting_parcel_name
               FROM parcel_onboarding_requests r
               LEFT JOIN owners o ON r.owner_id = o.id
               LEFT JOIN parcels p ON r.resulting_parcel_id = p.id
               WHERE r.assigned_agent_id = $1
               ORDER BY r.requested_at DESC`;
      params = [req.user.id];
    } else {
      query = `SELECT r.* FROM parcel_onboarding_requests r
               WHERE r.owner_id = $1
               ORDER BY r.requested_at DESC`;
      params = [req.user.id];
    }

    const result = await db.query(query, params);
    res.json(result.rows);
  } catch (err) {
    console.error('[ParcelOnboarding] ListRequests error:', err.message);
    res.status(500).json({ error: 'Failed to list onboarding requests' });
  }
};

// GET /parcel-onboarding-requests/:id — get a single request (role-scoped)
exports.getById = async (req, res) => {
  try {
    const { id } = req.params;
    let query, params;

    if (req.user.role === 'admin') {
      query = `SELECT r.*, o.name AS owner_name, o.phone AS owner_phone, o.email AS owner_email,
                      a.name AS assigned_agent_name, a.phone AS assigned_agent_phone
               FROM parcel_onboarding_requests r
               LEFT JOIN owners o ON r.owner_id = o.id
               LEFT JOIN agents a ON r.assigned_agent_id = a.id
               WHERE r.id = $1`;
      params = [id];
    } else if (req.user.role === 'agent') {
      query = `SELECT r.*, o.name AS owner_name, o.phone AS owner_phone, o.email AS owner_email
               FROM parcel_onboarding_requests r
               LEFT JOIN owners o ON r.owner_id = o.id
               WHERE r.id = $1 AND r.assigned_agent_id = $2`;
      params = [id, req.user.id];
    } else {
      query = `SELECT r.* FROM parcel_onboarding_requests r WHERE r.id = $1 AND r.owner_id = $2`;
      params = [id, req.user.id];
    }

    const result = await db.query(query, params);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Request not found' });
    res.json(result.rows[0]);
  } catch (err) {
    console.error('[ParcelOnboarding] GetById error:', err.message);
    res.status(500).json({ error: 'Failed to fetch onboarding request' });
  }
};

// PATCH /parcel-onboarding-requests/:id — admin updates status (e.g. reject, mark in_review)
exports.updateStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, rejection_reason, assigned_to, assigned_agent_id } = req.body;

    const sets = [];
    const vals = [];
    let idx = 1;

    if (status) { sets.push(`status = $${idx++}`); vals.push(status); }
    if (rejection_reason !== undefined) { sets.push(`rejection_reason = $${idx++}`); vals.push(rejection_reason); }
    if (assigned_to !== undefined) { sets.push(`assigned_to = $${idx++}`); vals.push(assigned_to); }
    if (assigned_agent_id !== undefined) { sets.push(`assigned_agent_id = $${idx++}`); vals.push(assigned_agent_id || null); }
    if (status && status !== 'pending') { sets.push(`reviewed_at = now()`); }

    if (sets.length === 0) return res.status(400).json({ error: 'No fields to update' });

    vals.push(id);
    const result = await db.query(
      `UPDATE parcel_onboarding_requests SET ${sets.join(', ')} WHERE id = $${idx} RETURNING *`,
      vals
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Request not found' });
    res.json(result.rows[0]);
  } catch (err) {
    console.error('[ParcelOnboarding] UpdateStatus error:', err.message);
    res.status(500).json({ error: 'Failed to update onboarding request' });
  }
};

// POST /parcel-onboarding-requests/:id/onboard — admin finalizes the survey and
// creates the parcel, linking it back to the request.
exports.onboard = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, region, boundary_geojson, survey_date, deed_doc_url } = req.body;
    if (!boundary_geojson) return res.status(400).json({ error: 'boundary_geojson is required' });

    const reqRes = await db.query('SELECT * FROM parcel_onboarding_requests WHERE id = $1', [id]);
    const request = reqRes.rows[0];
    if (!request) return res.status(404).json({ error: 'Request not found' });
    if (request.status === 'onboarded') return res.status(400).json({ error: 'Request already onboarded' });

    const areaSqm = turf.area(boundary_geojson);
    const perimeterM = turf.length(turf.polygonToLine(boundary_geojson), { units: 'meters' });

    const parcelRes = await db.query(
      `INSERT INTO parcels (owner_id, name, boundary, region, survey_date, deed_doc_url, area_sqm, perimeter_m)
       VALUES ($1, $2, ST_SetSRID(ST_GeomFromGeoJSON($3), 4326), $4, $5, $6, $7, $8)
       RETURNING id, name, region, survey_date, area_sqm, perimeter_m, ST_AsGeoJSON(boundary) AS boundary_geojson`,
      [
        request.owner_id,
        name || request.name,
        JSON.stringify(boundary_geojson),
        region || request.region,
        survey_date || null,
        deed_doc_url || request.site_plan_doc_url || null,
        areaSqm,
        perimeterM,
      ]
    );
    const parcel = parcelRes.rows[0];

    await db.query(
      `UPDATE parcel_onboarding_requests
       SET status = 'onboarded', resulting_parcel_id = $1, reviewed_at = now()
       WHERE id = $2`,
      [parcel.id, id]
    );

    res.status(201).json({
      ...parcel,
      area_sqm: parcel.area_sqm != null ? Number(parcel.area_sqm) : null,
      perimeter_m: parcel.perimeter_m != null ? Number(parcel.perimeter_m) : null,
      boundary: parcel.boundary_geojson ? JSON.parse(parcel.boundary_geojson) : null,
      boundary_geojson: undefined,
    });
  } catch (err) {
    console.error('[ParcelOnboarding] Onboard error:', err.message);
    res.status(500).json({ error: 'Failed to onboard parcel' });
  }
};
