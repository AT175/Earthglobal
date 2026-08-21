/**
 * Planning Scheme Management Controller
 *
 * Allows planning officers to upload planning schemes (land use zoning maps)
 * for their assembly. Schemes may be uploaded in a local datum/projection
 * (e.g. Accra / Ghana Grid) and are reprojected to WGS84 (EPSG:4326) for
 * map visualization. Each scheme contains parcels that form the basis for
 * building extraction per parcel.
 */
const db = require('../config/db');
const proj4 = require('proj4');
const bus = require('../realtime/eventBus');

// Common Ghana + West Africa projections (predefined for convenience)
const KNOWN_PROJECTIONS = {
  'EPSG:4326': { name: 'WGS84 (lat/lng)', def: '+proj=longlat +datum=WGS84 +no_defs' },
  'EPSG:32630': { name: 'WGS84 / UTM zone 30N', def: '+proj=utm +zone=30 +datum=WGS84 +units=m +no_defs' },
  'EPSG:32631': { name: 'WGS84 / UTM zone 31N', def: '+proj=utm +zone=31 +datum=WGS84 +units=m +no_defs' },
  'EPSG:2136': { name: 'Accra / Ghana Grid', def: '+proj=tmerc +lat_0=4.66666666666667 +lon_0=-1 +k=0.99975 +x_0=274319.51 +y_0=91439.84 +ellps=clrk80 +towgs84=-199.87,68.91,42.74,0,0,0,0 +units=m +no_defs' },
  'EPSG:2137': { name: 'Accra / Ghana National Grid', def: '+proj=tmerc +lat_0=4.66666666666667 +lon_0=-1 +k=0.99975 +x_0=900000 +y_0=0 +ellps=clrk80 +towgs84=-199.87,68.91,42.74,0,0,0,0 +units=m +no_defs' },
  'EPSG:25000': { name: 'Ghana Grid (feet)', def: '+proj=tmerc +lat_0=4.66666666666667 +lon_0=-1 +k=0.99975 +x_0=900000 +y_0=0 +ellps=clrk80 +towgs84=-199.87,68.91,42.74,0,0,0,0 +units=ft +no_defs' },
};

// Register all known projections with proj4
Object.entries(KNOWN_PROJECTIONS).forEach(([code, info]) => {
  proj4.defs(code, info.def);
});

const TARGET_CRS = 'EPSG:4326'; // WGS84 — always store in this for map display

// ── Helper: get org_id from authenticated assembly user ──
function getOrgId(req) {
  return req.user.organizationId || req.user.organization_id;
}

/**
 * Reproject a GeoJSON geometry from source CRS to WGS84 (EPSG:4326).
 * Handles Point, LineString, Polygon, MultiPolygon and their multi-variants.
 */
function reprojectGeometry(geometry, sourceCRS) {
  if (!geometry) return geometry;
  if (sourceCRS === TARGET_CRS) return geometry;

  const fromProj = proj4(sourceCRS, TARGET_CRS);

  function transformCoords(coords) {
    if (typeof coords[0] === 'number') {
      // [x, y] or [x, y, z]
      const [lng, lat] = fromProj.forward([coords[0], coords[1]]);
      return coords.length > 2 ? [lng, lat, coords[2]] : [lng, lat];
    }
    return coords.map(transformCoords);
  }

  const reprojected = JSON.parse(JSON.stringify(geometry));
  reprojected.coordinates = transformCoords(reprojected.coordinates);
  return reprojected;
}

/**
 * Compute the bounding box of a GeoJSON FeatureCollection.
 */
function computeBBox(featureCollection) {
  let minLng = Infinity, minLat = Infinity, maxLng = -Infinity, maxLat = -Infinity;

  function processCoords(coords) {
    if (typeof coords[0] === 'number') {
      minLng = Math.min(minLng, coords[0]);
      minLat = Math.min(minLat, coords[1]);
      maxLng = Math.max(maxLng, coords[0]);
      maxLat = Math.max(maxLat, coords[1]);
    } else {
      coords.forEach(processCoords);
    }
  }

  for (const feature of featureCollection.features || []) {
    if (feature.geometry) processCoords(feature.geometry.coordinates);
  }

  if (minLng === Infinity) return null;
  return { minLng, minLat, maxLng, maxLat };
}

/**
 * Compute approximate area in sqm from a GeoJSON polygon (using turf-like calc).
 * For simplicity, uses the bounding box area as approximation for large zones.
 */
function computeApproxAreaSqm(geometry) {
  if (!geometry) return 0;
  // Use PostGIS ST_Area on insert instead — this is just a fallback
  return 0;
}

// ═══════════════════════════════════════════════════════════
// GET /assembly/planning/schemes — list all schemes for the org
// ═══════════════════════════════════════════════════════════
exports.listSchemes = async (req, res, next) => {
  try {
    const orgId = getOrgId(req);
    const result = await db.query(
      `SELECT id, name, description, source_crs, source_crs_name, source_format,
              parcel_count, total_area_sqm, status, version,
              uploaded_by_name, uploaded_at, created_at,
              ST_AsGeoJSON(boundary) as boundary_geojson
       FROM planning_schemes
       WHERE organization_id = $1
       ORDER BY uploaded_at DESC`,
      [orgId]
    );

    res.json({
      schemes: result.rows.map(r => ({
        id: r.id,
        name: r.name,
        description: r.description,
        source_crs: r.source_crs,
        source_crs_name: r.source_crs_name,
        source_format: r.source_format,
        parcel_count: r.parcel_count,
        total_area_sqm: r.total_area_sqm ? parseFloat(r.total_area_sqm) : null,
        status: r.status,
        version: r.version,
        uploaded_by_name: r.uploaded_by_name,
        uploaded_at: r.uploaded_at,
        created_at: r.created_at,
        boundary: r.boundary_geojson ? JSON.parse(r.boundary_geojson) : null,
      })),
    });
  } catch (err) { next(err); }
};

// ═══════════════════════════════════════════════════════════
// GET /assembly/planning/schemes/:id — get a single scheme with full GeoJSON
// ═══════════════════════════════════════════════════════════
exports.getScheme = async (req, res, next) => {
  try {
    const orgId = getOrgId(req);
    const result = await db.query(
      `SELECT s.*, ST_AsGeoJSON(s.boundary) as boundary_geojson
       FROM planning_schemes s
       WHERE s.id = $1 AND s.organization_id = $2`,
      [req.params.id, orgId]
    );

    if (!result.rows[0]) return res.status(404).json({ error: 'Scheme not found' });

    const s = result.rows[0];

    // Also get the scheme parcels
    const parcelsResult = await db.query(
      `SELECT id, parcel_label, land_use, area_sqm,
              ST_AsGeoJSON(boundary) as boundary_geojson,
              last_extraction_at, last_extraction_count, last_extraction_area_sqm,
              metadata
       FROM scheme_parcels
       WHERE scheme_id = $1
       ORDER BY parcel_label`,
      [req.params.id]
    );

    res.json({
      id: s.id,
      name: s.name,
      description: s.description,
      source_crs: s.source_crs,
      source_crs_name: s.source_crs_name,
      source_format: s.source_format,
      geojson: s.geojson,
      parcel_count: s.parcel_count,
      total_area_sqm: s.total_area_sqm ? parseFloat(s.total_area_sqm) : null,
      status: s.status,
      version: s.version,
      original_filename: s.original_filename,
      uploaded_by_name: s.uploaded_by_name,
      uploaded_at: s.uploaded_at,
      boundary: s.boundary_geojson ? JSON.parse(s.boundary_geojson) : null,
      parcels: parcelsResult.rows.map(p => ({
        id: p.id,
        parcel_label: p.parcel_label,
        land_use: p.land_use,
        area_sqm: p.area_sqm ? parseFloat(p.area_sqm) : null,
        boundary: p.boundary_geojson ? JSON.parse(p.boundary_geojson) : null,
        last_extraction_at: p.last_extraction_at,
        last_extraction_count: p.last_extraction_count,
        last_extraction_area_sqm: p.last_extraction_area_sqm ? parseFloat(p.last_extraction_area_sqm) : null,
        metadata: p.metadata,
      })),
    });
  } catch (err) { next(err); }
};

// ═══════════════════════════════════════════════════════════
// GET /assembly/planning/schemes/:id/geojson — get scheme as GeoJSON for map
// ═══════════════════════════════════════════════════════════
exports.getSchemeGeoJSON = async (req, res, next) => {
  try {
    const orgId = getOrgId(req);
    const result = await db.query(
      `SELECT geojson FROM planning_schemes WHERE id = $1 AND organization_id = $2`,
      [req.params.id, orgId]
    );

    if (!result.rows[0]) return res.status(404).json({ error: 'Scheme not found' });

    res.json(result.rows[0].geojson);
  } catch (err) { next(err); }
};

// ═══════════════════════════════════════════════════════════
// GET /assembly/planning/schemes/:id/parcels — get scheme parcels as GeoJSON
// ═══════════════════════════════════════════════════════════
exports.getSchemeParcelsGeoJSON = async (req, res, next) => {
  try {
    const orgId = getOrgId(req);
    const result = await db.query(
      `SELECT id, parcel_label, land_use, area_sqm,
              last_extraction_count, last_extraction_at,
              ST_AsGeoJSON(boundary) as boundary_geojson,
              metadata
       FROM scheme_parcels
       WHERE scheme_id = $1 AND organization_id = $2
       ORDER BY parcel_label`,
      [req.params.id, orgId]
    );

    const fc = {
      type: 'FeatureCollection',
      features: result.rows.map(r => ({
        type: 'Feature',
        geometry: r.boundary_geojson ? JSON.parse(r.boundary_geojson) : null,
        properties: {
          id: r.id,
          parcel_label: r.parcel_label,
          land_use: r.land_use,
          area_sqm: r.area_sqm ? parseFloat(r.area_sqm) : null,
          last_extraction_count: r.last_extraction_count,
          last_extraction_at: r.last_extraction_at,
          metadata: r.metadata,
        },
      })),
    };

    res.json(fc);
  } catch (err) { next(err); }
};

// ═══════════════════════════════════════════════════════════
// POST /assembly/planning/schemes — upload a new planning scheme
// Body: { name, description, source_crs, geojson, format, version }
// The geojson is in the source CRS; we reproject to WGS84 for storage.
// ═══════════════════════════════════════════════════════════
exports.uploadScheme = async (req, res, next) => {
  try {
    const orgId = getOrgId(req);
    const { name, description, source_crs, source_crs_name, geojson, format, version } = req.body;

    if (!name) return res.status(400).json({ error: 'Scheme name is required' });
    if (!geojson || !geojson.features) return res.status(400).json({ error: 'Valid GeoJSON FeatureCollection is required' });

    // Determine source CRS — default to WGS84 if not specified
    const crs = source_crs || 'EPSG:4326';
    const crsName = source_crs_name || KNOWN_PROJECTIONS[crs]?.name || crs;

    // Verify the CRS is known
    if (!KNOWN_PROJECTIONS[crs] && crs !== 'EPSG:4326') {
      // Try to register it — proj4 might know it
      try {
        proj4.defs(crs);
      } catch {
        return res.status(400).json({
          error: `Unknown projection: ${crs}. Supported: ${Object.keys(KNOWN_PROJECTIONS).join(', ')}`,
        });
      }
    }

    // Reproject all features from source CRS to WGS84
    let reprojectedGeoJSON;
    try {
      reprojectedGeoJSON = {
        type: 'FeatureCollection',
        features: geojson.features.map(feature => ({
          ...feature,
          geometry: reprojectGeometry(feature.geometry, crs),
        })),
      };
    } catch (reprojErr) {
      return res.status(400).json({ error: `Reprojection failed: ${reprojErr.message}` });
    }

    // Compute bounding box of the reprojected GeoJSON
    const bbox = computeBBox(reprojectedGeoJSON);
    if (!bbox) {
      return res.status(400).json({ error: 'Could not compute bounding box from GeoJSON' });
    }

    // Create a boundary polygon from the bbox
    const boundaryGeoJSON = {
      type: 'Polygon',
      coordinates: [[
        [bbox.minLng, bbox.minLat],
        [bbox.maxLng, bbox.minLat],
        [bbox.maxLng, bbox.maxLat],
        [bbox.minLng, bbox.maxLat],
        [bbox.minLng, bbox.minLat],
      ]],
    };

    // Insert the scheme
    const schemeResult = await db.query(
      `INSERT INTO planning_schemes
         (organization_id, name, description, source_crs, source_crs_name, source_format,
          boundary, geojson, parcel_count, status, version, uploaded_by, uploaded_by_name,
          original_filename, original_file_size)
       VALUES ($1, $2, $3, $4, $5, $6,
               ST_SetSRID(ST_GeomFromGeoJSON($7), 4326), $8, $9, 'active', $10, $11, $12, $13, $14)
       RETURNING id`,
      [
        orgId, name, description || null, crs, crsName, format || 'geojson',
        JSON.stringify(boundaryGeoJSON), JSON.stringify(reprojectedGeoJSON),
        reprojectedGeoJSON.features.length, version || '1.0',
        req.user.id, req.user.name,
        req.file?.originalname || null, req.file?.size || null,
      ]
    );

    const schemeId = schemeResult.rows[0].id;

    // Insert individual scheme parcels (one per feature)
    let totalArea = 0;
    for (const feature of reprojectedGeoJSON.features) {
      if (!feature.geometry || feature.geometry.type !== 'Polygon') continue;

      const props = feature.properties || {};
      const parcelLabel = props.parcel_label || props.label || props.name || `Parcel ${Math.random().toString(36).slice(2, 7)}`;
      const landUse = props.land_use || props.landuse || props.zone || props.use || null;

      try {
        const parcelResult = await db.query(
          `INSERT INTO scheme_parcels
             (scheme_id, organization_id, parcel_label, land_use,
              boundary, area_sqm, original_coordinates, metadata)
           VALUES ($1, $2, $3, $4,
                   ST_SetSRID(ST_GeomFromGeoJSON($5), 4326),
                   ST_Area(ST_SetSRID(ST_GeomFromGeoJSON($5), 4326)::geography),
                   $6, $7)
           RETURNING id, area_sqm`,
          [
            schemeId, orgId, parcelLabel, landUse,
            JSON.stringify(feature.geometry),
            JSON.stringify(feature.geometry), // store reprojected as original (already in WGS84)
            JSON.stringify(props),
          ]
        );

        if (parcelResult.rows[0]?.area_sqm) {
          totalArea += parseFloat(parcelResult.rows[0].area_sqm);
        }
      } catch (e) {
        console.error('[Scheme] Error saving parcel:', e.message);
      }
    }

    // Update total area
    await db.query(
      'UPDATE planning_schemes SET total_area_sqm = $1 WHERE id = $2',
      [totalArea, schemeId]
    );

    // Emit real-time event
    bus.emit('scheme:uploaded', {
      orgId,
      schemeId,
      name,
      parcelCount: reprojectedGeoJSON.features.length,
      sourceCrs: crs,
      reprojected: crs !== 'EPSG:4326',
    });

    res.status(201).json({
      id: schemeId,
      name,
      message: `Scheme uploaded successfully with ${reprojectedGeoJSON.features.length} parcels`,
      reprojected: crs !== 'EPSG:4326',
      source_crs: crs,
      source_crs_name: crsName,
      target_crs: TARGET_CRS,
      parcel_count: reprojectedGeoJSON.features.length,
      total_area_sqm: totalArea,
      bbox,
    });
  } catch (err) {
    console.error('[Scheme] Upload error:', err.message);
    next(err);
  }
};

// ═══════════════════════════════════════════════════════════
// DELETE /assembly/planning/schemes/:id — delete a scheme
// ═══════════════════════════════════════════════════════════
exports.deleteScheme = async (req, res, next) => {
  try {
    const orgId = getOrgId(req);
    const result = await db.query(
      'DELETE FROM planning_schemes WHERE id = $1 AND organization_id = $2 RETURNING id, name',
      [req.params.id, orgId]
    );

    if (!result.rows[0]) return res.status(404).json({ error: 'Scheme not found' });

    res.json({ message: `Scheme "${result.rows[0].name}" deleted` });
  } catch (err) { next(err); }
};

// ═══════════════════════════════════════════════════════════
// PATCH /assembly/planning/schemes/:id — update scheme metadata
// ═══════════════════════════════════════════════════════════
exports.updateScheme = async (req, res, next) => {
  try {
    const orgId = getOrgId(req);
    const { name, description, status, version } = req.body;

    const result = await db.query(
      `UPDATE planning_schemes SET
         name = COALESCE($1, name),
         description = COALESCE($2, description),
         status = COALESCE($3, status),
         version = COALESCE($4, version),
         updated_at = now()
       WHERE id = $5 AND organization_id = $6
       RETURNING id, name, description, status, version`,
      [name, description, status, version, req.params.id, orgId]
    );

    if (!result.rows[0]) return res.status(404).json({ error: 'Scheme not found' });

    res.json(result.rows[0]);
  } catch (err) { next(err); }
};

// ═══════════════════════════════════════════════════════════
// GET /assembly/planning/projections — list supported projections
// ═══════════════════════════════════════════════════════════
exports.listProjections = async (req, res) => {
  res.json({
    projections: Object.entries(KNOWN_PROJECTIONS).map(([code, info]) => ({
      code,
      name: info.name,
    })),
    target_crs: TARGET_CRS,
  });
};

// ═══════════════════════════════════════════════════════════
// POST /assembly/planning/schemes/:id/parcels/:parcelId/extract-buildings
// Run building extraction for a specific scheme parcel using EE
// ═══════════════════════════════════════════════════════════
exports.extractBuildingsForParcel = async (req, res, next) => {
  try {
    const orgId = getOrgId(req);
    const { id: schemeId, parcelId } = req.params;

    // Get the parcel boundary
    const parcelResult = await db.query(
      `SELECT id, parcel_label, land_use, ST_AsGeoJSON(boundary) as boundary_geojson
       FROM scheme_parcels
       WHERE id = $1 AND scheme_id = $2 AND organization_id = $3`,
      [parcelId, schemeId, orgId]
    );

    if (!parcelResult.rows[0]) return res.status(404).json({ error: 'Scheme parcel not found' });

    const parcel = parcelResult.rows[0];
    const boundaryGeoJSON = JSON.parse(parcel.boundary_geojson);

    // Compute bbox from the parcel boundary
    function getBBox(geojson) {
      let minLng = Infinity, minLat = Infinity, maxLng = -Infinity, maxLat = -Infinity;
      function processCoords(coords) {
        if (typeof coords[0] === 'number') {
          minLng = Math.min(minLng, coords[0]);
          minLat = Math.min(minLat, coords[1]);
          maxLng = Math.max(maxLng, coords[0]);
          maxLat = Math.max(maxLat, coords[1]);
        } else { coords.forEach(processCoords); }
      }
      processCoords(geojson.coordinates);
      return { minLng, minLat, maxLng, maxLat };
    }

    const bbox = getBBox(boundaryGeoJSON);

    // Use the existing detectBuildings logic by calling the EE building detection
    // We'll delegate to the same approach used in assembly.controller.detectBuildings
    const { ee, init: initEE } = require('../config/earthEngine');
    const ready = await initEE();

    if (!ready) {
      return res.status(503).json({
        error: 'Earth Engine is not configured. Set EE_SERVICE_ACCOUNT_JSON to enable building extraction.',
      });
    }

    // Use the parcel polygon as the region (more accurate than bbox)
    const region = ee.Geometry(boundaryGeoJSON);

    // Sentinel-2 composite
    const s2 = ee.ImageCollection('COPERNICUS/S2_HARMONIZED')
      .filterDate('2024-01-01', '2025-12-31')
      .filter(ee.Filter.lt('CLOUDY_PIXEL_PERCENTAGE', 15))
      .filterBounds(region)
      .median();

    // Building indices
    const ndbi = s2.normalizedDifference(['B11', 'B8']).rename('ndbi');
    const ndvi = s2.normalizedDifference(['B8', 'B4']).rename('ndvi');
    const bsi = s2.expression(
      '((SWIR1 + Red) - (NIR + Blue)) / ((SWIR1 + Red) + (NIR + Blue))',
      { SWIR1: s2.select('B11'), Red: s2.select('B4'), NIR: s2.select('B8'), Blue: s2.select('B2') }
    ).rename('bsi');

    const builtup = ndbi.gt(0.05).and(ndvi.lt(0.2)).and(bsi.gt(0.1)).rename('builtup');

    // Statistics
    const stats = builtup.reduceRegion({
      reducer: ee.Reducer.count(),
      geometry: region,
      scale: 10,
      maxPixels: 1e13,
    });

    // Vectorize
    const vectors = builtup.addBands(s2.select('B4')).reduceToVectors({
      geometry: region,
      scale: 10,
      geometryType: 'polygon',
      eightConnected: true,
      labelProperty: 'builtup',
      reducer: ee.Reducer.count(),
      maxPixels: 1e13,
    });

    const builtUpPolygons = vectors.filter(ee.Filter.eq('builtup', 1))
      .filter(ee.Filter.gte('count', 5));

    // Get stats and features
    const statsResult = await new Promise((resolve, reject) => {
      stats.evaluate((result, err) => {
        if (err) reject(err); else resolve(result);
      });
    });

    const features = await new Promise((resolve, reject) => {
      builtUpPolygons.toList(500).evaluate((features, err) => {
        if (err) reject(err); else resolve(features || []);
      });
    });

    const builtupPixels = statsResult?.ndbi || 0;
    const builtupAreaSqm = builtupPixels * 100;
    const estimatedBuildings = Math.max(1, Math.round(builtupAreaSqm / 120));

    // Save buildings to DB
    const savedBuildings = [];
    for (const feat of features.slice(0, 200)) {
      try {
        const geom = feat.geometry;
        const coords = geom?.coordinates;
        if (!coords || !coords[0] || coords[0].length < 4) continue;

        const geojson = {
          type: 'Polygon',
          coordinates: coords[0] ? [coords[0].map(c => [c[0], c[1]])] : coords,
        };

        const lats = geojson.coordinates[0].map(c => c[1]);
        const lngs = geojson.coordinates[0].map(c => c[0]);
        const centroidLat = lats.reduce((a, b) => a + b, 0) / lats.length;
        const centroidLng = lngs.reduce((a, b) => a + b, 0) / lngs.length;

        const insertResult = await db.query(
          `INSERT INTO buildings (organization_id, footprint, area_sqm, status, in_protected_area, detected_at, centroid_lat, centroid_lng, metadata)
           VALUES ($1, ST_SetSRID(ST_GeomFromGeoJSON($2), 4326), ST_Area(ST_SetSRID(ST_GeomFromGeoJSON($2), 4326)::geography), 'unverified', false, now(), $3, $4, $5)
           RETURNING id, area_sqm`,
          [orgId, JSON.stringify(geojson), centroidLat, centroidLng, JSON.stringify({
            detection_method: 'sentinel2_ndbi_ndvi_bsi',
            detection_date: new Date().toISOString(),
            source: 'scheme_parcel_extraction',
            scheme_id: schemeId,
            scheme_parcel_id: parcelId,
            parcel_label: parcel.parcel_label,
            pixel_count: feat.properties?.count || 0,
          })]
        );

        savedBuildings.push({
          id: insertResult.rows[0].id,
          area_sqm: parseFloat(insertResult.rows[0].area_sqm),
        });
      } catch (e) { /* skip */ }
    }

    // Update the scheme parcel with extraction results
    await db.query(
      `UPDATE scheme_parcels SET
         last_extraction_at = now(),
         last_extraction_count = $1,
         last_extraction_area_sqm = $2
       WHERE id = $3`,
      [savedBuildings.length, builtupAreaSqm, parcelId]
    );

    res.json({
      scheme_id: schemeId,
      parcel_id: parcelId,
      parcel_label: parcel.parcel_label,
      detected: true,
      stats: {
        builtup_pixels: builtupPixels,
        builtup_area_sqm: builtupAreaSqm,
        estimated_buildings: estimatedBuildings,
        vectorized_buildings: savedBuildings.length,
      },
      saved_buildings: savedBuildings,
      method: 'Sentinel-2 NDBI + NDVI + BSI extraction for scheme parcel',
    });
  } catch (err) {
    console.error('[Scheme] Building extraction error:', err.message);
    res.status(500).json({ error: 'Building extraction failed', detail: err.message });
  }
};

module.exports = exports;
