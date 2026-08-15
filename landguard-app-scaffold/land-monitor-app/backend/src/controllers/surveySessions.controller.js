const db = require('../config/db');
const turf = require('@turf/turf');

// POST /survey-sessions — start a new session (live GPS or manual coords)
exports.start = async (req, res, next) => {
  try {
    const { method } = req.body;
    const result = await db.query(
      `INSERT INTO survey_sessions (surveyed_by, method) VALUES ($1, $2) RETURNING *`,
      [req.user.id, method]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    next(err);
  }
};

// PATCH /survey-sessions/:id — optional incremental save while survey is in progress
exports.update = async (req, res, next) => {
  try {
    const { raw_points, gps_accuracy_m } = req.body;
    const result = await db.query(
      `UPDATE survey_sessions SET raw_points = $1, gps_accuracy_m = $2 WHERE id = $3 RETURNING *`,
      [JSON.stringify(raw_points), gps_accuracy_m, req.params.id]
    );
    res.json(result.rows[0]);
  } catch (err) {
    next(err);
  }
};

// POST /survey-sessions/:id/sync — batch sync of points collected offline
exports.syncPoints = async (req, res, next) => {
  try {
    const { points } = req.body; // [{ lat, lng, accuracy_m, captured_at }, ...]
    const result = await db.query(
      `UPDATE survey_sessions SET raw_points = $1 WHERE id = $2 RETURNING id, method, started_at`,
      [JSON.stringify(points), req.params.id]
    );
    if (!result.rows[0]) return res.status(404).json({ error: 'Session not found' });
    res.json({ synced: true, session: result.rows[0] });
  } catch (err) {
    next(err);
  }
};

// POST /survey-sessions/:id/finalize — close the polygon, compute area/perimeter, create the parcel
exports.finalize = async (req, res, next) => {
  try {
    const { owner_id, name, region } = req.body;

    const sessionResult = await db.query('SELECT * FROM survey_sessions WHERE id = $1', [req.params.id]);
    const session = sessionResult.rows[0];
    if (!session) return res.status(404).json({ error: 'Session not found' });

    const points = session.raw_points; // array of { lat, lng }
    if (!points || points.length < 3) {
      return res.status(400).json({ error: 'Need at least 3 points to form a boundary' });
    }

    // Build a closed GeoJSON polygon from the captured points
    const coordinates = points.map((p) => [p.lng, p.lat]);
    coordinates.push(coordinates[0]); // close the ring
    const boundaryGeojson = { type: 'Polygon', coordinates: [coordinates] };

    const areaSqm = turf.area(boundaryGeojson);
    const perimeterM = turf.length(turf.polygonToLine(boundaryGeojson), { units: 'meters' });

    const parcelResult = await db.query(
      `INSERT INTO parcels (owner_id, name, boundary, region, area_sqm, perimeter_m, survey_date)
       VALUES ($1, $2, ST_SetSRID(ST_GeomFromGeoJSON($3), 4326), $4, $5, $6, CURRENT_DATE)
       RETURNING id, name, area_sqm, perimeter_m, ST_AsGeoJSON(boundary) AS boundary_geojson`,
      [owner_id, name, JSON.stringify(boundaryGeojson), region, areaSqm, perimeterM]
    );
    const parcel = parcelResult.rows[0];

    await db.query(
      `UPDATE survey_sessions SET parcel_id = $1, completed_at = now() WHERE id = $2`,
      [parcel.id, req.params.id]
    );

    res.status(201).json({
      ...parcel,
      boundary: JSON.parse(parcel.boundary_geojson),
      boundary_geojson: undefined,
    });
  } catch (err) {
    next(err);
  }
};

// POST /survey-sessions/import — upload GeoJSON/KML/Shapefile/GPX for preview before saving
exports.importFile = async (req, res, next) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No file uploaded' });

    const ext = req.file.originalname.split('.').pop().toLowerCase();
    let boundaryGeojson;

    if (ext === 'geojson' || ext === 'json') {
      boundaryGeojson = JSON.parse(req.file.buffer.toString('utf-8'));
    } else if (ext === 'kml' || ext === 'kmz') {
      // TODO: parse with a library such as @tmcw/togeojson (KML) — KMZ needs unzipping first
      return res.status(501).json({ error: 'KML/KMZ parsing not yet implemented — plug in @tmcw/togeojson here' });
    } else if (ext === 'shp') {
      // TODO: parse with shpjs — Shapefile uploads typically need the .shp, .shx, and .dbf together
      return res.status(501).json({ error: 'Shapefile parsing not yet implemented — plug in shpjs here' });
    } else if (ext === 'gpx') {
      // TODO: parse with @tmcw/togeojson (also handles GPX)
      return res.status(501).json({ error: 'GPX parsing not yet implemented — plug in @tmcw/togeojson here' });
    } else {
      return res.status(400).json({ error: `Unsupported file type: ${ext}` });
    }

    const areaSqm = turf.area(boundaryGeojson);
    const perimeterM = turf.length(turf.polygonToLine(boundaryGeojson), { units: 'meters' });

    // Return a preview only — the client confirms on the map before calling /parcels or finalize
    res.json({ boundary: boundaryGeojson, area_sqm: areaSqm, perimeter_m: perimeterM });
  } catch (err) {
    next(err);
  }
};
