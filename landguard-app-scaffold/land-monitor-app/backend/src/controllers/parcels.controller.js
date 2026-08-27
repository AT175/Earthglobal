const db = require('../config/db');
const turf = require('@turf/turf');
const { computeParcelNdvi } = require('../jobs/ndviChangeDetection');

// GET /parcels — list parcels (role-scoped: owner sees own, sales manager sees all, agent sees assigned)
exports.listForOwner = async (req, res, next) => {
  try {
    if (req.user.isSalesManager) {
      const result = await db.query(
        `SELECT id, name, region, survey_date, area_sqm, perimeter_m, owner_id,
                ST_AsGeoJSON(boundary) AS boundary_geojson
         FROM parcels ORDER BY created_at DESC LIMIT 500`
      );
      res.json(result.rows.map(formatParcel));
    } else if (req.user.role === 'agent') {
      const result = await db.query(
        `SELECT p.id, p.name, p.region, p.survey_date, p.area_sqm, p.perimeter_m, p.owner_id,
                ST_AsGeoJSON(p.boundary) AS boundary_geojson
         FROM parcels p
         JOIN parcel_onboarding_requests r ON r.resulting_parcel_id = p.id
         WHERE r.assigned_agent_id = $1
         ORDER BY p.created_at DESC`,
        [req.user.id]
      );
      res.json(result.rows.map(formatParcel));
    } else {
      const result = await db.query(
        `SELECT id, name, region, survey_date, area_sqm, perimeter_m,
                ST_AsGeoJSON(boundary) AS boundary_geojson
         FROM parcels WHERE owner_id = $1
         ORDER BY created_at DESC`,
        [req.user.id]
      );
      res.json(result.rows.map(formatParcel));
    }
  } catch (err) {
    next(err);
  }
};

// GET /parcels/:id — single parcel detail
exports.getById = async (req, res, next) => {
  try {
    const result = await db.query(
      `SELECT id, owner_id, name, region, survey_date, deed_doc_url,
              area_sqm, perimeter_m, ST_AsGeoJSON(boundary) AS boundary_geojson
       FROM parcels WHERE id = $1`,
      [req.params.id]
    );
    const parcel = result.rows[0];
    if (!parcel) return res.status(404).json({ error: 'Parcel not found' });

    // Owners can only view their own parcel; sales managers can view any; admins/agents can view any
    if (req.user.role === 'owner' && !req.user.isSalesManager && parcel.owner_id !== req.user.id) {
      return res.status(403).json({ error: 'Forbidden' });
    }
    res.json(formatParcel(parcel));
  } catch (err) {
    next(err);
  }
};

// POST /parcels — create a parcel from a finalized boundary (admin/agent only)
exports.create = async (req, res, next) => {
  try {
    const { owner_id, name, boundary_geojson, region, survey_date, deed_doc_url } = req.body;

    // boundary_geojson is a GeoJSON Polygon, e.g. { type: "Polygon", coordinates: [[[lng,lat], ...]] }
    const areaSqm = turf.area(boundary_geojson);
    const perimeterM = turf.length(turf.polygonToLine(boundary_geojson), { units: 'meters' });

    const result = await db.query(
      `INSERT INTO parcels (owner_id, name, boundary, region, survey_date, deed_doc_url, area_sqm, perimeter_m)
       VALUES ($1, $2, ST_SetSRID(ST_GeomFromGeoJSON($3), 4326), $4, $5, $6, $7, $8)
       RETURNING id, name, region, survey_date, area_sqm, perimeter_m, ST_AsGeoJSON(boundary) AS boundary_geojson`,
      [owner_id, name, JSON.stringify(boundary_geojson), region, survey_date, deed_doc_url, areaSqm, perimeterM]
    );
    res.status(201).json(formatParcel(result.rows[0]));
  } catch (err) {
    next(err);
  }
};

// PATCH /parcels/:id — update metadata or boundary
exports.update = async (req, res, next) => {
  try {
    const { name, region, boundary_geojson } = req.body;
    const fields = [];
    const values = [];
    let i = 1;

    if (name) { fields.push(`name = $${i++}`); values.push(name); }
    if (region) { fields.push(`region = $${i++}`); values.push(region); }
    if (boundary_geojson) {
      fields.push(`boundary = ST_SetSRID(ST_GeomFromGeoJSON($${i++}), 4326)`);
      values.push(JSON.stringify(boundary_geojson));
    }
    if (fields.length === 0) return res.status(400).json({ error: 'No fields to update' });

    values.push(req.params.id);
    const result = await db.query(
      `UPDATE parcels SET ${fields.join(', ')} WHERE id = $${i} RETURNING id, name, region, ST_AsGeoJSON(boundary) AS boundary_geojson`,
      values
    );
    res.json(formatParcel(result.rows[0]));
  } catch (err) {
    next(err);
  }
};

// DELETE /parcels/:id — admin only
exports.remove = async (req, res, next) => {
  try {
    await db.query('DELETE FROM parcels WHERE id = $1', [req.params.id]);
    res.status(204).send();
  } catch (err) {
    next(err);
  }
};

// GET /parcels/:id/satellite — capture a fresh satellite image + NDVI for a parcel
exports.captureSatellite = async (req, res, next) => {
  try {
    const result = await db.query(
      `SELECT id, name, ST_AsGeoJSON(boundary) AS boundary_geojson FROM parcels WHERE id = $1`,
      [req.params.id]
    );
    const parcel = result.rows[0];
    if (!parcel) return res.status(404).json({ error: 'Parcel not found' });

    const boundary = JSON.parse(parcel.boundary_geojson);
    const capture = await computeParcelNdvi(boundary);

    if (!capture) {
      return res.status(503).json({
        error: 'Satellite imagery not available. Earth Engine may not be configured or no cloud-free imagery in the last 30 days.',
      });
    }

    // Store the snapshot
    await db.query(
      `INSERT INTO parcel_images (parcel_id, image_url, ndvi_value, source) VALUES ($1, $2, $3, $4)`,
      [parcel.id, capture.imageUrl, capture.ndviValue, 'sentinel-2']
    );

    res.json({
      parcelId: parcel.id,
      ndvi: capture.ndviValue,
      imageUrl: capture.imageUrl,
      capturedAt: new Date().toISOString(),
      source: 'sentinel-2',
    });
  } catch (err) {
    next(err);
  }
};

// GET /parcels/:id/images — list historical satellite images for a parcel
exports.listImages = async (req, res, next) => {
  try {
    const result = await db.query(
      `SELECT id, image_url, ndvi_value, captured_at, source
       FROM parcel_images WHERE parcel_id = $1 ORDER BY captured_at DESC LIMIT 50`,
      [req.params.id]
    );
    res.json(result.rows);
  } catch (err) {
    next(err);
  }
};

// GET /parcels/:id/buildings — list buildings detected on a parcel (owner view)
exports.listBuildings = async (req, res, next) => {
  try {
    // Verify the parcel belongs to the owner (or user is admin/assembly)
    const parcelRes = await db.query(
      `SELECT owner_id, area_sqm FROM parcels WHERE id = $1`,
      [req.params.id]
    );
    const parcel = parcelRes.rows[0];
    if (!parcel) return res.status(404).json({ error: 'Parcel not found' });

    if (req.user.role === 'owner' && !req.user.isSalesManager && parcel.owner_id !== req.user.id) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    const result = await db.query(
      `SELECT id, area_sqm, estimated_height_m, estimated_floors,
              height_confidence, height_method, status, in_protected_area,
              centroid_lat, centroid_lng, detected_at, first_seen_in_image,
              latest_image, notes, metadata,
              ST_AsGeoJSON(footprint) AS footprint_geojson
       FROM buildings
       WHERE parcel_id = $1
       ORDER BY detected_at DESC`,
      [req.params.id]
    );

    const buildings = result.rows.map((r) => ({
      ...r,
      area_sqm: r.area_sqm != null ? Number(r.area_sqm) : null,
      estimated_height_m: r.estimated_height_m != null ? Number(r.estimated_height_m) : null,
      footprint: r.footprint_geojson ? JSON.parse(r.footprint_geojson) : null,
      footprint_geojson: undefined,
    }));

    const totalBuildingArea = buildings.reduce((sum, b) => sum + (b.area_sqm || 0), 0);
    const parcelArea = Number(parcel.area_sqm) || 0;
    const coveragePct = parcelArea > 0 ? (totalBuildingArea / parcelArea) * 100 : 0;

    res.json({
      buildings,
      summary: {
        count: buildings.length,
        totalBuildingArea: Math.round(totalBuildingArea),
        parcelArea: Math.round(parcelArea),
        coveragePct: coveragePct.toFixed(1),
        tallestBuilding: buildings.reduce((max, b) => Math.max(max, b.estimated_height_m || 0), 0),
        avgHeight: buildings.length > 0
          ? (buildings.reduce((sum, b) => sum + (b.estimated_height_m || 0), 0) / buildings.length).toFixed(1)
          : 0,
        permitted: buildings.filter(b => b.status === 'verified_permitted').length,
        unpermitted: buildings.filter(b => b.status === 'verified_unpermitted').length,
        unverified: buildings.filter(b => b.status === 'unverified').length,
      },
    });
  } catch (err) {
    next(err);
  }
};

function formatParcel(row) {
  return {
    ...row,
    area_sqm: row.area_sqm != null ? Number(row.area_sqm) : null,
    perimeter_m: row.perimeter_m != null ? Number(row.perimeter_m) : null,
    boundary: row.boundary_geojson ? JSON.parse(row.boundary_geojson) : null,
    boundary_geojson: undefined,
  };
}

// GET /parcels/:id/media — list all field media across all visits for a parcel
exports.listMedia = async (req, res, next) => {
  try {
    const parcelRes = await db.query('SELECT owner_id FROM parcels WHERE id = $1', [req.params.id]);
    const parcel = parcelRes.rows[0];
    if (!parcel) return res.status(404).json({ error: 'Parcel not found' });

    if (req.user.role === 'owner' && !req.user.isSalesManager && parcel.owner_id !== req.user.id) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    const result = await db.query(
      `SELECT m.id, m.url, m.type, m.uploaded_at,
              v.id AS visit_id, v.type AS visit_type, v.status AS visit_status,
              a.name AS agent_name
       FROM media m
       JOIN visit_requests v ON m.visit_request_id = v.id
       LEFT JOIN agents a ON v.agent_id = a.id
       WHERE v.parcel_id = $1
       ORDER BY m.uploaded_at DESC`,
      [req.params.id]
    );
    res.json(result.rows);
  } catch (err) {
    next(err);
  }
};

// GET /parcels/:id/alert-trends — per-parcel alert counts by month for last 12 months
exports.alertTrends = async (req, res, next) => {
  try {
    const parcelRes = await db.query('SELECT owner_id FROM parcels WHERE id = $1', [req.params.id]);
    const parcel = parcelRes.rows[0];
    if (!parcel) return res.status(404).json({ error: 'Parcel not found' });

    if (req.user.role === 'owner' && !req.user.isSalesManager && parcel.owner_id !== req.user.id) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    const result = await db.query(
      `SELECT
         to_char(date_trunc('month', detected_at), 'YYYY-MM') AS month,
         COUNT(*) FILTER (WHERE verified = true)  AS verified,
         COUNT(*) FILTER (WHERE verified = false) AS unverified,
         COUNT(*) AS total
       FROM alerts
       WHERE parcel_id = $1
         AND detected_at >= now() - interval '12 months'
       GROUP BY date_trunc('month', detected_at)
       ORDER BY date_trunc('month', detected_at)`,
      [req.params.id]
    );
    res.json(result.rows);
  } catch (err) {
    next(err);
  }
};
