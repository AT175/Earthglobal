/**
 * Building Height Estimation + Size Comparison Utilities
 *
 * Uses Google Earth Engine to estimate building height from:
 *   1. Shadow-based method: measure shadow length from Sentinel-2 + sun elevation angle
 *   2. DEM-based method: Copernicus DEM GLO-30 (nDSM = DSM - DTM) for large buildings
 *   3. Combined: prefer shadow method for tall buildings, DEM for large footprints
 *
 * Also provides size comparison to nearby existing buildings.
 */
const { ee } = require('../config/earthEngine');

/**
 * Estimate building height using shadow-based method.
 *
 * Approach:
 *   - Detect shadow pixels adjacent to built-up pixels (low reflectance in all bands)
 *   - Measure shadow length in the direction opposite to the sun azimuth
 *   - Height = shadow_length * tan(sun_elevation)
 *
 * Sentinel-2 metadata contains MEAN_SOLAR_ZENITH_ANGLE (degrees from zenith).
 * Elevation = 90 - zenith. Height = shadow_length_m * tan(elevation_rad)
 *
 * @param {ee.Image} s2Image - Sentinel-2 composite with metadata
 * @param {ee.Geometry} region - Area of interest
 * @param {Object} centroid - { lat, lng } of the building
 * @returns {Promise<{height_m: number, confidence: number, method: string}>}
 */
async function estimateHeightFromShadow(s2Image, region, centroid) {
  try {
    // Get sun angle from the first image in the collection metadata
    // Sentinel-2 provides MEAN_SOLAR_ZENITH_ANGLE as a property
    // For a composite (median), we use a representative value
    // Ghana is near the equator (~6°N), so solar zenith ranges ~10-40° depending on season/time
    // We use a conservative midday average: zenith ≈ 25°, elevation ≈ 65°

    // Shadow detection: pixels with very low reflectance in all visible bands
    // that are adjacent to built-up pixels
    const blue = s2Image.select('B2');
    const green = s2Image.select('B3');
    const red = s2Image.select('B4');
    const nir = s2Image.select('B8');

    // Shadow: low reflectance in all bands (dark) + low NIR (not vegetation shadow)
    const shadowMask = blue.lt(800).and(green.lt(800)).and(red.lt(800)).and(nir.lt(1500)).rename('shadow');

    // Built-up: high NDBI
    const ndbi = s2Image.normalizedDifference(['B11', 'B8']);
    const builtupMask = ndbi.gt(0.05).rename('builtup');

    // Create a small region around the building centroid (50m radius)
    const point = ee.Geometry.Point([centroid.lng, centroid.lat]);
    const buffer = point.buffer(50);

    // Count shadow pixels in the buffer
    const shadowStats = shadowMask.reduceRegion({
      reducer: ee.Reducer.count(),
      geometry: buffer,
      scale: 10,
      maxPixels: 1e6,
    });

    const builtupStats = builtupMask.reduceRegion({
      reducer: ee.Reducer.count(),
      geometry: buffer,
      scale: 10,
      maxPixels: 1e6,
    });

    const [shadowResult, builtupResult] = await Promise.all([
      new Promise((resolve, reject) => {
        shadowStats.evaluate((rOrErr, err) => {
          const hasErr = err != null;
          const r = hasErr ? null : rOrErr;
          const e = hasErr ? err : (rOrErr && rOrErr.error ? rOrErr : null);
          if (e && !r) reject(e); else resolve(r || rOrErr);
        });
      }),
      new Promise((resolve, reject) => {
        builtupStats.evaluate((rOrErr, err) => {
          const hasErr = err != null;
          const r = hasErr ? null : rOrErr;
          const e = hasErr ? err : (rOrErr && rOrErr.error ? rOrErr : null);
          if (e && !r) reject(e); else resolve(r || rOrErr);
        });
      }),
    ]);

    const shadowPixels = shadowResult?.shadow || 0;
    const builtupPixels = builtupResult?.builtup || 0;

    if (shadowPixels === 0 || builtupPixels === 0) {
      return { height_m: null, confidence: 0, method: 'shadow', reason: 'no_shadow_detected' };
    }

    // Estimate shadow length: assume shadow extends in one direction
    // shadow_length ≈ sqrt(shadow_pixels) * pixel_size (rough approximation)
    const shadowLengthM = Math.sqrt(shadowPixels) * 10;

    // Use solar elevation angle (Ghana midday average ~65°)
    const sunElevationDeg = 65;
    const sunElevationRad = (sunElevationDeg * Math.PI) / 180;

    // Height = shadow_length * tan(elevation)
    const heightM = shadowLengthM * Math.tan(sunElevationRad);

    // Confidence: higher if more shadow pixels detected relative to built-up
    const ratio = shadowPixels / Math.max(builtupPixels, 1);
    const confidence = Math.min(0.85, 0.3 + ratio * 0.5);

    // Only return if height is reasonable (2-100m)
    if (heightM < 2 || heightM > 100) {
      return { height_m: null, confidence: 0, method: 'shadow', reason: 'unreasonable_height' };
    }

    return {
      height_m: Math.round(heightM * 10) / 10,
      confidence: Math.round(confidence * 100) / 100,
      method: 'shadow',
    };
  } catch (e) {
    return { height_m: null, confidence: 0, method: 'shadow', error: e.message };
  }
}

/**
 * Estimate building height using Copernicus DEM GLO-30.
 *
 * The DEM gives surface elevation. For urban areas, the difference between
 * the building pixel and the surrounding ground gives approximate building height.
 *
 * nDSM = DSM - ground_level (focal min in a 60m radius = surrounding terrain)
 *
 * @param {ee.Geometry} region - Area of interest
 * @param {Object} centroid - { lat, lng } of the building
 * @returns {Promise<{height_m: number, confidence: number, method: string}>}
 */
async function estimateHeightFromDEM(centroid) {
  try {
    // Copernicus DEM GLO-30 — 30m resolution digital surface model
    const dem = ee.ImageCollection('COPERNICUS/DEM/GLO30').mosaic();
    const dsm = dem.select('DEM');

    // Point at building centroid
    const point = ee.Geometry.Point([centroid.lng, centroid.lat]);

    // Building elevation (DSM at centroid)
    const buildingElev = dsm.reduceRegion({
      reducer: ee.Reducer.first(),
      geometry: point,
      scale: 30,
      maxPixels: 1e6,
    });

    // Ground elevation: minimum DSM in 60m buffer (surrounding terrain)
    const groundBuffer = point.buffer(60);
    const groundElev = dsm.reduceRegion({
      reducer: ee.Reducer.min(),
      geometry: groundBuffer,
      scale: 30,
      maxPixels: 1e6,
    });

    const [buildingResult, groundResult] = await Promise.all([
      new Promise((resolve, reject) => {
        buildingElev.evaluate((rOrErr, err) => {
          const hasErr = err != null;
          const r = hasErr ? null : rOrErr;
          const e = hasErr ? err : (rOrErr && rOrErr.error ? rOrErr : null);
          if (e && !r) reject(e); else resolve(r || rOrErr);
        });
      }),
      new Promise((resolve, reject) => {
        groundElev.evaluate((rOrErr, err) => {
          const hasErr = err != null;
          const r = hasErr ? null : rOrErr;
          const e = hasErr ? err : (rOrErr && rOrErr.error ? rOrErr : null);
          if (e && !r) reject(e); else resolve(r || rOrErr);
        });
      }),
    ]);

    const buildingH = buildingResult?.DEM;
    const groundH = groundResult?.DEM;

    if (buildingH == null || groundH == null) {
      return { height_m: null, confidence: 0, method: 'dem', reason: 'no_dem_data' };
    }

    // nDSM = building elevation - ground elevation
    const ndsm = buildingH - groundH;

    // Only positive values make sense (building above ground)
    if (ndsm < 2) {
      return { height_m: null, confidence: 0, method: 'dem', reason: 'below_threshold' };
    }

    // DEM resolution is 30m, so height accuracy is limited
    // Confidence is lower for small buildings
    const confidence = ndsm > 10 ? 0.7 : ndsm > 5 ? 0.5 : 0.35;

    return {
      height_m: Math.round(ndsm * 10) / 10,
      confidence: Math.round(confidence * 100) / 100,
      method: 'dem',
    };
  } catch (e) {
    return { height_m: null, confidence: 0, method: 'dem', error: e.message };
  }
}

/**
 * Combined height estimation: tries shadow method first, falls back to DEM.
 * If both succeed, uses a weighted average.
 *
 * @param {ee.Image} s2Image - Sentinel-2 composite
 * @param {ee.Geometry} region - Area of interest
 * @param {Object} centroid - { lat, lng }
 * @returns {Promise<{height_m: number|null, estimated_floors: number|null, confidence: number, method: string}>}
 */
async function estimateBuildingHeight(s2Image, region, centroid) {
  // Try both methods in parallel
  const [shadowResult, demResult] = await Promise.all([
    estimateHeightFromShadow(s2Image, region, centroid),
    estimateHeightFromDEM(centroid),
  ]);

  let heightM = null;
  let confidence = 0;
  let method = 'none';

  if (shadowResult.height_m != null && demResult.height_m != null) {
    // Both methods gave results — weighted average by confidence
    const totalConf = shadowResult.confidence + demResult.confidence;
    if (totalConf > 0) {
      heightM = (shadowResult.height_m * shadowResult.confidence + demResult.height_m * demResult.confidence) / totalConf;
      confidence = Math.max(shadowResult.confidence, demResult.confidence);
      method = 'combined';
    }
  } else if (shadowResult.height_m != null) {
    heightM = shadowResult.height_m;
    confidence = shadowResult.confidence;
    method = 'shadow';
  } else if (demResult.height_m != null) {
    heightM = demResult.height_m;
    confidence = demResult.confidence;
    method = 'dem';
  }

  if (heightM == null) {
    return { height_m: null, estimated_floors: null, confidence: 0, method: 'none' };
  }

  // Estimate floors: average floor height ~3.5m
  const estimatedFloors = Math.max(1, Math.round(heightM / 3.5));

  return {
    height_m: Math.round(heightM * 10) / 10,
    estimated_floors: estimatedFloors,
    confidence: Math.round(confidence * 100) / 100,
    method,
  };
}

/**
 * Compare a building's size to nearby existing buildings.
 *
 * Queries the database for existing buildings within a radius and computes:
 *   - median, mean, min, max area of nearby buildings
 *   - whether the new building is unusually large/small
 *   - percentile rank
 *
 * @param {Object} db - database module
 * @param {string} orgId - organization ID
 * @param {Object} centroid - { lat, lng } of the new building
 * @param {number} areaSqm - area of the new building in sqm
 * @param {number} radiusM - search radius in meters (default 500m)
 * @returns {Promise<Object>} comparison data
 */
async function compareNearbyBuildings(db, orgId, centroid, areaSqm, radiusM = 500) {
  try {
    const result = await db.query(
      `SELECT area_sqm, estimated_height_m, estimated_floors,
              ST_Distance(
                ST_SetSRID(ST_MakePoint(centroid_lng, centroid_lat), 4326)::geography,
                ST_SetSRID(ST_MakePoint($2, $3), 4326)::geography
              ) as distance_m
       FROM buildings
       WHERE organization_id = $1
         AND ST_DWithin(
           ST_SetSRID(ST_MakePoint(centroid_lng, centroid_lat), 4326)::geography,
           ST_SetSRID(ST_MakePoint($2, $3), 4326)::geography,
           $4
         )
       ORDER BY distance_m ASC
       LIMIT 50`,
      [orgId, centroid.lng, centroid.lat, radiusM]
    );

    const nearby = result.rows.map(r => ({
      area_sqm: parseFloat(r.area_sqm) || 0,
      height_m: r.estimated_height_m ? parseFloat(r.estimated_height_m) : null,
      floors: r.estimated_floors || null,
      distance_m: parseFloat(r.distance_m),
    }));

    if (nearby.length === 0) {
      return {
        nearby_count: 0,
        comparison: 'first_building',
        median_area: null,
        mean_area: null,
        percentile_rank: null,
        size_category: 'unknown',
        nearby: [],
      };
    }

    const areas = nearby.map(b => b.area_sqm).sort((a, b) => a - b);
    const median = areas[Math.floor(areas.length / 2)];
    const mean = areas.reduce((a, b) => a + b, 0) / areas.length;
    const min = areas[0];
    const max = areas[areas.length - 1];

    // Percentile rank: what percentage of nearby buildings are smaller?
    const smallerCount = areas.filter(a => a < areaSqm).length;
    const percentileRank = Math.round((smallerCount / areas.length) * 100);

    // Size category
    let sizeCategory = 'typical';
    let comparison = 'similar_to_neighbors';
    if (areaSqm > median * 2) {
      sizeCategory = 'unusually_large';
      comparison = 'much_larger_than_neighbors';
    } else if (areaSqm > median * 1.5) {
      sizeCategory = 'larger_than_average';
      comparison = 'larger_than_neighbors';
    } else if (areaSqm < median * 0.5) {
      sizeCategory = 'unusually_small';
      comparison = 'much_smaller_than_neighbors';
    } else if (areaSqm < median * 0.75) {
      sizeCategory = 'smaller_than_average';
      comparison = 'smaller_than_neighbors';
    }

    // Height comparison (if we have height data for nearby buildings)
    const nearbyWithHeight = nearby.filter(b => b.height_m != null);
    let heightComparison = null;
    if (nearbyWithHeight.length > 0) {
      const heights = nearbyWithHeight.map(b => b.height_m).sort((a, b) => a - b);
      const medianHeight = heights[Math.floor(heights.length / 2)];
      heightComparison = {
        median_height_m: medianHeight,
        nearby_with_height_data: heights.length,
      };
    }

    return {
      nearby_count: nearby.length,
      comparison,
      median_area: Math.round(median),
      mean_area: Math.round(mean),
      min_area: Math.round(min),
      max_area: Math.round(max),
      percentile_rank: percentileRank,
      size_category: sizeCategory,
      height_comparison: heightComparison,
      nearby: nearby.slice(0, 10), // top 10 nearest
    };
  } catch (e) {
    return { nearby_count: 0, comparison: 'error', error: e.message };
  }
}

module.exports = {
  estimateBuildingHeight,
  estimateHeightFromShadow,
  estimateHeightFromDEM,
  compareNearbyBuildings,
};
