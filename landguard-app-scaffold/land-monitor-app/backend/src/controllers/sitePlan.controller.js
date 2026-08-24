const db = require('../config/db');

// ── Helpers ──
function getOrgId(req) {
  return req.user.organizationId || req.user.organization_id;
}

/**
 * Compute plan_data for a parcel: boundary coords, area, perimeter,
 * buildings on the parcel, setbacks, north arrow, and scale.
 */
async function buildPlanData(parcelId) {
  const parcelRes = await db.query(
    `SELECT id, name, region, ST_AsGeoJSON(boundary) as boundary_geojson,
            area_sqm, perimeter_m, organization_id
     FROM parcels WHERE id = $1`,
    [parcelId]
  );
  if (parcelRes.rows.length === 0) return null;
  const parcel = parcelRes.rows[0];
  const boundary = JSON.parse(parcel.boundary_geojson);

  // Fetch buildings on this parcel
  const buildingsRes = await db.query(
    `SELECT id, ST_AsGeoJSON(footprint) as footprint_geojson, area_sqm, status,
            estimated_height_m, estimated_floors
     FROM buildings WHERE parcel_id = $1 ORDER BY created_at`,
    [parcelId]
  );

  const buildings = buildingsRes.rows.map((b) => ({
    id: b.id,
    footprint: JSON.parse(b.footprint_geojson),
    area_sqm: parseFloat(b.area_sqm) || 0,
    status: b.status,
    estimated_height_m: b.estimated_height_m || null,
    estimated_floors: b.estimated_floors || null,
  }));

  // Compute bounding box for scale + north
  const coords = boundary.coordinates[0];
  const lngs = coords.map((c) => c[0]);
  const lats = coords.map((c) => c[1]);
  const minLng = Math.min(...lngs);
  const maxLng = Math.max(...lngs);
  const minLat = Math.min(...lats);
  const maxLat = Math.max(...lats);

  // Approximate width/height in meters
  const widthM = haversine(minLat, minLng, minLat, maxLng);
  const heightM = haversine(minLat, minLng, maxLat, minLng);

  return {
    parcel: {
      id: parcel.id,
      name: parcel.name,
      region: parcel.region,
      boundary,
      area_sqm: parseFloat(parcel.area_sqm) || 0,
      perimeter_m: parseFloat(parcel.perimeter_m) || 0,
    },
    buildings,
    bbox: { minLng, maxLng, minLat, maxLat },
    dimensions: { widthM: Math.round(widthM), heightM: Math.round(heightM) },
    north: 0,
    scale: '1:500',
    generated_at: new Date().toISOString(),
  };
}

function haversine(lat1, lng1, lat2, lng2) {
  const R = 6371000;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// ═══════════════════════════════════════════════════════════
// SITE PLANS — Generate, List, Get, Certify, Reject, Delete
// ═══════════════════════════════════════════════════════════

// POST /site-plans/generate — any authenticated user can generate a draft
exports.generate = async (req, res) => {
  try {
    const { parcel_id, title, notes } = req.body;
    if (!parcel_id) return res.status(400).json({ error: 'parcel_id is required' });

    // Verify parcel exists and user has access
    const parcelRes = await db.query('SELECT id, owner_id, organization_id FROM parcels WHERE id = $1', [parcel_id]);
    if (parcelRes.rows.length === 0) return res.status(404).json({ error: 'Parcel not found' });

    const parcel = parcelRes.rows[0];
    const role = req.user.role; // 'owner' | 'admin' | 'assembly'

    // Owners can only generate for their own parcels
    if (role === 'owner' && parcel.owner_id !== req.user.id) {
      return res.status(403).json({ error: 'You can only generate site plans for your own parcels' });
    }

    const planData = await buildPlanData(parcel_id);
    if (!planData) return res.status(404).json({ error: 'Could not build plan data for parcel' });

    const result = await db.query(
      `INSERT INTO site_plans (parcel_id, organization_id, generated_by, generated_by_role, plan_data, title, notes)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING id, status, title, created_at`,
      [
        parcel_id,
        parcel.organization_id || getOrgId(req) || null,
        req.user.id,
        role,
        JSON.stringify(planData),
        title || `Site Plan — ${planData.parcel.name}`,
        notes || null,
      ]
    );

    res.status(201).json({
      id: result.rows[0].id,
      status: result.rows[0].status,
      title: result.rows[0].title,
      plan_data: planData,
      created_at: result.rows[0].created_at,
    });
  } catch (err) {
    console.error('[SitePlan] Generate error:', err.message);
    res.status(500).json({ error: 'Failed to generate site plan' });
  }
};

// GET /site-plans — list plans (owner sees own, assembly sees org, admin sees all)
exports.list = async (req, res) => {
  try {
    const role = req.user.role;
    let query, params;

    if (role === 'owner') {
      query = `SELECT sp.id, sp.title, sp.status, sp.plan_data, sp.plan_image_url,
                      sp.certified_at, sp.rejection_reason, sp.notes, sp.created_at, sp.updated_at,
                      p.name as parcel_name, p.region as parcel_region
               FROM site_plans sp
               JOIN parcels p ON sp.parcel_id = p.id
               WHERE p.owner_id = $1
               ORDER BY sp.created_at DESC`;
      params = [req.user.id];
    } else if (role === 'assembly') {
      const orgId = getOrgId(req);
      if (!orgId) return res.status(400).json({ error: 'No organization associated' });
      query = `SELECT sp.id, sp.title, sp.status, sp.plan_data, sp.plan_image_url,
                      sp.certified_at, sp.certified_by, sp.rejection_reason, sp.notes,
                      sp.created_at, sp.updated_at,
                      p.name as parcel_name, p.region as parcel_region,
                      o.name as owner_name
               FROM site_plans sp
               JOIN parcels p ON sp.parcel_id = p.id
               LEFT JOIN owners o ON p.owner_id = o.id
               WHERE sp.organization_id = $1
               ORDER BY sp.created_at DESC`;
      params = [orgId];
    } else {
      // admin sees all
      query = `SELECT sp.id, sp.title, sp.status, sp.plan_data, sp.plan_image_url,
                      sp.certified_at, sp.rejection_reason, sp.notes, sp.created_at, sp.updated_at,
                      p.name as parcel_name, p.region as parcel_region,
                      o.name as owner_name
               FROM site_plans sp
               JOIN parcels p ON sp.parcel_id = p.id
               LEFT JOIN owners o ON p.owner_id = o.id
               ORDER BY sp.created_at DESC`;
      params = [];
    }

    const result = await db.query(query, params);
    res.json(result.rows);
  } catch (err) {
    console.error('[SitePlan] List error:', err.message);
    res.status(500).json({ error: 'Failed to list site plans' });
  }
};

// GET /site-plans/:id — get single plan
exports.getById = async (req, res) => {
  try {
    const { id } = req.params;
    const result = await db.query(
      `SELECT sp.*, p.name as parcel_name, p.region as parcel_region, o.name as owner_name
       FROM site_plans sp
       JOIN parcels p ON sp.parcel_id = p.id
       LEFT JOIN owners o ON p.owner_id = o.id
       WHERE sp.id = $1`,
      [id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Site plan not found' });

    const plan = result.rows[0];
    // Access check for owners
    if (req.user.role === 'owner') {
      const parcel = await db.query('SELECT owner_id FROM parcels WHERE id = $1', [plan.parcel_id]);
      if (parcel.rows[0]?.owner_id !== req.user.id) {
        return res.status(403).json({ error: 'Access denied' });
      }
    }

    res.json(plan);
  } catch (err) {
    console.error('[SitePlan] GetById error:', err.message);
    res.status(500).json({ error: 'Failed to get site plan' });
  }
};

// PATCH /site-plans/:id/certify — assembly only, certifies a draft plan
exports.certify = async (req, res) => {
  try {
    const { id } = req.params;
    const orgId = getOrgId(req);
    if (!orgId) return res.status(400).json({ error: 'No organization associated' });

    const result = await db.query(
      `UPDATE site_plans
       SET status = 'certified', certified_by = $1, certified_at = now(),
           rejection_reason = NULL, updated_at = now()
       WHERE id = $2 AND organization_id = $3 AND status = 'draft'
       RETURNING id, status, certified_at`,
      [req.user.id, id, orgId]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Site plan not found or cannot be certified (must be a draft in your organization)' });
    }
    res.json(result.rows[0]);
  } catch (err) {
    console.error('[SitePlan] Certify error:', err.message);
    res.status(500).json({ error: 'Failed to certify site plan' });
  }
};

// PATCH /site-plans/:id/reject — assembly only, rejects a draft plan
exports.reject = async (req, res) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;
    const orgId = getOrgId(req);
    if (!orgId) return res.status(400).json({ error: 'No organization associated' });

    const result = await db.query(
      `UPDATE site_plans
       SET status = 'rejected', rejection_reason = $1, updated_at = now()
       WHERE id = $2 AND organization_id = $3 AND status = 'draft'
       RETURNING id, status, rejection_reason`,
      [reason || null, id, orgId]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Site plan not found or cannot be rejected' });
    }
    res.json(result.rows[0]);
  } catch (err) {
    console.error('[SitePlan] Reject error:', err.message);
    res.status(500).json({ error: 'Failed to reject site plan' });
  }
};

// DELETE /site-plans/:id — delete a plan (owner can delete own, assembly can delete org plans)
exports.remove = async (req, res) => {
  try {
    const { id } = req.params;
    const role = req.user.role;

    let query, params;
    if (role === 'owner') {
      query = `DELETE FROM site_plans WHERE id = $1 AND parcel_id IN (
        SELECT id FROM parcels WHERE owner_id = $2
      ) RETURNING id`;
      params = [id, req.user.id];
    } else if (role === 'assembly') {
      query = 'DELETE FROM site_plans WHERE id = $1 AND organization_id = $2 RETURNING id';
      params = [id, getOrgId(req)];
    } else {
      query = 'DELETE FROM site_plans WHERE id = $1 RETURNING id';
      params = [id];
    }

    const result = await db.query(query, params);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Site plan not found or access denied' });
    res.json({ deleted: true });
  } catch (err) {
    console.error('[SitePlan] Delete error:', err.message);
    res.status(500).json({ error: 'Failed to delete site plan' });
  }
};

// ═══════════════════════════════════════════════════════════
// SITE PLAN REQUESTS — Owner requests a certified plan from assembly
// ═══════════════════════════════════════════════════════════

// POST /site-plans/requests — owner creates a request
exports.createRequest = async (req, res) => {
  try {
    const { parcel_id, purpose, notes } = req.body;
    if (!parcel_id) return res.status(400).json({ error: 'parcel_id is required' });

    // Verify parcel belongs to owner
    const parcelRes = await db.query('SELECT id, organization_id FROM parcels WHERE id = $1 AND owner_id = $2', [parcel_id, req.user.id]);
    if (parcelRes.rows.length === 0) return res.status(404).json({ error: 'Parcel not found or not owned by you' });

    const result = await db.query(
      `INSERT INTO site_plan_requests (parcel_id, owner_id, organization_id, purpose, notes)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id, status, requested_at`,
      [parcel_id, req.user.id, parcelRes.rows[0].organization_id || null, purpose || null, notes || null]
    );

    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('[SitePlan] CreateRequest error:', err.message);
    res.status(500).json({ error: 'Failed to create site plan request' });
  }
};

// GET /site-plans/requests — list requests
exports.listRequests = async (req, res) => {
  try {
    const role = req.user.role;
    let query, params;

    if (role === 'owner') {
      query = `SELECT spr.*, p.name as parcel_name, p.region as parcel_region
               FROM site_plan_requests spr
               JOIN parcels p ON spr.parcel_id = p.id
               WHERE spr.owner_id = $1
               ORDER BY spr.requested_at DESC`;
      params = [req.user.id];
    } else if (role === 'assembly') {
      const orgId = getOrgId(req);
      if (!orgId) return res.status(400).json({ error: 'No organization associated' });
      query = `SELECT spr.*, p.name as parcel_name, p.region as parcel_region, o.name as owner_name
               FROM site_plan_requests spr
               JOIN parcels p ON spr.parcel_id = p.id
               LEFT JOIN owners o ON spr.owner_id = o.id
               WHERE spr.organization_id = $1
               ORDER BY spr.requested_at DESC`;
      params = [orgId];
    } else {
      query = `SELECT spr.*, p.name as parcel_name, p.region as parcel_region, o.name as owner_name
               FROM site_plan_requests spr
               JOIN parcels p ON spr.parcel_id = p.id
               LEFT JOIN owners o ON spr.owner_id = o.id
               ORDER BY spr.requested_at DESC`;
      params = [];
    }

    const result = await db.query(query, params);
    res.json(result.rows);
  } catch (err) {
    console.error('[SitePlan] ListRequests error:', err.message);
    res.status(500).json({ error: 'Failed to list site plan requests' });
  }
};

// PATCH /site-plans/requests/:id — assembly updates request status (assign, complete, cancel)
exports.updateRequest = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, assigned_to, resulting_plan_id, fee_amount } = req.body;
    const orgId = getOrgId(req);
    if (!orgId) return res.status(400).json({ error: 'No organization associated' });

    const sets = [];
    const vals = [];
    let idx = 1;

    if (status) { sets.push(`status = $${idx++}`); vals.push(status); }
    if (assigned_to) { sets.push(`assigned_to = $${idx++}`); vals.push(assigned_to); }
    if (resulting_plan_id) { sets.push(`resulting_plan_id = $${idx++}`); vals.push(resulting_plan_id); }
    if (fee_amount != null) { sets.push(`fee_amount = $${idx++}`); vals.push(fee_amount); }
    if (status === 'completed') { sets.push(`completed_at = now()`); }
    if (status === 'cancelled') { sets.push(`completed_at = now()`); }

    if (sets.length === 0) return res.status(400).json({ error: 'No fields to update' });

    vals.push(id, orgId);
    const result = await db.query(
      `UPDATE site_plan_requests SET ${sets.join(', ')}
       WHERE id = $${idx++} AND organization_id = $${idx++}
       RETURNING *`,
      vals
    );

    if (result.rows.length === 0) return res.status(404).json({ error: 'Request not found' });
    res.json(result.rows[0]);
  } catch (err) {
    console.error('[SitePlan] UpdateRequest error:', err.message);
    res.status(500).json({ error: 'Failed to update site plan request' });
  }
};
