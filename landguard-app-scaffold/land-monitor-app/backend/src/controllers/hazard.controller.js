/**
 * Environmental Hazard Controller
 *
 * Detects and manages environmental hazards using Google Earth Engine:
 *   - Water pollution (turbidity, chlorophyll-a, NDWI anomalies)
 *   - Flood-prone areas (NDWI, elevation, historical flood patterns)
 *   - Illegal mining (bare soil + spectral signatures + water contamination)
 *   - Open dumps (NDBI + bare soil + vegetation stress)
 *
 * Provides:
 *   - EE-based automatic detection over a bbox
 *   - Manual query with parameters (type, severity, date range, region)
 *   - Real-time WebSocket alerts when hazards are detected
 *   - GeoJSON export for map overlay
 *   - Integration with validation PDF reports
 */
const db = require('../config/db');
const { ee, init: initEE } = require('../config/earthEngine');
const bus = require('../realtime/eventBus');

function getOrgId(req) {
  return req.user.organizationId || req.user.organization_id;
}

// ═══════════════════════════════════════════════════════════
// HAZARD TYPE CONFIGURATIONS
// ═══════════════════════════════════════════════════════════
const HAZARD_CONFIG = {
  water_pollution: {
    label: 'Water Pollution',
    color: '#06b6d4',
    description: 'High turbidity, chlorophyll-a, or contaminant signatures in water bodies',
    indices: ['ndwi', 'turbidity', 'chlorophyll_a'],
  },
  flood_prone: {
    label: 'Flood-Prone Area',
    color: '#3b82f6',
    description: 'Areas with high water accumulation risk based on NDWI and topography',
    indices: ['ndwi', 'mndwi', 'elevation'],
  },
  illegal_mining: {
    label: 'Illegal Mining',
    color: '#a855f7',
    description: 'Bare soil disruption + spectral signatures of mining activity near water',
    indices: ['ndbi', 'bsi', 'ndvi', 'iron_oxide'],
  },
  open_dump: {
    label: 'Open Dump',
    color: '#ef4444',
    description: 'Built-up anomaly + bare soil + vegetation stress indicating waste accumulation',
    indices: ['ndbi', 'bsi', 'ndvi', 'ndbi_anomaly'],
  },
  deforestation: {
    label: 'Deforestation',
    color: '#84cc16',
    description: 'Significant vegetation loss detected via NDVI time-series comparison (Sentinel-2)',
    indices: ['ndvi_baseline', 'ndvi_current', 'ndvi_change', 'evi'],
  },
  air_quality: {
    label: 'Air Quality (NO2)',
    color: '#f97316',
    description: 'High nitrogen dioxide concentrations from Sentinel-5P TROPOMI indicating industrial/traffic emissions',
    indices: ['no2_column', 'no2_tropospheric'],
  },
  urban_heat: {
    label: 'Urban Heat Island',
    color: '#dc2626',
    description: 'Elevated land surface temperature from Landsat 8/9 thermal infrared, indicating heat stress risk',
    indices: ['lst', 'ndvi', 'temperature_anomaly'],
  },
  wetland_loss: {
    label: 'Wetland Degradation',
    color: '#0ea5e9',
    description: 'Loss of water bodies and wetland vegetation detected via MNDWI time-series change',
    indices: ['mndwi_baseline', 'mndwi_current', 'mndwi_change', 'ndvi'],
  },
};

// ═══════════════════════════════════════════════════════════
// EE-BASED HAZARD DETECTION
// ═══════════════════════════════════════════════════════════

// POST /assembly/planning/detect-hazards
// Body: { bbox: { minLng, minLat, maxLng, maxLat }, types: ['water_pollution','flood_prone','illegal_mining','open_dump'] }
exports.detectHazards = async (req, res, next) => {
  try {
    const orgId = getOrgId(req);
    const { bbox, types } = req.body;

    if (!bbox) return res.status(400).json({ error: 'bbox is required' });

    const ready = await initEE();
    if (!ready) {
      return res.status(503).json({
        error: 'Earth Engine is not configured. Set EE_SERVICE_ACCOUNT_JSON to enable hazard detection.',
        detected: false,
      });
    }

    const detectTypes = types || Object.keys(HAZARD_CONFIG);
    const [minLng, minLat, maxLng, maxLat] = [bbox.minLng, bbox.minLat, bbox.maxLng, bbox.maxLat];
    const region = ee.Geometry.Rectangle([minLng, minLat, maxLng, maxLat], 'EPSG:4326', false);

    // ── Load Sentinel-2 composite ──
    const s2 = ee.ImageCollection('COPERNICUS/S2_HARMONIZED')
      .filterDate('2024-01-01', '2025-12-31')
      .filter(ee.Filter.lt('CLOUDY_PIXEL_PERCENTAGE', 20))
      .filterBounds(region)
      .median();

    // ── Compute spectral indices ──
    // NDWI (Normalized Difference Water Index) = (Green - NIR) / (Green + NIR)
    // B3 (Green) = 560nm, B8 (NIR) = 842nm
    const ndwi = s2.normalizedDifference(['B3', 'B8']).rename('ndwi');

    // MNDWI (Modified NDWI) = (Green - SWIR1) / (Green + SWIR1) — better for water bodies
    const mndwi = s2.normalizedDifference(['B3', 'B11']).rename('mndwi');

    // NDBI (Built-up Index) = (SWIR1 - NIR) / (SWIR1 + NIR)
    const ndbi = s2.normalizedDifference(['B11', 'B8']).rename('ndbi');

    // NDVI (Vegetation Index) = (NIR - Red) / (NIR + Red)
    const ndvi = s2.normalizedDifference(['B8', 'B4']).rename('ndvi');

    // BSI (Bare Soil Index) = ((SWIR1 + Red) - (NIR + Blue)) / ((SWIR1 + Red) + (NIR + Blue))
    const bsi = s2.expression(
      '((SWIR1 + Red) - (NIR + Blue)) / ((SWIR1 + Red) + (NIR + Blue))',
      { SWIR1: s2.select('B11'), Red: s2.select('B4'), NIR: s2.select('B8'), Blue: s2.select('B2') }
    ).rename('bsi');

    // Iron Oxide ratio = Red / Blue (high for mining areas with exposed iron-rich soil)
    const ironOxide = s2.expression('Red / Blue', {
      Red: s2.select('B4'), Blue: s2.select('B2'),
    }).rename('iron_oxide');

    // Turbidity proxy = Red / Green (high turbidity in water = high red reflectance)
    const turbidity = s2.expression('Red / Green', {
      Red: s2.select('B4'), Green: s2.select('B3'),
    }).rename('turbidity');

    // Chlorophyll-a proxy = (NIR / Red) — high in algae blooms
    const chlorophyllA = s2.normalizedDifference(['B8', 'B4']).rename('chlorophyll_a');

    // ── Build detection masks for each hazard type ──
    const detectionMasks = {};

    if (detectTypes.includes('water_pollution')) {
      // Water pollution: water bodies (MNDWI > 0.1) with high turbidity (> 1.3) or high chlorophyll (> 0.3)
      const waterMask = mndwi.gt(0.1);
      const turbidWater = waterMask.and(turbidity.gt(1.3));
      const algaeBloom = waterMask.and(chlorophyllA.gt(0.3));
      detectionMasks.water_pollution = turbidWater.or(algaeBloom).rename('water_pollution');
    }

    if (detectTypes.includes('flood_prone')) {
      // Flood-prone: high NDWI/MNDWI + low elevation (use SRTM)
      const srtm = ee.Image('USGS/SRTMGL1_003');
      const lowElevation = srtm.lt(50); // below 50m elevation
      const highWaterIndex = ndwi.gt(0.0).or(mndwi.gt(0.0));
      const flatTerrain = srtm.subtract(srtm.focal_mean(500, 'circle', 'meters')).abs().lt(5);
      detectionMasks.flood_prone = highWaterIndex.and(lowElevation).and(flatTerrain).rename('flood_prone');
    }

    if (detectTypes.includes('illegal_mining')) {
      // Illegal mining: bare soil (high BSI) + low NDVI + high iron oxide + near water
      const bareSoil = bsi.gt(0.2).and(ndvi.lt(0.1));
      const ironRich = ironOxide.gt(1.5);
      const nearWater = mndwi.gt(-0.2); // within proximity of water
      detectionMasks.illegal_mining = bareSoil.and(ironRich).and(nearWater).rename('illegal_mining');
    }

    if (detectTypes.includes('open_dump')) {
      // Open dump: built-up (NDBI > 0.1) + bare soil (BSI > 0.15) + vegetation stress (NDVI 0.1-0.3)
      const builtup = ndbi.gt(0.1);
      const bareSoil = bsi.gt(0.15);
      const vegStress = ndvi.gt(0.1).and(ndvi.lt(0.3));
      detectionMasks.open_dump = builtup.and(bareSoil).and(vegStress).rename('open_dump');
    }

    if (detectTypes.includes('deforestation')) {
      // Deforestation: compare baseline NDVI (6-12 months ago) vs current NDVI
      // Significant vegetation loss = NDVI dropped by > 0.25
      const baselineDefor = ee.ImageCollection('COPERNICUS/S2_HARMONIZED')
        .filterDate('2024-01-01', '2024-06-30')
        .filter(ee.Filter.lt('CLOUDY_PIXEL_PERCENTAGE', 20))
        .filterBounds(region)
        .median();
      const baselineNdvi = baselineDefor.normalizedDifference(['B8', 'B4']).rename('ndvi_baseline');
      const currentNdvi = ndvi.rename('ndvi_current');
      const ndviChange = baselineNdvi.subtract(currentNdvi).rename('ndvi_change');
      // Deforestation: NDVI dropped by more than 0.25 AND was previously vegetated (baseline NDVI > 0.4)
      detectionMasks.deforestation = ndviChange.gt(0.25).and(baselineNdvi.gt(0.4)).rename('deforestation');
    }

    if (detectTypes.includes('air_quality')) {
      // Air quality: Sentinel-5P TROPOMI NO2 (tropospheric NO2 column)
      // High NO2 = industrial emissions, traffic pollution, biomass burning
      const s5p = ee.ImageCollection('COPERNICUS/S5P/N02')
        .filterDate('2024-01-01', '2025-12-31')
        .filterBounds(region)
        .select('troposphic_NO2_column_number_density')
        .median();
      // NO2 threshold: > 0.0001 mol/m² (typical polluted area)
      // Use focal_max to smooth the NO2 data (it's coarse resolution ~7km)
      const no2Smoothed = s5p.focal_mean(5000, 'circle', 'meters');
      detectionMasks.air_quality = no2Smoothed.gt(0.0001).rename('air_quality');
    }

    if (detectTypes.includes('urban_heat')) {
      // Urban heat island: Landsat 8/9 thermal infrared (LST)
      // High LST relative to surrounding rural areas = urban heat island
      const landsat = ee.ImageCollection('LANDSAT/LC09/C02/T1_L2')
        .filterDate('2024-01-01', '2025-12-31')
        .filterBounds(region)
        .median();
      // Landsat C2 L2 already has surface temperature in ST_B10 band (in Kelvin)
      // Convert to Celsius: ST_B10 * 0.00341802 + 149.0 - 273.15
      const lst = landsat.select('ST_B10').multiply(0.00341802).add(149.0).subtract(273.15).rename('lst');
      // Urban heat: LST > 35°C AND low NDVI (not vegetated, likely urban)
      // Also compute anomaly: LST - focal mean (50km) to find relative hotspots
      const lstAnomaly = lst.subtract(lst.focal_mean(50000, 'circle', 'meters')).rename('lst_anomaly');
      detectionMasks.urban_heat = lst.gt(35).and(ndvi.lt(0.2)).and(lstAnomaly.gt(3)).rename('urban_heat');
    }

    if (detectTypes.includes('wetland_loss')) {
      // Wetland degradation: compare baseline MNDWI (6-12 months ago) vs current MNDWI
      // Significant water loss = MNDWI dropped by > 0.2
      const baselineWet = ee.ImageCollection('COPERNICUS/S2_HARMONIZED')
        .filterDate('2024-01-01', '2024-06-30')
        .filter(ee.Filter.lt('CLOUDY_PIXEL_PERCENTAGE', 20))
        .filterBounds(region)
        .median();
      const baselineMndwi = baselineWet.normalizedDifference(['B3', 'B11']).rename('mndwi_baseline');
      const currentMndwi = mndwi.rename('mndwi_current');
      const mndwiChange = baselineMndwi.subtract(currentMndwi).rename('mndwi_change');
      // Wetland loss: MNDWI dropped by > 0.2 AND was previously water (baseline MNDWI > 0)
      detectionMasks.wetland_loss = mndwiChange.gt(0.2).and(baselineMndwi.gt(0)).rename('wetland_loss');
    }

    const activeTypes = Object.keys(detectionMasks);
    if (activeTypes.length === 0) {
      return res.json({ detected: false, error: 'No valid hazard types specified' });
    }

    // ── Combine all detection masks into a single multi-band image ──
    let combinedImage = ee.Image(activeTypes.map(t => detectionMasks[t]));

    // ── Get tile URL for visualization ──
    // Create a colored visualization: red for any hazard, colored by type
    const hazardVis = combinedImage.visualize({
      palette: ['000000', 'ff0000'],
      min: 0, max: 1,
    });

    hazardVis.getMapId({ min: 0, max: 255 }, (err, map) => {
      if (err) {
        console.error('EE hazard detection getMapId failed:', err.message);
        return res.status(500).json({ error: 'Hazard detection failed', detected: false });
      }

      const tileUrl = `https://earthengine.googleapis.com/v1/${map.mapid}/tiles/{z}/{x}/{y}`;

      // ── Process each hazard type: compute stats + vectorize + save to DB ──
      const detectionResults = {};
      let processedCount = 0;
      const allSavedHazards = [];

      activeTypes.forEach((hazardType) => {
        const mask = detectionMasks[hazardType];
        const config = HAZARD_CONFIG[hazardType];

        // Compute pixel count for this hazard type
        const stats = mask.reduceRegion({
          reducer: ee.Reducer.count(),
          geometry: region,
          scale: 10,
          maxPixels: 1e13,
        });

        // Vectorize the detected clusters
        const vectors = mask.addBands(s2.select('B4')).reduceToVectors({
          geometry: region,
          scale: 10,
          geometryType: 'polygon',
          eightConnected: true,
          labelProperty: 'hazard',
          reducer: ee.Reducer.count(),
          maxPixels: 1e13,
        });

        const hazardPolygons = vectors.filter(ee.Filter.eq('hazard', 1))
          .filter(ee.Filter.gte('count', 10)); // at least 10 pixels = 1000sqm

        stats.evaluate((statResult) => {
          const pixelCount = statResult?.[hazardType] || 0;
          const areaSqm = pixelCount * 100; // 10m x 10m pixels

          hazardPolygons.toList(100).evaluate(async (features, featErr) => {
            const savedHazards = [];

            if (!featErr && features && features.length > 0) {
              for (const feat of features.slice(0, 50)) { // cap at 50 per type
                try {
                  const geom = feat.geometry;
                  const coords = geom?.coordinates;
                  if (!coords || !coords[0] || coords[0].length < 4) continue;

                  const geojson = {
                    type: 'Polygon',
                    coordinates: coords[0] ? [coords[0].map(c => [c[0], c[1]])] : coords,
                  };

                  // Compute centroid
                  const ring = geojson.coordinates[0];
                  const centroidLat = ring.reduce((s, c) => s + c[1], 0) / ring.length;
                  const centroidLng = ring.reduce((s, c) => s + c[0], 0) / ring.length;

                  // Determine severity based on cluster size
                  const pixelCountCluster = feat.properties?.count || 0;
                  const clusterArea = pixelCountCluster * 100;
                  let severity = 'low';
                  if (clusterArea > 10000) severity = 'critical';
                  else if (clusterArea > 5000) severity = 'high';
                  else if (clusterArea > 2000) severity = 'moderate';

                  // Compute confidence based on spectral indices
                  const confidence = Math.min(0.95, 0.5 + (pixelCountCluster / 1000));

                  // Save to database
                  const insertResult = await db.query(
                    `INSERT INTO environmental_hazards
                       (organization_id, hazard_type, centroid_lat, centroid_lng, boundary, bbox,
                        region, area_sqm, severity, confidence, detection_method, indices,
                        description, tile_url, status, detected_by, metadata)
                     VALUES ($1, $2, $3, $4, ST_SetSRID(ST_GeomFromGeoJSON($5), 4326), $6,
                        $7, ST_Area(ST_SetSRID(ST_GeomFromGeoJSON($5), 4326)::geography),
                        $8, $9, 'earth_engine', $10, $11, $12, 'active', $13, $14)
                     RETURNING id, hazard_type, severity, centroid_lat, centroid_lng, area_sqm`,
                    [
                      orgId, hazardType, centroidLat, centroidLng, JSON.stringify(geojson),
                      JSON.stringify(bbox), null, severity, confidence,
                      JSON.stringify({
                        ndwi: 'computed', ndbi: 'computed', bsi: 'computed',
                        ndvi: 'computed', pixel_count: pixelCountCluster,
                      }),
                      config.description, tileUrl,
                      req.user.name || req.user.email || 'system',
                      JSON.stringify({
                        detection_date: new Date().toISOString(),
                        detection_bbox: bbox,
                        cluster_pixels: pixelCountCluster,
                        source: 'earth_engine_sentinel2',
                      }),
                    ]
                  );

                  const saved = insertResult.rows[0];
                  savedHazards.push({
                    id: saved.id,
                    hazard_type: saved.hazard_type,
                    severity: saved.severity,
                    centroid_lat: parseFloat(saved.centroid_lat),
                    centroid_lng: parseFloat(saved.centroid_lng),
                    area_sqm: parseFloat(saved.area_sqm),
                  });
                  allSavedHazards.push(savedHazards[savedHazards.length - 1]);
                } catch (e) {
                  // Skip individual save errors
                }
              }
            }

            detectionResults[hazardType] = {
              label: config.label,
              pixel_count: pixelCount,
              area_sqm: areaSqm,
              detected_clusters: savedHazards.length,
              severity: savedHazards.length > 0 ? savedHazards[0].severity : 'none',
              saved: savedHazards,
            };

            processedCount++;

            // ── When all types are processed, send response + alerts ──
            if (processedCount === activeTypes.length) {
              const totalHazards = allSavedHazards.length;

              // Emit real-time alert via WebSocket if hazards were found
              if (totalHazards > 0) {
                bus.emit('hazard:detected', {
                  orgId,
                  totalHazards,
                  hazardsByType: detectionResults,
                  tileUrl,
                  bbox,
                  timestamp: new Date().toISOString(),
                });

                // Save alert records for planners
                try {
                  for (const hazard of allSavedHazards) {
                    await db.query(
                      `INSERT INTO hazard_alerts (organization_id, hazard_id, target_type, alert_type, title, message)
                       VALUES ($1, $2, 'planner', $3, $4, $5)`,
                      [
                        orgId, hazard.id, hazard.hazard_type,
                        `${HAZARD_CONFIG[hazard.hazard_type].label} detected`,
                        `A ${HAZARD_CONFIG[hazard.hazard_type].label.toLowerCase()} hazard (${hazard.severity} severity) was detected at ${hazard.centroid_lat.toFixed(4)}, ${hazard.centroid_lng.toFixed(4)}. Area: ${Math.round(hazard.area_sqm).toLocaleString()} m².`,
                      ]
                    );
                  }
                } catch (e) {
                  console.error('Failed to save hazard alerts:', e.message);
                }
              }

              res.json({
                detected: totalHazards > 0,
                tileUrl,
                token: map.token,
                bbox,
                total_hazards: totalHazards,
                results: detectionResults,
                method: 'Sentinel-2 + Sentinel-5P + Landsat 9 multi-spectral analysis via Google Earth Engine (NDWI, MNDWI, NDBI, BSI, NDVI, Iron Oxide, Turbidity, NO2, LST, NDVI change, MNDWI change)',
                attribution: 'Hazard detection &copy; Copernicus Sentinel-2/5P + Landsat 9 + SRTM via Google Earth Engine',
              });
            }
          });
        });
      });
    });
  } catch (err) {
    console.error('Hazard detection error:', err.message);
    res.status(500).json({ error: 'Hazard detection failed: ' + err.message, detected: false });
  }
};

// ═══════════════════════════════════════════════════════════
// GET HAZARDS AS GEOJSON FOR MAP OVERLAY
// ═══════════════════════════════════════════════════════════

// GET /assembly/planning/hazards-geojson
exports.getHazardsGeoJSON = async (req, res, next) => {
  try {
    const orgId = getOrgId(req);
    const { type, severity, status } = req.query;

    let query = `SELECT id, hazard_type, severity, confidence, description, region, area_sqm,
                        centroid_lat, centroid_lng, detected_at, last_checked_at, status,
                        indices, tile_url, metadata,
                        ST_AsGeoJSON(boundary) as geojson
                 FROM environmental_hazards WHERE organization_id = $1`;
    const params = [orgId];
    let conditions = [];

    if (type) { params.push(type); conditions.push(`hazard_type = $${params.length}`); }
    if (severity) { params.push(severity); conditions.push(`severity = $${params.length}`); }
    if (status) { params.push(status); conditions.push(`status = $${params.length}`); }
    else { conditions.push(`status IN ('active', 'verified')`); }

    if (conditions.length > 0) query += ' AND ' + conditions.join(' AND ');
    query += ' ORDER BY detected_at DESC LIMIT 500';

    const result = await db.query(query, params);

    const features = result.rows.map((row) => ({
      type: 'Feature',
      geometry: row.geojson ? JSON.parse(row.geojson) : null,
      properties: {
        id: row.id,
        hazard_type: row.hazard_type,
        type: row.hazard_type,
        severity: row.severity,
        confidence: row.confidence ? parseFloat(row.confidence) : null,
        description: row.description,
        region: row.region,
        area_sqm: parseFloat(row.area_sqm) || 0,
        centroid_lat: row.centroid_lat ? parseFloat(row.centroid_lat) : null,
        centroid_lng: row.centroid_lng ? parseFloat(row.centroid_lng) : null,
        detected_at: row.detected_at,
        last_checked_at: row.last_checked_at,
        status: row.status,
        indices: row.indices || {},
        tile_url: row.tile_url,
        metadata: row.metadata || {},
      },
    }));

    res.json({ type: 'FeatureCollection', features });
  } catch (err) { next(err); }
};

// ═══════════════════════════════════════════════════════════
// MANUAL QUERY — planner inputs parameters to search hazards
// ═══════════════════════════════════════════════════════════

// POST /assembly/planning/hazards/query
// Body: { hazard_type, severity, date_from, date_to, region, lat, lng, radius_km, status }
exports.queryHazards = async (req, res, next) => {
  try {
    const orgId = getOrgId(req);
    const {
      hazard_type, severity, date_from, date_to,
      region, lat, lng, radius_km, status, min_confidence,
    } = req.body;

    let query = `SELECT id, hazard_type, severity, confidence, description, region, area_sqm,
                        centroid_lat, centroid_lng, detected_at, last_checked_at, status,
                        indices, tile_url, metadata,
                        ST_AsGeoJSON(boundary) as geojson
                 FROM environmental_hazards WHERE organization_id = $1`;
    const params = [orgId];
    let conditions = [];

    if (hazard_type) {
      params.push(hazard_type);
      conditions.push(`hazard_type = $${params.length}`);
    }
    if (severity) {
      params.push(severity);
      conditions.push(`severity = $${params.length}`);
    }
    if (status) {
      params.push(status);
      conditions.push(`status = $${params.length}`);
    }
    if (date_from) {
      params.push(date_from);
      conditions.push(`detected_at >= $${params.length}`);
    }
    if (date_to) {
      params.push(date_to);
      conditions.push(`detected_at <= $${params.length}`);
    }
    if (region) {
      params.push(`%${region}%`);
      conditions.push(`region ILIKE $${params.length}`);
    }
    if (min_confidence != null) {
      params.push(min_confidence);
      conditions.push(`confidence >= $${params.length}`);
    }
    // Spatial query: search within radius of a point
    if (lat != null && lng != null) {
      const radius = (radius_km || 5) * 1000; // km to meters
      params.push(lng, lat, radius);
      conditions.push(`ST_DWithin(ST_SetSRID(ST_MakePoint($${params.length - 2}, $${params.length - 1}), 4326)::geography, ST_SetSRID(ST_MakePoint(centroid_lng, centroid_lat), 4326)::geography, $${params.length})`);
    }

    if (conditions.length > 0) query += ' AND ' + conditions.join(' AND ');
    query += ' ORDER BY detected_at DESC LIMIT 200';

    const result = await db.query(query, params);

    const features = result.rows.map((row) => ({
      type: 'Feature',
      geometry: row.geojson ? JSON.parse(row.geojson) : null,
      properties: {
        id: row.id,
        hazard_type: row.hazard_type,
        type: row.hazard_type,
        severity: row.severity,
        confidence: row.confidence ? parseFloat(row.confidence) : null,
        description: row.description,
        region: row.region,
        area_sqm: parseFloat(row.area_sqm) || 0,
        centroid_lat: row.centroid_lat ? parseFloat(row.centroid_lat) : null,
        centroid_lng: row.centroid_lng ? parseFloat(row.centroid_lng) : null,
        detected_at: row.detected_at,
        last_checked_at: row.last_checked_at,
        status: row.status,
        indices: row.indices || {},
        tile_url: row.tile_url,
        metadata: row.metadata || {},
      },
    }));

    res.json({
      type: 'FeatureCollection',
      features,
      total: features.length,
      query_params: { hazard_type, severity, date_from, date_to, region, lat, lng, radius_km, status, min_confidence },
    });
  } catch (err) { next(err); }
};

// ═══════════════════════════════════════════════════════════
// GET SINGLE HAZARD DETAILS
// ═══════════════════════════════════════════════════════════

// GET /assembly/planning/hazards/:id
exports.getHazard = async (req, res, next) => {
  try {
    const orgId = getOrgId(req);
    const result = await db.query(
      `SELECT h.*, ST_AsGeoJSON(h.boundary) as geojson,
              (SELECT json_agg(json_build_object('id', ha.id, 'title', ha.title, 'message', ha.message, 'created_at', ha.created_at, 'delivery_status', ha.delivery_status))
               FROM hazard_alerts ha WHERE ha.hazard_id = h.id) as alerts
       FROM environmental_hazards h
       WHERE h.id = $1 AND h.organization_id = $2`,
      [req.params.id, orgId]
    );
    if (!result.rows[0]) return res.status(404).json({ error: 'Hazard not found' });

    const row = result.rows[0];
    res.json({
      ...row,
      geojson: row.geojson ? JSON.parse(row.geojson) : null,
      alerts: row.alerts || [],
    });
  } catch (err) { next(err); }
};

// ═══════════════════════════════════════════════════════════
// UPDATE HAZARD STATUS (verify, resolve, mark false positive)
// ═══════════════════════════════════════════════════════════

// PATCH /assembly/planning/hazards/:id
exports.updateHazard = async (req, res, next) => {
  try {
    const orgId = getOrgId(req);
    const { status, severity, description, verified_by } = req.body;

    const validStatuses = ['active', 'verified', 'resolved', 'false_positive'];
    if (status && !validStatuses.includes(status)) {
      return res.status(400).json({ error: 'Invalid status' });
    }

    const updates = [];
    const params = [];
    let paramCount = 1;

    params.push(orgId);
    paramCount++;

    if (status) { params.push(status); updates.push(`status = $${paramCount++}`); }
    if (severity) { params.push(severity); updates.push(`severity = $${paramCount++}`); }
    if (description) { params.push(description); updates.push(`description = $${paramCount++}`); }
    if (status === 'verified') {
      params.push(req.user.id);
      updates.push(`verified_by = $${paramCount++}`);
      params.push(req.user.name || req.user.email);
      updates.push(`verifier_name = $${paramCount++}`);
    }
    if (status === 'resolved') {
      updates.push(`resolved_at = now()`);
    }
    updates.push(`last_checked_at = now()`);
    updates.push(`updated_at = now()`);

    params.push(req.params.id);

    const result = await db.query(
      `UPDATE environmental_hazards SET ${updates.join(', ')}
       WHERE id = $${paramCount} AND organization_id = $1
       RETURNING *`,
      params
    );

    if (!result.rows[0]) return res.status(404).json({ error: 'Hazard not found' });
    res.json(result.rows[0]);
  } catch (err) { next(err); }
};

// ═══════════════════════════════════════════════════════════
// MANUAL HAZARD REPORT — planner adds a hazard manually
// ═══════════════════════════════════════════════════════════

// POST /assembly/planning/hazards
exports.createHazard = async (req, res, next) => {
  try {
    const orgId = getOrgId(req);
    const {
      hazard_type, severity, lat, lng, boundary, region,
      description, area_sqm, indices, evidence_images,
    } = req.body;

    if (!hazard_type || !HAZARD_CONFIG[hazard_type]) {
      return res.status(400).json({ error: 'Valid hazard_type is required' });
    }
    if (lat == null || lng == null) {
      return res.status(400).json({ error: 'lat and lng are required' });
    }

    const config = HAZARD_CONFIG[hazard_type];
    const geojson = boundary || {
      type: 'Point',
      coordinates: [lng, lat],
    };

    const result = await db.query(
      `INSERT INTO environmental_hazards
         (organization_id, hazard_type, centroid_lat, centroid_lng, boundary, bbox,
          region, area_sqm, severity, confidence, detection_method, indices,
          description, evidence_images, status, detected_by, metadata)
       VALUES ($1, $2, $3, $4,
         ST_SetSRID(ST_GeomFromGeoJSON($5), 4326), $6, $7, $8, $9, 1.0, 'manual', $10,
         $11, $12, 'verified', $13, $14)
       RETURNING id, hazard_type, severity, centroid_lat, centroid_lng, status`,
      [
        orgId, hazard_type, lat, lng, JSON.stringify(geojson),
        null, region || null, area_sqm || null,
        severity || 'moderate',
        JSON.stringify(indices || {}),
        description || config.description,
        JSON.stringify(evidence_images || []),
        req.user.name || req.user.email,
        JSON.stringify({ reported_manually: true, report_date: new Date().toISOString() }),
      ]
    );

    // Emit alert
    bus.emit('hazard:detected', {
      orgId,
      totalHazards: 1,
      hazardsByType: {
        [hazard_type]: { label: config.label, detected_clusters: 1, saved: [result.rows[0]] },
      },
      timestamp: new Date().toISOString(),
    });

    res.status(201).json(result.rows[0]);
  } catch (err) { next(err); }
};

// ═══════════════════════════════════════════════════════════
// GET HAZARD ALERTS (for planner notification panel)
// ═══════════════════════════════════════════════════════════

// GET /assembly/planning/hazard-alerts
exports.listHazardAlerts = async (req, res, next) => {
  try {
    const orgId = getOrgId(req);
    const { unread_only } = req.query;

    let query = `SELECT ha.id, ha.alert_type, ha.title, ha.message, ha.delivery_status,
                        ha.created_at, ha.read_at,
                        eh.hazard_type, eh.severity, eh.centroid_lat, eh.centroid_lng,
                        eh.area_sqm, eh.status as hazard_status, eh.description as hazard_description
                 FROM hazard_alerts ha
                 JOIN environmental_hazards eh ON ha.hazard_id = eh.id
                 WHERE ha.organization_id = $1`;
    const params = [orgId];
    if (unread_only === 'true') {
      query += ' AND ha.read_at IS NULL';
    }
    query += ' ORDER BY ha.created_at DESC LIMIT 100';

    const result = await db.query(query, params);
    res.json(result.rows);
  } catch (err) { next(err); }
};

// PATCH /assembly/planning/hazard-alerts/:id/read
exports.markAlertRead = async (req, res, next) => {
  try {
    const orgId = getOrgId(req);
    await db.query(
      'UPDATE hazard_alerts SET read_at = now(), delivery_status = \'read\' WHERE id = $1 AND organization_id = $2',
      [req.params.id, orgId]
    );
    res.json({ success: true });
  } catch (err) { next(err); }
};

// ═══════════════════════════════════════════════════════════
// GET HAZARD STATS (for dashboard summary)
// ═══════════════════════════════════════════════════════════

// GET /assembly/planning/hazard-stats
exports.getHazardStats = async (req, res, next) => {
  try {
    const orgId = getOrgId(req);

    const [byType, bySeverity, byStatus, recent] = await Promise.all([
      db.query(
        `SELECT hazard_type, COUNT(*) as count, SUM(area_sqm) as total_area
         FROM environmental_hazards WHERE organization_id = $1 AND status IN ('active', 'verified')
         GROUP BY hazard_type`, [orgId]
      ),
      db.query(
        `SELECT severity, COUNT(*) as count
         FROM environmental_hazards WHERE organization_id = $1 AND status IN ('active', 'verified')
         GROUP BY severity`, [orgId]
      ),
      db.query(
        `SELECT status, COUNT(*) as count
         FROM environmental_hazards WHERE organization_id = $1
         GROUP BY status`, [orgId]
      ),
      db.query(
        `SELECT hazard_type, severity, centroid_lat, centroid_lng, area_sqm, detected_at
         FROM environmental_hazards WHERE organization_id = $1
         ORDER BY detected_at DESC LIMIT 10`, [orgId]
      ),
    ]);

    res.json({
      by_type: byType.rows.map(r => ({ ...r, count: parseInt(r.count), total_area: parseFloat(r.total_area) || 0 })),
      by_severity: bySeverity.rows.map(r => ({ ...r, count: parseInt(r.count) })),
      by_status: byStatus.rows.map(r => ({ ...r, count: parseInt(r.count) })),
      recent: recent.rows.map(r => ({
        ...r,
        centroid_lat: parseFloat(r.centroid_lat),
        centroid_lng: parseFloat(r.centroid_lng),
        area_sqm: parseFloat(r.area_sqm) || 0,
      })),
      total_active: byStatus.rows.find(r => r.status === 'active')?.count || 0,
      total_verified: byStatus.rows.find(r => r.status === 'verified')?.count || 0,
    });
  } catch (err) { next(err); }
};

// ═══════════════════════════════════════════════════════════
// FIND NEARBY HAZARDS (for validation report integration)
// ═══════════════════════════════════════════════════════════

// GET /assembly/planning/hazards-nearby?lat=X&lng=Y&radius_km=5
exports.findNearbyHazards = async (req, res, next) => {
  try {
    const orgId = getOrgId(req);
    const { lat, lng, radius_km } = req.query;

    if (!lat || !lng) return res.status(400).json({ error: 'lat and lng are required' });

    const radius = (parseFloat(radius_km) || 5) * 1000;

    const result = await db.query(
      `SELECT id, hazard_type, severity, confidence, description, area_sqm,
              centroid_lat, centroid_lng, detected_at, status,
              ST_DWithin(
                ST_SetSRID(ST_MakePoint($2, $3), 4326)::geography,
                ST_SetSRID(ST_MakePoint(centroid_lng, centroid_lat), 4326)::geography,
                $4
              ) as within_radius,
              ST_Distance(
                ST_SetSRID(ST_MakePoint($2, $3), 4326)::geography,
                ST_SetSRID(ST_MakePoint(centroid_lng, centroid_lat), 4326)::geography
              ) as distance_m
       FROM environmental_hazards
       WHERE organization_id = $1
         AND status IN ('active', 'verified')
         AND ST_DWithin(
                ST_SetSRID(ST_MakePoint($2, $3), 4326)::geography,
                ST_SetSRID(ST_MakePoint(centroid_lng, centroid_lat), 4326)::geography,
                $4
              )
       ORDER BY distance_m ASC
       LIMIT 20`,
      [orgId, parseFloat(lng), parseFloat(lat), radius]
    );

    res.json({
      hazards: result.rows.map(r => ({
        ...r,
        centroid_lat: parseFloat(r.centroid_lat),
        centroid_lng: parseFloat(r.centroid_lng),
        area_sqm: parseFloat(r.area_sqm) || 0,
        distance_m: parseFloat(r.distance_m),
        within_radius: r.within_radius,
      })),
      total: result.rows.length,
      search_center: { lat: parseFloat(lat), lng: parseFloat(lng) },
      radius_km: parseFloat(radius_km) || 5,
    });
  } catch (err) { next(err); }
};

module.exports = exports;
