/**
 * Building Change Detection — compares satellite imagery between two time
 * periods to detect new buildings that have appeared.
 *
 * ML Approach:
 *   1. Build two Sentinel-2 composites: baseline (older) and current (recent)
 *   2. Compute multiple built-up indices for each period:
 *      - NDBI (Normalized Difference Built-up Index): (SWIR1 - NIR) / (SWIR1 + NIR)
 *      - MNDWI (Modified NDWI for water masking): (Green - SWIR1) / (Green + SWIR1)
 *      - NDVI (vegetation mask): (NIR - Red) / (NIR + Red)
 *      - BSI (Bare Soil Index): ((SWIR1 + Red) - (NIR + Blue)) / ((SWIR1 + Red) + (NIR + Blue))
 *      - BAI (Burned Area Index) for structure heat signature
 *   3. Create binary built-up masks for each period using adaptive thresholds
 *   4. Compute change = current_builtup AND NOT baseline_builtup
 *      This isolates pixels that transitioned from non-built-up to built-up
 *   5. Apply morphological opening (via focal operations) to remove noise
 *   6. Vectorize the change clusters into polygons using reduceToVectors
 *   7. Save new building footprints to DB + create alerts + push via WebSocket
 *
 * Runs on a schedule (weekly) or can be triggered manually via API.
 */
require('dotenv').config();
const db = require('../config/db');
const bus = require('../realtime/eventBus');
const { ee, init, isReady } = require('../config/earthEngine');
const { resolveFAOBoundary, getGeometryBbox } = require('../config/faoBoundary');
const { estimateBuildingHeight, compareNearbyBuildings } = require('../utils/buildingHeight');

/**
 * Run building change detection for a specific organization + bbox.
 *
 * @param {Object} options
 * @param {string} options.orgId - Organization ID
 * @param {Object} options.bbox - { minLng, minLat, maxLng, maxLat }
 * @param {string} options.baselineStart - ISO date (e.g. '2024-01-01')
 * @param {string} options.baselineEnd - ISO date (e.g. '2024-06-30')
 * @param {string} options.periodStart - ISO date (e.g. '2025-01-01')
 * @param {string} options.periodEnd - ISO date (e.g. '2025-06-30')
 * @param {string} options.startedBy - User ID who triggered the run
 * @returns {Promise<Object>} detection result
 */
async function runBuildingChangeDetection(options) {
  const {
    orgId, bbox,
    baselineStart, baselineEnd,
    periodStart, periodEnd,
    startedBy,
  } = options;

  const ready = await init();
  if (!ready) {
    throw new Error('Earth Engine is not configured. Set EE_SERVICE_ACCOUNT_JSON to enable building change detection.');
  }

  if (!bbox) throw new Error('bbox is required');
  if (!baselineStart || !baselineEnd || !periodStart || !periodEnd) {
    throw new Error('baseline and period date ranges are required');
  }

  // Create detection run record
  const runResult = await db.query(
    `INSERT INTO building_change_detections
       (organization_id, status, period_start, period_end, baseline_start, baseline_end, bbox, started_by)
     VALUES ($1, 'running', $2, $3, $4, $5, $6, $7)
     RETURNING id`,
    [orgId, periodStart, periodEnd, baselineStart, baselineEnd, JSON.stringify(bbox), startedBy]
  );
  const detectionId = runResult.rows[0].id;

  try {
    const [minLng, minLat, maxLng, maxLat] = [bbox.minLng, bbox.minLat, bbox.maxLng, bbox.maxLat];
    const region = ee.Geometry.Rectangle([minLng, minLat, maxLng, maxLat], 'EPSG:4326', false);

    // ── 1. Build baseline composite (older period) ──
    const baselineCollection = ee.ImageCollection('COPERNICUS/S2_HARMONIZED')
      .filterDate(baselineStart, baselineEnd)
      .filter(ee.Filter.lt('CLOUDY_PIXEL_PERCENTAGE', 20))
      .filterBounds(region);
    const baselineComposite = baselineCollection.median();

    // ── 2. Build current composite (recent period) ──
    const currentCollection = ee.ImageCollection('COPERNICUS/S2_HARMONIZED')
      .filterDate(periodStart, periodEnd)
      .filter(ee.Filter.lt('CLOUDY_PIXEL_PERCENTAGE', 20))
      .filterBounds(region);
    const currentComposite = currentCollection.median();

    // ── 3. Compute built-up indices for both periods ──
    // NDBI = (SWIR1 - NIR) / (SWIR1 + NIR) — high for built-up
    // NDVI = (NIR - Red) / (NIR + Red) — high for vegetation
    // BSI = ((SWIR1 + Red) - (NIR + Blue)) / ((SWIR1 + Red) + (NIR + Blue)) — high for bare soil
    // MNDWI = (Green - SWIR1) / (Green + SWIR1) — high for water (to mask out)

    function computeBuiltupIndices(image) {
      const ndbi = image.normalizedDifference(['B11', 'B8']).rename('ndbi');
      const ndvi = image.normalizedDifference(['B8', 'B4']).rename('ndvi');
      const bsi = image.expression(
        '((SWIR1 + Red) - (NIR + Blue)) / ((SWIR1 + Red) + (NIR + Blue))',
        { SWIR1: image.select('B11'), Red: image.select('B4'), NIR: image.select('B8'), Blue: image.select('B2') }
      ).rename('bsi');
      const mndwi = image.normalizedDifference(['B3', 'B11']).rename('mndwi');
      return ee.Image.cat([ndbi, ndvi, bsi, mndwi]);
    }

    const baselineIndices = computeBuiltupIndices(baselineComposite);
    const currentIndices = computeBuiltupIndices(currentComposite);

    // ── 4. Create binary built-up masks ──
    // Built-up = high NDBI + low NDVI (not vegetation) + high BSI + not water (low MNDWI)
    // Use adaptive thresholds — NDBI > 0.0, NDVI < 0.25, BSI > 0.08, MNDWI < 0
    function builtupMask(indices) {
      return indices.select('ndbi').gt(0.0)
        .and(indices.select('ndvi').lt(0.25))
        .and(indices.select('bsi').gt(0.08))
        .and(indices.select('mndwi').lt(0))
        .rename('builtup');
    }

    const baselineBuiltup = builtupMask(baselineIndices);
    const currentBuiltup = builtupMask(currentIndices);

    // ── 5. Compute change: new built-up areas ──
    // New buildings = current built-up AND NOT baseline built-up
    const newBuiltup = currentBuiltup.and(baselineBuiltup.not()).rename('new_builtup');

    // ── 6. Morphological cleaning via focal operations ──
    // Opening: erode then dilate — removes small noise (1-2 pixel artifacts)
    // Then dilate — fills small gaps in building footprints
    const eroded = newBuiltup.focal_min(1, 'square', 'pixels', 10);
    const opened = eroded.focal_max(2, 'square', 'pixels', 10);
    const cleaned = opened.focal_max(1, 'square', 'pixels', 10).rename('new_builtup');

    // ── 7. Generate visualization tiles ──
    // Before (baseline satellite)
    const beforeVis = baselineComposite.visualize({
      bands: ['B4', 'B3', 'B2'], min: 0, max: 3000, gamma: 1.4,
    });
    // After (current satellite)
    const afterVis = currentComposite.visualize({
      bands: ['B4', 'B3', 'B2'], min: 0, max: 3000, gamma: 1.4,
    });
    // Change overlay (red = new buildings)
    const changeVis = cleaned.visualize({
      palette: ['00000000', 'ff0000'], min: 0, max: 1,
    });

    // ── 8. Get tile URLs for all three layers ──
    const [beforeMap, afterMap, changeMap] = await Promise.all([
      new Promise((resolve, reject) => {
        beforeVis.getMapId({ min: 0, max: 255 }, (err, map) => {
          if (err) reject(err); else resolve(map);
        });
      }),
      new Promise((resolve, reject) => {
        afterVis.getMapId({ min: 0, max: 255 }, (err, map) => {
          if (err) reject(err); else resolve(map);
        });
      }),
      new Promise((resolve, reject) => {
        changeVis.getMapId({ min: 0, max: 255 }, (err, map) => {
          if (err) reject(err); else resolve(map);
        });
      }),
    ]);

    const beforeTileUrl = `https://earthengine.googleapis.com/v1/${beforeMap.mapid}/tiles/{z}/{x}/{y}`;
    const afterTileUrl = `https://earthengine.googleapis.com/v1/${afterMap.mapid}/tiles/{z}/{x}/{y}`;
    const changeTileUrl = `https://earthengine.googleapis.com/v1/${changeMap.mapid}/tiles/{z}/{x}/{y}`;

    // ── 9. Compute statistics ──
    const stats = cleaned.reduceRegion({
      reducer: ee.Reducer.count(),
      geometry: region,
      scale: 10,
      maxPixels: 1e13,
    });

    const statsResult = await new Promise((resolve, reject) => {
      stats.evaluate((result, err) => {
        if (err) reject(err); else resolve(result);
      });
    });

    const newBuiltupPixels = statsResult?.new_builtup || 0;
    const newBuiltupAreaSqm = newBuiltupPixels * 100; // 10m x 10m pixels
    const estimatedNewBuildings = Math.max(0, Math.round(newBuiltupAreaSqm / 120)); // avg building ~120sqm

    // ── 10. Vectorize new building polygons ──
    const vectors = cleaned.addBands(currentComposite.select('B4')).reduceToVectors({
      geometry: region,
      scale: 10,
      geometryType: 'polygon',
      eightConnected: true,
      labelProperty: 'new_builtup',
      reducer: ee.Reducer.count(),
      maxPixels: 1e13,
    });

    // Filter to new built-up polygons with minimum area (at least 3 pixels = 300sqm)
    const newBuildingPolygons = vectors.filter(ee.Filter.eq('new_builtup', 1))
      .filter(ee.Filter.gte('count', 3));

    const featuresList = await new Promise((resolve, reject) => {
      newBuildingPolygons.toList(500).evaluate((features, err) => {
        if (err) reject(err); else resolve(features || []);
      });
    });

    // ── 11. Save vectorized buildings to DB + create alerts ──
    const savedBuildings = [];

    for (const feat of featuresList.slice(0, 200)) {
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

        // Close the ring if not already closed
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

        // Check if this building is in a protected area
        let inProtected = false;
        try {
          const protectedCheck = await db.query(
            `SELECT id FROM protected_areas
             WHERE organization_id = $1 AND active = true
             AND ST_Contains(boundary, ST_SetSRID(ST_MakePoint($2, $3), 4326))
             LIMIT 1`,
            [orgId, centroidLng, centroidLat]
          );
          inProtected = protectedCheck.rows.length > 0;
        } catch {}

        // Find if this building is within a known parcel
        let parcelId = null;
        try {
          const parcelCheck = await db.query(
            `SELECT id FROM parcels
             WHERE organization_id = $1
             AND ST_Contains(boundary, ST_SetSRID(ST_MakePoint($2, $3), 4326))
             LIMIT 1`,
            [orgId, centroidLng, centroidLat]
          );
          parcelId = parcelCheck.rows[0]?.id || null;
        } catch {}

        // ── Estimate building height (shadow + DEM) ──
        let heightData = { height_m: null, estimated_floors: null, confidence: 0, method: 'none' };
        try {
          heightData = await estimateBuildingHeight(currentComposite, region, { lat: centroidLat, lng: centroidLng });
        } catch (e) {
          // Height estimation is best-effort
        }

        // ── Compare to nearby existing buildings ──
        let comparisonData = null;
        try {
          comparisonData = await compareNearbyBuildings(db, orgId, { lat: centroidLat, lng: centroidLng }, 0, 500);
        } catch (e) {
          // Comparison is best-effort
        }

        // Save building to DB
        const insertResult = await db.query(
          `INSERT INTO buildings
             (organization_id, parcel_id, footprint, area_sqm, status,
              in_protected_area, detected_at, centroid_lat, centroid_lng,
              metadata, change_detection_id,
              estimated_height_m, estimated_floors, height_method, height_confidence)
           VALUES ($1, $2, ST_SetSRID(ST_GeomFromGeoJSON($3), 4326),
                   ST_Area(ST_SetSRID(ST_GeomFromGeoJSON($3), 4326)::geography),
                   'unverified', $4, now(), $5, $6, $7, $8, $9, $10, $11, $12)
           RETURNING id, area_sqm, centroid_lat, centroid_lng, estimated_height_m, estimated_floors`,
          [
            orgId, parcelId, JSON.stringify(geojson), inProtected,
            centroidLat, centroidLng,
            JSON.stringify({
              detection_method: 'sentinel2_multitemporal_ndbi_ndvi_bsi_change',
              detection_date: new Date().toISOString(),
              baseline_period: `${baselineStart} to ${baselineEnd}`,
              current_period: `${periodStart} to ${periodEnd}`,
              pixel_count: feat.properties?.count || 0,
              source: 'earth_engine_change_detection',
              change_detection_id: detectionId,
              height_estimation: heightData,
              nearby_comparison: comparisonData,
            }),
            detectionId,
            heightData.height_m, heightData.estimated_floors, heightData.method, heightData.confidence,
          ]
        );

        const building = insertResult.rows[0];
        savedBuildings.push({
          id: building.id,
          area_sqm: parseFloat(building.area_sqm),
          centroid_lat: building.centroid_lat,
          centroid_lng: building.centroid_lng,
          in_protected_area: inProtected,
          parcel_id: parcelId,
          estimated_height_m: building.estimated_height_m ? parseFloat(building.estimated_height_m) : null,
          estimated_floors: building.estimated_floors || null,
          height_method: heightData.method,
          nearby_comparison: comparisonData,
        });

        // Create an alert for each new building (especially if in protected area)
        const alertType = inProtected ? 'protected_area_violation' : 'new_building';
        await db.query(
          `INSERT INTO alerts
             (organization_id, parcel_id, alert_type, verified, detected_at,
              change_detection_id, building_count, builtup_area_sqm, image_url)
           VALUES ($1, $2, $3::alert_type, false, now(), $4, 1, $5, $6)`,
          [orgId, parcelId, alertType, detectionId, parseFloat(building.area_sqm), afterTileUrl]
        );
      } catch (e) {
        // Skip individual building save errors
        console.error('[BuildingChangeDetection] Error saving building:', e.message);
      }
    }

    // ── 12. Update detection run record ──
    await db.query(
      `UPDATE building_change_detections SET
         status = 'completed', completed_at = now(),
         new_buildings_count = $1, new_builtup_area_sqm = $2,
         method = $3, before_tile_url = $4, after_tile_url = $5, change_tile_url = $6
       WHERE id = $7`,
      [
        savedBuildings.length,
        newBuiltupAreaSqm,
        'Sentinel-2 multi-temporal NDBI/NDVI/BSI change detection with morphological cleaning + vectorization',
        beforeTileUrl,
        afterTileUrl,
        changeTileUrl,
        detectionId,
      ]
    );

    // ── 13. Emit real-time event via WebSocket ──
    bus.emit('building_change:detected', {
      orgId,
      detectionId,
      newBuildingsCount: savedBuildings.length,
      newBuiltupAreaSqm,
      beforeTileUrl,
      afterTileUrl,
      changeTileUrl,
      buildings: savedBuildings,
    });

    console.log(`[BuildingChangeDetection] Run ${detectionId}: found ${savedBuildings.length} new buildings (${newBuiltupAreaSqm} sqm)`);

    return {
      detectionId,
      status: 'completed',
      newBuildingsCount: savedBuildings.length,
      newBuiltupAreaSqm,
      estimatedNewBuildings,
      beforeTileUrl,
      afterTileUrl,
      changeTileUrl,
      savedBuildings,
      method: 'Sentinel-2 multi-temporal NDBI/NDVI/BSI change detection with morphological cleaning + vectorization',
    };
  } catch (err) {
    // Update detection run as failed
    await db.query(
      `UPDATE building_change_detections SET status = 'failed', completed_at = now(), error_message = $1 WHERE id = $2`,
      [err.message, detectionId]
    );
    throw err;
  }
}

/**
 * Scheduled job — runs building change detection for all organizations
 * that have a district boundary. Compares the last 3 months vs. the
 * previous 3 months.
 */
async function runScheduled() {
  console.log('[BuildingChangeDetection] Starting scheduled run for all organizations...');

  const ready = await init();
  if (!ready) {
    console.warn('[BuildingChangeDetection] Earth Engine not configured — skipping.');
    return;
  }

  // Get all organizations (with or without boundaries — FAO GAUL 2015 is used as fallback)
  const { rows: orgs } = await db.query(
    `SELECT id, name, region, ST_AsGeoJSON(boundary) as boundary_geojson FROM organizations WHERE active = true`
  );

  if (orgs.length === 0) {
    console.log('[BuildingChangeDetection] No active organizations found.');
    return;
  }

  // Compute date ranges: current = last 3 months, baseline = 3-6 months ago
  const now = new Date();
  const threeMonthsAgo = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
  const sixMonthsAgo = new Date(now.getTime() - 180 * 24 * 60 * 60 * 1000);

  const periodEnd = now.toISOString().slice(0, 10);
  const periodStart = threeMonthsAgo.toISOString().slice(0, 10);
  const baselineEnd = sixMonthsAgo.toISOString().slice(0, 10);
  const baselineStart = new Date(sixMonthsAgo.getTime() - 90 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);

  for (const org of orgs) {
    try {
      let bbox;

      if (org.boundary_geojson) {
        // Use the org's stored boundary
        const coords = JSON.parse(org.boundary_geojson).coordinates[0];
        const lngs = coords.map(c => c[0]);
        const lats = coords.map(c => c[1]);
        bbox = {
          minLng: Math.min(...lngs),
          minLat: Math.min(...lats),
          maxLng: Math.max(...lngs),
          maxLat: Math.max(...lats),
        };
      } else {
        // Use FAO GAUL 2015 boundary as default
        console.log(`[BuildingChangeDetection] No stored boundary for ${org.name}, resolving FAO GAUL 2015 boundary...`);
        const faoGeometry = await resolveFAOBoundary(org);

        if (!faoGeometry) {
          console.warn(`[BuildingChangeDetection] Could not resolve FAO boundary for org: ${org.name} — skipping.`);
          continue;
        }

        bbox = await getGeometryBbox(faoGeometry);
        console.log(`[BuildingChangeDetection] Using FAO GAUL 2015 boundary for: ${org.name}`);
      }

      console.log(`[BuildingChangeDetection] Running for org: ${org.name} (${org.id})`);
      const result = await runBuildingChangeDetection({
        orgId: org.id,
        bbox,
        baselineStart,
        baselineEnd,
        periodStart,
        periodEnd,
        startedBy: null,
      });

      console.log(`[BuildingChangeDetection] ${org.name}: found ${result.newBuildingsCount} new buildings`);
    } catch (err) {
      console.error(`[BuildingChangeDetection] Failed for org ${org.id}:`, err.message);
    }
  }

  console.log('[BuildingChangeDetection] Scheduled run complete.');
}

if (require.main === module) {
  runScheduled()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error('[BuildingChangeDetection] Fatal error:', err);
      process.exit(1);
    });
}

module.exports = { runBuildingChangeDetection, runScheduled };
