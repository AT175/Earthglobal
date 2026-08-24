const db = require('../config/db');
const turf = require('@turf/turf');
const { computeParcelNdvi } = require('../jobs/ndviChangeDetection');

// GET /parcels — list parcels belonging to the authenticated owner
exports.listForOwner = async (req, res, next) => {
  try {
    const result = await db.query(
      `SELECT id, name, region, survey_date, area_sqm, perimeter_m,
              ST_AsGeoJSON(boundary) AS boundary_geojson
       FROM parcels WHERE owner_id = $1
       ORDER BY created_at DESC`,
      [req.user.id]
    );
    res.json(result.rows.map(formatParcel));
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

    // Owners can only view their own parcel; admins/agents can view any
    if (req.user.role === 'owner' && parcel.owner_id !== req.user.id) {
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

function formatParcel(row) {
  return {
    ...row,
    area_sqm: row.area_sqm != null ? Number(row.area_sqm) : null,
    perimeter_m: row.perimeter_m != null ? Number(row.perimeter_m) : null,
    boundary: row.boundary_geojson ? JSON.parse(row.boundary_geojson) : null,
    boundary_geojson: undefined,
  };
}
