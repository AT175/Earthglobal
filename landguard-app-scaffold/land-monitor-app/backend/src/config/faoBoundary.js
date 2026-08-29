/**
 * FAO GAUL 2015 Boundary Resolution
 *
 * The FAO Global Administrative Unit Layers (GAUL) 2015 dataset is available
 * in Earth Engine as:
 *   - FAO/GAUL/2015/level0  (country boundaries)
 *   - FAO/GAUL/2015/level1  (first-level admin: regions/states/provinces)
 *   - FAO/GAUL/2015/level2  (second-level admin: districts/municipalities)
 *
 * This module resolves an organization's region/name to the matching FAO
 * GAUL 2015 boundary geometry, which can be used as the default area for
 * building extraction and change detection.
 */
const { ee } = require('./earthEngine');

// FAO GAUL 2015 datasets
const GAUL_LEVEL0 = 'FAO/GAUL/2015/level0';
const GAUL_LEVEL1 = 'FAO/GAUL/2015/level1';
const GAUL_LEVEL2 = 'FAO/GAUL/2015/level2';

/**
 * Normalize a name for matching against FAO GAUL names.
 * Removes suffixes like "District Assembly", "Municipal Assembly", etc.
 * and lowercases for case-insensitive comparison.
 */
function normalizeName(name) {
  if (!name) return '';
  return name
    .toLowerCase()
    .replace(/\bdistrict\s+assembly\b/g, '')
    .replace(/\bmunicipal\s+assembly\b/g, '')
    .replace(/\bmetropolitan\s+assembly\b/g, '')
    .replace(/\bassembly\b/g, '')
    .replace(/\bdistrict\b/g, '')
    .replace(/\bmunicipal\b/g, '')
    .replace(/\bmetro\b/g, '')
    .replace(/\bregion\b/g, '')
    .replace(/\bprovince\b/g, '')
    .replace(/\bcounty\b/g, '')
    .trim();
}

/**
 * Resolve the FAO GAUL 2015 boundary for an organization.
 *
 * Strategy (in order of preference):
 *   1. Match org name against GAUL level2 (district) names
 *   2. Match org region against GAUL level1 (region) names
 *   3. Fall back to GAUL level0 for the country (Ghana)
 *
 * @param {Object} org - { name, region }
 * @returns {Promise<ee.Geometry|null>} The EE geometry for the matched boundary
 */
async function resolveFAOBoundary(org) {
  const orgName = normalizeName(org.name);
  const orgRegion = normalizeName(org.region);

  // ── Try level2 (district) first ──
  if (orgName) {
    try {
      const level2 = ee.FeatureCollection(GAUL_LEVEL2);
      // FAO GAUL names are in the "NAME2" property
      // Filter by country (Ghana = country code "GHA" or name match)
      const ghanaLevel2 = level2.filter(ee.Filter.eq('ADM0_NAME', 'Ghana'));

      // Try exact match first, then contains
      let matched = ghanaLevel2.filter(ee.Filter.eq('NAME2', org.name));
      let features = await evaluateFeatureCount(matched);

      if (features === 0) {
        // Try case-insensitive via string contains
        const allGhanaDistricts = await evaluateFeatureList(ghanaLevel2, 200);
        const found = allGhanaDistricts.find(f => {
          const name2 = f.properties?.NAME2 || '';
          return normalizeName(name2) === orgName;
        });
        if (found) {
          return ee.Feature(found).geometry();
        }
      } else {
        return matched.first().geometry();
      }
    } catch (e) {
      console.error('[FAO] Level2 match failed:', e.message);
    }
  }

  // ── Try level1 (region) ──
  if (orgRegion) {
    try {
      const level1 = ee.FeatureCollection(GAUL_LEVEL1);
      const ghanaLevel1 = level1.filter(ee.Filter.eq('ADM0_NAME', 'Ghana'));

      let matched = ghanaLevel1.filter(ee.Filter.eq('NAME1', org.region));
      let features = await evaluateFeatureCount(matched);

      if (features === 0) {
        const allGhanaRegions = await evaluateFeatureList(ghanaLevel1, 50);
        const found = allGhanaRegions.find(f => {
          const name1 = f.properties?.NAME1 || '';
          return normalizeName(name1) === orgRegion;
        });
        if (found) {
          return ee.Feature(found).geometry();
        }
      } else {
        return matched.first().geometry();
      }
    } catch (e) {
      console.error('[FAO] Level1 match failed:', e.message);
    }
  }

  // ── Fall back to level0 (country = Ghana) ──
  try {
    const level0 = ee.FeatureCollection(GAUL_LEVEL0);
    const ghana = level0.filter(ee.Filter.eq('ADM0_NAME', 'Ghana'));
    const count = await evaluateFeatureCount(ghana);
    if (count > 0) {
      console.log('[FAO] Falling back to Ghana country boundary (level0)');
      return ghana.first().geometry();
    }
  } catch (e) {
    console.error('[FAO] Level0 fallback failed:', e.message);
  }

  return null;
}

/**
 * Get the bounding box of an EE geometry.
 * Returns { minLng, minLat, maxLng, maxLat }.
 */
async function getGeometryBbox(geometry) {
  return new Promise((resolve, reject) => {
    geometry.bounds().getInfo((info, err) => {
      if (err) {
        reject(err);
        return;
      }
      // info.coordinates is a polygon (the bounding box)
      const coords = info?.coordinates?.[0] || [];
      if (coords.length === 0) {
        reject(new Error('Could not determine bbox from geometry'));
        return;
      }
      const lngs = coords.map(c => c[0]);
      const lats = coords.map(c => c[1]);
      resolve({
        minLng: Math.min(...lngs),
        minLat: Math.min(...lats),
        maxLng: Math.max(...lngs),
        maxLat: Math.max(...lats),
      });
    });
  });
}

// ── Helpers ──

function evaluateFeatureCount(collection) {
  return new Promise((resolve) => {
    collection.size().getInfo((count, err) => {
      if (err) {
        console.error('[FAO] count error:', String(err).substring(0, 200));
        resolve(0);
      } else {
        resolve(count || 0);
      }
    });
  });
}

function evaluateFeatureList(collection, limit) {
  return new Promise((resolve) => {
    collection.toList(limit).getInfo((features, err) => {
      if (err) {
        console.error('[FAO] list error:', String(err).substring(0, 200));
        resolve([]);
      } else {
        resolve(features || []);
      }
    });
  });
}

/**
 * List all Ghana districts (GAUL 2015 level2) with names.
 * Returns array of { name, level } sorted alphabetically.
 */
async function listGhanaDistricts() {
  try {
    const level2 = ee.FeatureCollection(GAUL_LEVEL2);
    const ghanaLevel2 = level2.filter(ee.Filter.eq('ADM0_NAME', 'Ghana'));
    const features = await evaluateFeatureList(ghanaLevel2, 300);
    const districts = features
      .map(f => ({
        name: f.properties?.NAME2 || '',
        level: 'district',
      }))
      .filter(d => d.name)
      .sort((a, b) => a.name.localeCompare(b.name));
    return districts;
  } catch (e) {
    console.error('[FAO] listGhanaDistricts failed:', e.message);
    return [];
  }
}

/**
 * List all Ghana regions (GAUL 2015 level1) with names.
 * Returns array of { name, level } sorted alphabetically.
 */
async function listGhanaRegions() {
  try {
    const level1 = ee.FeatureCollection(GAUL_LEVEL1);
    const ghanaLevel1 = level1.filter(ee.Filter.eq('ADM0_NAME', 'Ghana'));
    const features = await evaluateFeatureList(ghanaLevel1, 50);
    const regions = features
      .map(f => ({
        name: f.properties?.NAME1 || '',
        level: 'region',
      }))
      .filter(d => d.name)
      .sort((a, b) => a.name.localeCompare(b.name));
    return regions;
  } catch (e) {
    console.error('[FAO] listGhanaRegions failed:', e.message);
    return [];
  }
}

/**
 * Get the GeoJSON geometry of a specific Ghana district by name.
 * Returns { geojson, bbox, level } or null if not found.
 */
async function getDistrictBoundaryByName(districtName) {
  if (!districtName) return null;
  const normalized = normalizeName(districtName);

  // Try level2 (district) first
  try {
    const level2 = ee.FeatureCollection(GAUL_LEVEL2);
    const ghanaLevel2 = level2.filter(ee.Filter.eq('ADM0_NAME', 'Ghana'));

    // Exact match first
    let matched = ghanaLevel2.filter(ee.Filter.eq('NAME2', districtName));
    let count = await evaluateFeatureCount(matched);

    if (count === 0) {
      // Case-insensitive / normalized match
      const allDistricts = await evaluateFeatureList(ghanaLevel2, 300);
      const found = allDistricts.find(f => {
        const name2 = f.properties?.NAME2 || '';
        return normalizeName(name2) === normalized;
      });
      if (found) {
        return await featureToBoundary(found, 'district');
      }
    } else {
      const feature = await evaluateFeatureList(matched, 1);
      if (feature[0]) return await featureToBoundary(feature[0], 'district');
    }
  } catch (e) {
    console.error('[FAO] getDistrictBoundaryByName level2 failed:', e.message);
  }

  // Try level1 (region) as fallback
  try {
    const level1 = ee.FeatureCollection(GAUL_LEVEL1);
    const ghanaLevel1 = level1.filter(ee.Filter.eq('ADM0_NAME', 'Ghana'));

    let matched = ghanaLevel1.filter(ee.Filter.eq('NAME1', districtName));
    let count = await evaluateFeatureCount(matched);

    if (count === 0) {
      const allRegions = await evaluateFeatureList(ghanaLevel1, 50);
      const found = allRegions.find(f => {
        const name1 = f.properties?.NAME1 || '';
        return normalizeName(name1) === normalized;
      });
      if (found) {
        return await featureToBoundary(found, 'region');
      }
    } else {
      const feature = await evaluateFeatureList(matched, 1);
      if (feature[0]) return await featureToBoundary(feature[0], 'region');
    }
  } catch (e) {
    console.error('[FAO] getDistrictBoundaryByName level1 failed:', e.message);
  }

  return null;
}

/**
 * Convert an EE feature to { geojson, bbox, level }.
 */
async function featureToBoundary(feature, level) {
  const geom = ee.Feature(feature).geometry();

  // Get GeoJSON — use evaluate() since geometry is computed (from EE filter)
  const geojson = await new Promise((resolve, reject) => {
    geom.evaluate((data, err) => {
      if (err) reject(err);
      else resolve(data);
    });
  });

  // Get bbox
  let bbox = null;
  try {
    bbox = await getGeometryBbox(geom);
  } catch (e) {
    console.error('[FAO] bbox failed:', e.message);
  }

  return { geojson, bbox, level };
}

module.exports = {
  resolveFAOBoundary,
  getGeometryBbox,
  normalizeName,
  listGhanaDistricts,
  listGhanaRegions,
  getDistrictBoundaryByName,
  GAUL_LEVEL0,
  GAUL_LEVEL1,
  GAUL_LEVEL2,
};
