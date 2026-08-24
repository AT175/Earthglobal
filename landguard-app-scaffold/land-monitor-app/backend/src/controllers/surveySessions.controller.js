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

    const points = session.raw_points; // array of { lat, lng, accuracy }
    if (!points || points.length < 3) {
      return res.status(400).json({ error: 'Need at least 3 points to form a boundary' });
    }

    // If points have accuracy data, apply server-side outlier removal
    let cleanedPoints = points;
    if (points[0]?.accuracy != null && points.length >= 4) {
      cleanedPoints = removeOutliers(points);
    }

    // Build a closed GeoJSON polygon from the cleaned points
    const coordinates = cleanedPoints.map((p) => [p.lng, p.lat]);
    coordinates.push(coordinates[0]); // close the ring
    const boundaryGeojson = { type: 'Polygon', coordinates: [coordinates] };

    const areaSqm = turf.area(boundaryGeojson);
    const perimeterM = turf.length(turf.polygonToLine(boundaryGeojson), { units: 'meters' });

    // Compute average accuracy if available
    const avgAccuracy = cleanedPoints[0]?.accuracy != null
      ? cleanedPoints.reduce((sum, p) => sum + (p.accuracy || 0), 0) / cleanedPoints.length
      : null;

    const parcelResult = await db.query(
      `INSERT INTO parcels (owner_id, name, boundary, region, area_sqm, perimeter_m, survey_date)
       VALUES ($1, $2, ST_SetSRID(ST_GeomFromGeoJSON($3), 4326), $4, $5, $6, CURRENT_DATE)
       RETURNING id, name, area_sqm, perimeter_m, ST_AsGeoJSON(boundary) AS boundary_geojson`,
      [owner_id, name, JSON.stringify(boundaryGeojson), region, areaSqm, perimeterM]
    );
    const parcel = parcelResult.rows[0];

    await db.query(
      `UPDATE survey_sessions SET parcel_id = $1, completed_at = now(), gps_accuracy_m = $2 WHERE id = $3`,
      [parcel.id, avgAccuracy, req.params.id]
    );

    res.status(201).json({
      ...parcel,
      boundary: JSON.parse(parcel.boundary_geojson),
      boundary_geojson: undefined,
      points_used: cleanedPoints.length,
      points_removed: points.length - cleanedPoints.length,
      avg_accuracy_m: avgAccuracy,
    });
  } catch (err) {
    next(err);
  }
};

// Median Absolute Deviation (MAD) outlier removal for GPS points
function removeOutliers(points) {
  const lats = points.map((p) => p.lat).sort((a, b) => a - b);
  const lngs = points.map((p) => p.lng).sort((a, b) => a - b);
  const medLat = lats[Math.floor(lats.length / 2)];
  const medLng = lngs[Math.floor(lngs.length / 2)];

  // Compute distances from median
  const withDist = points.map((p) => ({
    ...p,
    dist: haversineDist(p.lat, p.lng, medLat, medLng),
  }));

  // MAD
  const dists = withDist.map((p) => p.dist).sort((a, b) => a - b);
  const medDist = dists[Math.floor(dists.length / 2)];

  if (medDist === 0) return points; // can't filter if all points are identical

  const threshold = medDist * 3;
  const filtered = withDist.filter((p) => p.dist <= threshold);

  // Keep at least 60% of points
  const minKeep = Math.ceil(points.length * 0.6);
  return filtered.length >= minKeep ? filtered : withDist.slice(0, minKeep);
}

function haversineDist(lat1, lng1, lat2, lng2) {
  const R = 6371000;
  const toRad = (d) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

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
