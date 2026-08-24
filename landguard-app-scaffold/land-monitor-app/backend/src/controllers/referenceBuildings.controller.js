/**
 * Reference Buildings Controller
 *
 * Provides access to authoritative building footprint datasets for overlay
 * comparison with our Sentinel-2-based building detection:
 *
 *   1. Google Open Buildings (via Earth Engine)
 *      - Dataset: GOOGLE/Research/open-buildings-temporal/v1
 *      - ~1.8B building footprints globally with confidence scores
 *      - Temporal version includes detection dates (2016, 2018, 2020, 2022+)
 *      - Very high accuracy for building footprints
 *
 *   2. OpenStreetMap buildings (via Overpass API)
 *      - Community-mapped building footprints
 *      - Accuracy varies by region (better in urban areas)
 *      - Includes building attributes (name, levels, type)
 *
 * Both layers can be overlaid on the map alongside our detected buildings
 * for accuracy assessment and gap analysis.
 */
const db = require('../config/db');
const { ee, init: initEE } = require('../config/earthEngine');

function getOrgId(req) {
  return req.user.organizationId || req.user.organization_id;
}

// ═══════════════════════════════════════════════════════════
// GOOGLE OPEN BUILDINGS (via Earth Engine)
// ═══════════════════════════════════════════════════════════

// GET /assembly/planning/google-buildings?bbox=minLng,minLat,maxLng,maxLat
// Returns Google Open Buildings as GeoJSON within the bbox
exports.getGoogleBuildings = async (req, res, next) => {
  try {
    const { bbox } = req.query;

    if (!bbox) {
      return res.status(400).json({ error: 'bbox query parameter is required (format: minLng,minLat,maxLng,maxLat)' });
    }

    const [minLng, minLat, maxLng, maxLat] = bbox.split(',').map(parseFloat);
    if ([minLng, minLat, maxLng, maxLat].some(isNaN)) {
      return res.status(400).json({ error: 'Invalid bbox format' });
    }

    const ready = await initEE();
    if (!ready) {
      return res.status(503).json({
        error: 'Earth Engine is not configured. Set EE_SERVICE_ACCOUNT_JSON to enable Google Open Buildings.',
      });
    }

    const region = ee.Geometry.Rectangle([minLng, minLat, maxLng, maxLat], 'EPSG:4326', false);

    // Google Open Buildings temporal v1 — includes building footprints with dates
    // Each feature has: geometry (Polygon), confidence (0-1), presence (year flags), area_m2
    const openBuildings = ee.FeatureCollection('GOOGLE/Research/open-buildings-temporal/v1');

    // Filter to bbox + confidence > 0.6 (high confidence footprints)
    const buildingsInArea = openBuildings
      .filterBounds(region)
      .filter(ee.Filter.gte('confidence', 0.6));

    // Get count first to avoid downloading too many features
    const countInfo = await new Promise((resolve, reject) => {
      buildingsInArea.size().evaluate((resultOrErr, err) => {
        const hasErr = err != null;
        const result = hasErr ? null : resultOrErr;
        const actualErr = hasErr ? err : (resultOrErr && resultOrErr.error ? resultOrErr : null);
        if (actualErr && !result) reject(actualErr);
        else resolve(result || resultOrErr);
      });
    });

    const totalCount = countInfo || 0;

    // Cap at 2000 buildings for performance
    const maxBuildings = 2000;
    const limited = buildingsInArea.limit(maxBuildings);

    // Get the features as a list
    const featuresList = await new Promise((resolve, reject) => {
      limited.toList(maxBuildings).evaluate((resultOrErr, err) => {
        const hasErr = err != null;
        const result = hasErr ? null : resultOrErr;
        const actualErr = hasErr ? err : (resultOrErr && resultOrErr.error ? resultOrErr : null);
        if (actualErr && !result) reject(actualErr);
        else resolve(result || resultOrErr || []);
      });
    });

    // Convert to GeoJSON FeatureCollection
    const features = [];
    for (const feat of featuresList) {
      try {
        const geom = feat.geometry;
        const coords = geom?.coordinates;

        if (!coords || !coords[0] || coords[0].length < 4) continue;

        // Build GeoJSON Polygon
        const ring = coords[0] ? coords[0] : coords;
        const geojson = {
          type: 'Polygon',
          coordinates: [ring.map(c => [c[0], c[1]])],
        };

        // Close ring if needed
        const ringCoords = geojson.coordinates[0];
        if (ringCoords.length > 0) {
          const first = ringCoords[0];
          const last = ringCoords[ringCoords.length - 1];
          if (first[0] !== last[0] || first[1] !== last[1]) {
            ringCoords.push([first[0], first[1]]);
          }
        }

        // Compute centroid
        const lats = ringCoords.map(c => c[1]);
        const lngs = ringCoords.map(c => c[0]);
        const centroidLat = lats.reduce((a, b) => a + b, 0) / lats.length;
        const centroidLng = lngs.reduce((a, b) => a + b, 0) / lngs.length;

        // Compute approximate area
        const areaSqm = feat.properties?.area_m2 || feat.properties?.area_meters || null;

        features.push({
          type: 'Feature',
          geometry: geojson,
          properties: {
            source: 'google_open_buildings',
            confidence: feat.properties?.confidence || null,
            area_sqm: areaSqm ? parseFloat(areaSqm) : null,
            centroid_lat: centroidLat,
            centroid_lng: centroidLng,
            presence: feat.properties?.presence || null,
            // The temporal dataset has flags like S2_2016, S2_2018, S2_2020, S2_2022
            // indicating when the building was detected
          },
        });
      } catch (e) {
        // Skip individual feature errors
      }
    }

    res.json({
      type: 'FeatureCollection',
      features,
      total_in_area: totalCount,
      returned: features.length,
      capped: totalCount > maxBuildings,
      source: 'Google Open Buildings Temporal v1 (via Earth Engine)',
      attribution: 'Google Open Buildings &copy; Google Research',
    });
  } catch (err) {
    console.error('Google Open Buildings error:', err.message);
    res.status(500).json({ error: 'Failed to fetch Google Open Buildings: ' + err.message });
  }
};

// ═══════════════════════════════════════════════════════════
// OPENSTREETMAP BUILDINGS (via Overpass API)
// ═══════════════════════════════════════════════════════════

// GET /assembly/planning/osm-buildings?bbox=minLng,minLat,maxLng,maxLat
// Returns OSM building footprints as GeoJSON within the bbox
exports.getOSMBuildings = async (req, res, next) => {
  try {
    const { bbox } = req.query;

    if (!bbox) {
      return res.status(400).json({ error: 'bbox query parameter is required (format: minLng,minLat,maxLng,maxLat)' });
    }

    const [minLng, minLat, maxLng, maxLat] = bbox.split(',').map(parseFloat);
    if ([minLng, minLat, maxLng, maxLat].some(isNaN)) {
      return res.status(400).json({ error: 'Invalid bbox format' });
    }

    // Limit the bbox size to prevent excessive queries (max ~0.5° ~ 55km)
    const bboxArea = (maxLng - minLng) * (maxLat - minLat);
    if (bboxArea > 0.25) {
      return res.status(400).json({
        error: 'bbox area too large. Maximum 0.25 square degrees (~55km x 55km). Zoom in to a smaller area.',
      });
    }

    // Query Overpass API for buildings in the bbox
    // Overpass uses south,west,north,east (minLat,minLng,maxLat,maxLng) order
    const overpassQuery = `
      [out:json][timeout:25];
      (
        way["building"](${minLat},${minLng},${maxLat},${maxLng});
        relation["building"](${minLat},${minLng},${maxLat},${maxLng});
      );
      out geom;
    `;

    const overpassUrl = 'https://overpass-api.de/api/interpreter';

    const response = await fetch(overpassUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: 'data=' + encodeURIComponent(overpassQuery),
    });

    if (!response.ok) {
      throw new Error(`Overpass API returned ${response.status}: ${response.statusText}`);
    }

    const data = await response.json();

    // Convert OSM elements to GeoJSON features
    const features = [];

    for (const element of data.elements || []) {
      try {
        let coordinates = [];

        if (element.type === 'way' && element.geometry) {
          // Way with geometry array
          coordinates = element.geometry.map(g => [g.lon, g.lat]);
        } else if (element.type === 'relation' && element.members) {
          // Relation — take the outer member's geometry
          const outerMember = element.members.find(m => m.role === 'outer' && m.geometry);
          if (outerMember) {
            coordinates = outerMember.geometry.map(g => [g.lon, g.lat]);
          }
        }

        if (coordinates.length < 4) continue;

        // Close the ring
        const first = coordinates[0];
        const last = coordinates[coordinates.length - 1];
        if (first[0] !== last[0] || first[1] !== last[1]) {
          coordinates.push([first[0], first[1]]);
        }

        // Compute centroid
        const lats = coordinates.map(c => c[1]);
        const lngs = coordinates.map(c => c[0]);
        const centroidLat = lats.reduce((a, b) => a + b, 0) / lats.length;
        const centroidLng = lngs.reduce((a, b) => a + b, 0) / lngs.length;

        // Approximate area using shoelace formula (rough, in degrees² → convert to m²)
        let areaSqm = null;
        if (coordinates.length > 3) {
          let sum = 0;
          for (let i = 0; i < coordinates.length - 1; i++) {
            sum += (coordinates[i][0] * coordinates[i + 1][1]) - (coordinates[i + 1][0] * coordinates[i][1]);
          }
          const areaDeg2 = Math.abs(sum) / 2;
          // Convert degrees² to m² at this latitude (1° lat ≈ 111km, 1° lng ≈ 111km * cos(lat))
          const latRad = (centroidLat * Math.PI) / 180;
          areaSqm = areaDeg2 * 111000 * 111000 * Math.cos(latRad);
        }

        const tags = element.tags || {};

        features.push({
          type: 'Feature',
          geometry: {
            type: 'Polygon',
            coordinates: [coordinates],
          },
          properties: {
            source: 'openstreetmap',
            osm_id: element.id,
            osm_type: element.type,
            name: tags.name || null,
            building: tags.building || 'yes',
            building_levels: tags['building:levels'] ? parseInt(tags['building:levels']) : null,
            building_height: tags['building:height'] || null,
            building_type: tags['building:use'] || tags.amenity || tags.shop || null,
            area_sqm: Math.round(areaSqm) || null,
            centroid_lat: centroidLat,
            centroid_lng: centroidLng,
          },
        });
      } catch (e) {
        // Skip individual element errors
      }
    }

    res.json({
      type: 'FeatureCollection',
      features,
      total: features.length,
      source: 'OpenStreetMap (via Overpass API)',
      attribution: 'Buildings &copy; OpenStreetMap contributors, ODbL 1.0',
    });
  } catch (err) {
    console.error('OSM buildings error:', err.message);
    res.status(500).json({ error: 'Failed to fetch OSM buildings: ' + err.message });
  }
};

// ═══════════════════════════════════════════════════════════
// BUILDING COMPARISON ANALYSIS
// ═══════════════════════════════════════════════════════════

// POST /assembly/planning/buildings-comparison
// Body: { detected: FeatureCollection, google: FeatureCollection, osm: FeatureCollection }
// Returns comparison statistics between the three building datasets
exports.compareBuildingSources = async (req, res, next) => {
  try {
    const { detected, google, osm } = req.body;

    const detectedFeatures = detected?.features || [];
    const googleFeatures = google?.features || [];
    const osmFeatures = osm?.features || [];

    // Compute areas
    const detectedAreas = detectedFeatures.map(f => f.properties.area_sqm || 0).filter(a => a > 0);
    const googleAreas = googleFeatures.map(f => f.properties.area_sqm || 0).filter(a => a > 0);
    const osmAreas = osmFeatures.map(f => f.properties.area_sqm || 0).filter(a => a > 0);

    const stats = (areas) => {
      if (areas.length === 0) return { count: 0, total_area: 0, mean: 0, median: 0, min: 0, max: 0 };
      const sorted = [...areas].sort((a, b) => a - b);
      return {
        count: areas.length,
        total_area: Math.round(areas.reduce((a, b) => a + b, 0)),
        mean: Math.round(areas.reduce((a, b) => a + b, 0) / areas.length),
        median: Math.round(sorted[Math.floor(sorted.length / 2)]),
        min: Math.round(sorted[0]),
        max: Math.round(sorted[sorted.length - 1]),
      };
    };

    // Spatial overlap analysis: for each detected building, check if it overlaps
    // with a Google or OSM building (within 10m tolerance)
    // This is done client-side with Turf.js for performance, but we provide
    // the centroid-based quick comparison here

    // Quick centroid matching: for each detected building, find nearest Google + OSM building
    const matches = [];
    for (const det of detectedFeatures.slice(0, 100)) { // cap at 100 for performance
      const detLat = det.properties.centroid_lat;
      const detLng = det.properties.centroid_lng;
      if (detLat == null || detLng == null) continue;

      let nearestGoogle = null;
      let nearestGoogleDist = Infinity;
      for (const g of googleFeatures) {
        const gLat = g.properties.centroid_lat;
        const gLng = g.properties.centroid_lng;
        if (gLat == null || gLng == null) continue;
        const dist = Math.sqrt(Math.pow(detLat - gLat, 2) + Math.pow(detLng - gLng, 2)) * 111000; // rough meters
        if (dist < nearestGoogleDist) {
          nearestGoogleDist = dist;
          nearestGoogle = g;
        }
      }

      let nearestOSM = null;
      let nearestOSMDist = Infinity;
      for (const o of osmFeatures) {
        const oLat = o.properties.centroid_lat;
        const oLng = o.properties.centroid_lng;
        if (oLat == null || oLng == null) continue;
        const dist = Math.sqrt(Math.pow(detLat - oLat, 2) + Math.pow(detLng - oLng, 2)) * 111000;
        if (dist < nearestOSMDist) {
          nearestOSMDist = dist;
          nearestOSM = o;
        }
      }

      matches.push({
        detected_id: det.properties.id,
        detected_area: det.properties.area_sqm,
        google_match: nearestGoogle ? {
          distance_m: Math.round(nearestGoogleDist),
          confidence: nearestGoogle.properties.confidence,
          area_sqm: nearestGoogle.properties.area_sqm,
        } : null,
        osm_match: nearestOSM ? {
          distance_m: Math.round(nearestOSMDist),
          name: nearestOSM.properties.name,
          levels: nearestOSM.properties.building_levels,
          area_sqm: nearestOSM.properties.area_sqm,
        } : null,
      });
    }

    // Coverage analysis: how many detected buildings have a match within 15m?
    const matchedToGoogle = matches.filter(m => m.google_match && m.google_match.distance_m < 15).length;
    const matchedToOSM = matches.filter(m => m.osm_match && m.osm_match.distance_m < 15).length;

    res.json({
      summary: {
        detected: stats(detectedAreas),
        google: stats(googleAreas),
        osm: stats(osmAreas),
      },
      coverage: {
        detected_matched_to_google: matchedToGoogle,
        detected_matched_to_google_pct: matches.length > 0 ? Math.round((matchedToGoogle / matches.length) * 100) : 0,
        detected_matched_to_osm: matchedToOSM,
        detected_matched_to_osm_pct: matches.length > 0 ? Math.round((matchedToOSM / matches.length) * 100) : 0,
        google_only: googleFeatures.length - matchedToGoogle, // buildings in Google but not detected
        osm_only: osmFeatures.length - matchedToOSM, // buildings in OSM but not detected
        detected_only: matches.length - matchedToGoogle, // buildings detected but not in Google
      },
      matches: matches.slice(0, 50), // return top 50 matches for detailed view
      accuracy_assessment: {
        // If detected buildings match Google/OSM well, our detection is accurate
        // If we detect buildings not in Google/OSM, they may be new or false positives
        // If Google/OSM has buildings we didn't detect, we may have missed them
        detection_precision: matches.length > 0 ? Math.round((matchedToGoogle / matches.length) * 100) : null,
        note: 'Detection precision = % of detected buildings that match Google Open Buildings within 15m. Higher = fewer false positives.',
      },
    });
  } catch (err) {
    console.error('Building comparison error:', err.message);
    res.status(500).json({ error: 'Comparison failed: ' + err.message });
  }
};

module.exports = exports;
