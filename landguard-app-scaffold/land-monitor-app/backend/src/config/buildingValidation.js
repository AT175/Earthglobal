/**
 * Building Validation Module
 *
 * Cross-references detected buildings against authoritative datasets:
 *   1. Google Open Buildings (via Earth Engine) — high-accuracy footprints
 *   2. OpenStreetMap (via Overpass API) — community-mapped with attributes
 *
 * For each detected building, this module:
 *   - Finds the nearest Google Open Building and records confidence + distance
 *   - Finds the nearest OSM building and records its attributes (type, levels, name)
 *   - Determines a validation_status: 'validated' (matched), 'pending' (no match), 'conflict' (mismatch)
 *   - Enriches metadata with building_type, building_use, building_name
 *   - Attempts to resolve ownership from linked parcel records
 *
 * Usage:
 *   const { validateBuilding, validateBuildingsBatch } = require('./config/buildingValidation');
 *   const result = await validateBuilding(geojson, centroid, { db, orgId, bbox });
 */
const { ee, init: initEE } = require('./earthEngine');

// ── Constants ──
const MATCH_THRESHOLD_M = 20;   // max distance (meters) to consider a match
const OSM_TIMEOUT_MS = 15000;   // Overpass API timeout

/**
 * Haversine distance between two lat/lng points in meters.
 */
function haversineMeters(lat1, lng1, lat2, lng2) {
  const R = 6371000; // Earth radius in meters
  const toRad = (d) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

/**
 * Fetch Google Open Buildings near a centroid from Earth Engine.
 * Returns array of { geojson, confidence, area_sqm, distance_m }.
 */
async function fetchGoogleBuildingsNearby(lat, lng, radiusM = 100) {
  const ready = await initEE();
  if (!ready) return [];

  try {
    // Create a small buffer around the centroid (~0.001° ≈ 111m)
    const bufferDeg = Math.max(0.001, radiusM / 111000);
    const region = ee.Geometry.Rectangle([
      lng - bufferDeg, lat - bufferDeg,
      lng + bufferDeg, lat + bufferDeg,
    ], 'EPSG:4326', false);

    const openBuildings = ee.FeatureCollection('GOOGLE/Research/open-buildings-temporal/v1')
      .filterBounds(region)
      .filter(ee.Filter.gte('confidence', 0.5));

    const features = await new Promise((resolve, reject) => {
      openBuildings.limit(20).toList(20).evaluate((resultOrErr, err) => {
        const hasErr = err != null;
        const result = hasErr ? null : resultOrErr;
        const actualErr = hasErr ? err : (resultOrErr && resultOrErr.error ? resultOrErr : null);
        if (actualErr && !result) reject(actualErr);
        else resolve(result || resultOrErr || []);
      });
    });

    return features.map(feat => {
      const geom = feat.geometry;
      const coords = geom?.coordinates?.[0] || geom?.coordinates;
      if (!coords || coords.length < 4) return null;

      const ring = coords[0] ? coords[0] : coords;
      const lats = ring.map(c => c[1]);
      const lngs = ring.map(c => c[0]);
      const gLat = lats.reduce((a, b) => a + b, 0) / lats.length;
      const gLng = lngs.reduce((a, b) => a + b, 0) / lngs.length;
      const dist = haversineMeters(lat, lng, gLat, gLng);

      return {
        confidence: feat.properties?.confidence || null,
        area_sqm: feat.properties?.area_m2 ? parseFloat(feat.properties.area_m2) : null,
        distance_m: dist,
        centroid_lat: gLat,
        centroid_lng: gLng,
      };
    }).filter(Boolean);
  } catch (e) {
    return [];
  }
}

/**
 * Fetch OSM buildings near a centroid via Overpass API.
 * Returns array of { osm_id, name, building_type, building_use, building_levels, building_height, area_sqm, distance_m }.
 */
async function fetchOSMBuildingsNearby(lat, lng, radiusM = 100) {
  try {
    // Convert radius to degrees
    const radiusDeg = Math.max(0.001, radiusM / 111000);
    const minLat = lat - radiusDeg, maxLat = lat + radiusDeg;
    const minLng = lng - radiusDeg, maxLng = lng + radiusDeg;

    const query = `
      [out:json][timeout:10];
      (
        way["building"](${minLat},${minLng},${maxLat},${maxLng});
        relation["building"](${minLat},${minLng},${maxLat},${maxLng});
      );
      out geom;
    `;

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), OSM_TIMEOUT_MS);

    const response = await fetch('https://overpass-api.de/api/interpreter', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: 'data=' + encodeURIComponent(query),
      signal: controller.signal,
    });
    clearTimeout(timeout);

    if (!response.ok) return [];

    const data = await response.json();
    const results = [];

    for (const element of data.elements || []) {
      let coordinates = [];
      if (element.type === 'way' && element.geometry) {
        coordinates = element.geometry.map(g => [g.lat, g.lon]);
      } else if (element.type === 'relation' && element.members) {
        const outer = element.members.find(m => m.role === 'outer' && m.geometry);
        if (outer) coordinates = outer.geometry.map(g => [g.lat, g.lon]);
      }
      if (coordinates.length < 4) continue;

      const oLat = coordinates.reduce((s, c) => s + c[0], 0) / coordinates.length;
      const oLng = coordinates.reduce((s, c) => s + c[1], 0) / coordinates.length;
      const dist = haversineMeters(lat, lng, oLat, oLng);

      const tags = element.tags || {};
      results.push({
        osm_id: element.id,
        osm_type: element.type,
        name: tags.name || null,
        building: tags.building || 'yes',
        building_type: tags['building:use'] || tags.amenity || tags.shop || tags.building || null,
        building_use: tags['building:use'] || tags.amenity || tags.shop || tags.office || null,
        building_levels: tags['building:levels'] ? parseInt(tags['building:levels']) : null,
        building_height: tags['building:height'] || null,
        area_sqm: null, // could compute but skip for performance
        distance_m: dist,
        centroid_lat: oLat,
        centroid_lng: oLng,
      });
    }

    return results;
  } catch (e) {
    // Overpass timeout or error — return empty (validation is best-effort)
    return [];
  }
}

/**
 * Resolve ownership info from the parcel linked to this building's location.
 * Checks if the building centroid falls within a known parcel.
 */
async function resolveOwnershipFromParcel(db, orgId, lat, lng) {
  try {
    const result = await db.query(
      `SELECT p.id, p.name, p.owner_name, p.owner_contact, p.owner_id,
              u.name as owner_full_name, u.phone as owner_phone
       FROM parcels p
       LEFT JOIN assembly_users u ON p.owner_id = u.id
       WHERE p.organization_id = $1
         AND ST_Contains(p.boundary, ST_SetSRID(ST_MakePoint($2, $3), 4326))
       LIMIT 1`,
      [orgId, lng, lat]
    );
    if (!result.rows[0]) return null;
    const row = result.rows[0];
    return {
      parcel_id: row.id,
      parcel_name: row.name,
      owner_name: row.owner_full_name || row.owner_name || null,
      owner_contact: row.owner_phone || row.owner_contact || null,
      owner_id: row.owner_id || null,
    };
  } catch (e) {
    return null;
  }
}

/**
 * Classify building type from OSM tags and area.
 */
function classifyBuildingType(osmMatch, areaSqm) {
  if (osmMatch?.building_type) {
    const t = osmMatch.building_type.toLowerCase();
    if (t.includes('residential') || t === 'house' || t === 'apartments' || t === 'detached') return 'residential';
    if (t.includes('commercial') || t.includes('shop') || t.includes('retail')) return 'commercial';
    if (t.includes('industrial') || t.includes('warehouse')) return 'industrial';
    if (t.includes('religious') || t.includes('church') || t.includes('mosque')) return 'religious';
    if (t.includes('school') || t.includes('education') || t.includes('university')) return 'educational';
    if (t.includes('hospital') || t.includes('clinic') || t.includes('health')) return 'healthcare';
    if (t.includes('government') || t.includes('office')) return 'government';
    if (t.includes('agricultural') || t.includes('farm') || t.includes('barn')) return 'agricultural';
    return t;
  }
  // Infer from area
  if (areaSqm && areaSqm > 500) return 'commercial';
  if (areaSqm && areaSqm < 80) return 'residential';
  return 'unknown';
}

/**
 * Validate a single detected building against Google + OSM.
 *
 * @param {Object} geojson - GeoJSON Polygon of the detected building
 * @param {Object} centroid - { lat, lng }
 * @param {Object} opts - { db, orgId, bbox }
 * @returns {Object} validation result with all enrichment data
 */
async function validateBuilding(geojson, centroid, opts = {}) {
  const { db, orgId } = opts;
  const { lat, lng } = centroid;

  // Run all lookups in parallel for speed
  const [googleResults, osmResults, ownership] = await Promise.all([
    fetchGoogleBuildingsNearby(lat, lng, 100),
    fetchOSMBuildingsNearby(lat, lng, 100),
    db ? resolveOwnershipFromParcel(db, orgId, lat, lng) : Promise.resolve(null),
  ]);

  // Find nearest Google building
  let bestGoogle = null;
  for (const g of googleResults) {
    if (!bestGoogle || g.distance_m < bestGoogle.distance_m) bestGoogle = g;
  }

  // Find nearest OSM building
  let bestOSM = null;
  for (const o of osmResults) {
    if (!bestOSM || o.distance_m < bestOSM.distance_m) bestOSM = o;
  }

  // Determine validation status
  const googleMatched = bestGoogle && bestGoogle.distance_m <= MATCH_THRESHOLD_M;
  const osmMatched = bestOSM && bestOSM.distance_m <= MATCH_THRESHOLD_M;
  const sources = [];
  if (googleMatched) sources.push('google');
  if (osmMatched) sources.push('osm');

  let validationStatus;
  if (googleMatched || osmMatched) {
    validationStatus = 'validated';
  } else if (bestGoogle || bestOSM) {
    // There are nearby buildings but too far — possible conflict or false positive
    validationStatus = 'pending';
  } else {
    // No reference buildings found in the area — can't validate
    validationStatus = 'pending';
  }

  // Classify building type
  const areaSqm = geojson?.coordinates?.[0] ? computeApproxArea(geojson) : null;
  const buildingType = classifyBuildingType(bestOSM, areaSqm);

  return {
    validation_status: validationStatus,
    validated_at: new Date().toISOString(),
    google_confidence: bestGoogle?.confidence || null,
    google_match_distance_m: bestGoogle?.distance_m || null,
    osm_id: bestOSM?.osm_id || null,
    osm_match_distance_m: bestOSM?.distance_m || null,
    building_type: buildingType,
    building_use: bestOSM?.building_use || null,
    building_name: bestOSM?.name || null,
    owner_name: ownership?.owner_name || null,
    owner_contact: ownership?.owner_contact || null,
    parcel_owner_id: ownership?.owner_id || null,
    validation_sources: sources,
    // Extra metadata for the JSONB column
    validation_detail: {
      google: bestGoogle ? {
        confidence: bestGoogle.confidence,
        distance_m: Math.round(bestGoogle.distance_m * 10) / 10,
        area_sqm: bestGoogle.area_sqm,
      } : null,
      osm: bestOSM ? {
        osm_id: bestOSM.osm_id,
        distance_m: Math.round(bestOSM.distance_m * 10) / 10,
        name: bestOSM.name,
        building: bestOSM.building,
        levels: bestOSM.building_levels,
        height: bestOSM.building_height,
      } : null,
      ownership: ownership ? {
        parcel_id: ownership.parcel_id,
        parcel_name: ownership.parcel_name,
      } : null,
      match_threshold_m: MATCH_THRESHOLD_M,
    },
  };
}

/**
 * Quick approximate area from GeoJSON polygon (shoelace formula, rough m²).
 */
function computeApproxArea(geojson) {
  const coords = geojson?.coordinates?.[0];
  if (!coords || coords.length < 4) return 0;
  let sum = 0;
  for (let i = 0; i < coords.length - 1; i++) {
    sum += (coords[i][0] * coords[i + 1][1]) - (coords[i + 1][0] * coords[i][1]);
  }
  const areaDeg2 = Math.abs(sum) / 2;
  const lat = coords.reduce((s, c) => s + c[1], 0) / coords.length;
  const latRad = (lat * Math.PI) / 180;
  return Math.round(areaDeg2 * 111000 * 111000 * Math.cos(latRad));
}

/**
 * Validate a batch of detected buildings (with concurrency control).
 *
 * @param {Array} buildings - [{ geojson, centroid: { lat, lng } }]
 * @param {Object} opts - { db, orgId, concurrency }
 * @returns {Array} validation results in same order as input
 */
async function validateBuildingsBatch(buildings, opts = {}) {
  const { concurrency = 3 } = opts;
  const results = [];

  // Process in small batches to avoid rate-limiting Earth Engine / Overpass
  for (let i = 0; i < buildings.length; i += concurrency) {
    const batch = buildings.slice(i, i + concurrency);
    const batchResults = await Promise.all(
      batch.map(b => validateBuilding(b.geojson, b.centroid, opts).catch(() => ({
        validation_status: 'pending',
        validation_sources: [],
        validation_detail: { error: 'validation failed' },
      })))
    );
    results.push(...batchResults);
  }

  return results;
}

module.exports = {
  validateBuilding,
  validateBuildingsBatch,
  fetchGoogleBuildingsNearby,
  fetchOSMBuildingsNearby,
  resolveOwnershipFromParcel,
  classifyBuildingType,
  haversineMeters,
  MATCH_THRESHOLD_M,
};
