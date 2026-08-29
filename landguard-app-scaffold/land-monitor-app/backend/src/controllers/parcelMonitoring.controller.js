/**
 * Parcel Monitoring Controller — comprehensive land monitoring endpoints
 * for parcel owners. Provides flood detection, encroachment alerts, LULC
 * classification, fire/burn detection, soil moisture, rainfall context,
 * historical imagery, tree cover loss, land surface temperature, multi-index
 * crop health, water body detection, carbon stock estimation, parcel
 * valuation, and evidence package generation.
 */
const db = require('../config/db');
const { ee, init } = require('../config/earthEngine');
const logger = require('../config/logger');

// ── Helper: get parcel boundary as EE geometry ──
async function getParcel(parcelId, userId, userRole, isSalesManager = false) {
  const result = await db.query(
    `SELECT id, owner_id, name, region, area_sqm, perimeter_m,
            ST_AsGeoJSON(boundary) AS boundary_geojson
     FROM parcels WHERE id = $1`,
    [parcelId]
  );
  const parcel = result.rows[0];
  if (!parcel) return null;
  // Sales managers can monitor any parcel; regular owners only their own
  if (userRole === 'owner' && !isSalesManager && parcel.owner_id !== userId) return null;
  parcel.boundary = JSON.parse(parcel.boundary_geojson);
  return parcel;
}

function boundaryToEE(boundaryGeojson) {
  const coords = boundaryGeojson.coordinates[0];
  const ring = ee.Geometry.LinearRing(coords);
  return ee.Geometry.Polygon([ring]);
}

// ── Helper: EE getInfo as promise (with 30s timeout) ──
function eeInfo(computedObject) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(new Error('Earth Engine request timed out after 30s'));
    }, 30000);

    computedObject.getInfo((data, err) => {
      clearTimeout(timer);
      if (err) reject(err);
      else resolve(data);
    });
  });
}

// ── Helper: EE getMapId as promise ──
function eeMapId(image, visParams) {
  return new Promise((resolve, reject) => {
    image.getMapId(visParams, (result, err) => {
      if (err || !result || !result.mapid) reject(err || new Error('No mapid'));
      else resolve(result);
    });
  });
}

// ═══════════════════════════════════════════════════════════
// 1. FLOOD MONITORING (Sentinel-1 SAR + Sentinel-2 MNDWI)
// ═══════════════════════════════════════════════════════════
exports.floodMonitor = async (req, res, next) => {
  try {
    const parcel = await getParcel(req.params.id, req.user.id, req.user.role, req.user.isSalesManager);
    if (!parcel) return res.status(404).json({ error: 'Parcel not found' });

    const ready = await init();
    if (!ready) return res.json({ floodDetected: false, message: 'Earth Engine not configured' });

    const region = boundaryToEE(parcel.boundary);
    const buffer = region.buffer(200);

    // Sentinel-1 SAR — sees through clouds
    const now = new Date();
    const dateEnd = now.toISOString().slice(0, 10);
    const dateStart = new Date(now.getTime() - 14 * 86400000).toISOString().slice(0, 10);

    const s1 = ee.ImageCollection('COPERNICUS/S1_GRD')
      .filterDate(dateStart, dateEnd)
      .filterBounds(buffer)
      .filter(ee.Filter.eq('instrumentMode', 'IW'))
      .filter(ee.Filter.listContains('transmitterReceiverPolarisation', 'VV'))
      .select('VV');

    const s1Image = s1.mean();
    const backscatter = s1Image.reduceRegion({
      reducer: ee.Reducer.mean(),
      geometry: region,
      scale: 10,
      maxPixels: 1e9,
    });

    // Also check MNDWI from Sentinel-2
    const s2 = ee.ImageCollection('COPERNICUS/S2_HARMONIZED')
      .filterDate(dateStart, dateEnd)
      .filter(ee.Filter.lt('CLOUDY_PIXEL_PERCENTAGE', 30))
      .filterBounds(buffer);
    const s2Image = s2.median();
    const mndwi = s2Image.normalizedDifference(['B3', 'B11']).rename('mndwi');
    const mndwiVal = mndwi.reduceRegion({
      reducer: ee.Reducer.mean(),
      geometry: region,
      scale: 10,
      maxPixels: 1e9,
    });

    const [backscatterInfo, mndwiInfo] = await Promise.all([
      eeInfo(backscatter),
      eeInfo(mndwiVal),
    ]);

    const vv = backscatterInfo.VV;
    const waterIndex = mndwiInfo.mndwi;
    const floodDetected = (vv != null && vv < -18) || (waterIndex != null && waterIndex > 0.2);

    res.json({
      floodDetected,
      sarBackscatter: vv != null ? Number(vv.toFixed(2)) : null,
      mndwi: waterIndex != null ? Number(waterIndex.toFixed(3)) : null,
      dateRange: { start: dateStart, end: dateEnd },
      interpretation: floodDetected
        ? 'Potential flooding detected on or near your parcel. SAR backscatter and/or water index suggest standing water. Check the area immediately.'
        : 'No flooding detected in the last 14 days. The parcel appears dry based on satellite radar and optical imagery.',
    });
  } catch (err) {
    logger.error('[Monitoring] %s', err.message);
    next(err);
  }
};

// ═══════════════════════════════════════════════════════════
// 2. BOUNDARY ENCROACHMENT DETECTION
// ═══════════════════════════════════════════════════════════
exports.encroachmentCheck = async (req, res, next) => {
  try {
    const parcel = await getParcel(req.params.id, req.user.id, req.user.role, req.user.isSalesManager);
    if (!parcel) return res.status(404).json({ error: 'Parcel not found' });

    // Find buildings whose footprint intersects the parcel boundary
    // (within 10m buffer of the boundary line, excluding buildings fully inside)
    const result = await db.query(
      `WITH boundary_line AS (
        SELECT ST_Boundary(boundary) AS bl FROM parcels WHERE id = $1
      )
      SELECT b.id, b.area_sqm, b.estimated_height_m, b.estimated_floors,
             b.status, b.detected_at,
             ST_Distance(b.footprint, (SELECT bl FROM boundary_line)) AS distance_m,
             ST_AsGeoJSON(b.footprint) AS footprint_geojson,
             ST_AsGeoJSON(ST_Centroid(b.footprint)) AS centroid_geojson
       FROM buildings b
       WHERE (b.parcel_id IS NULL OR b.parcel_id != $1)
       AND ST_DWithin(b.footprint, (SELECT bl FROM boundary_line), 15)
       ORDER BY distance_m ASC
       LIMIT 20`,
      [req.params.id]
    );

    const encroachments = result.rows.map((r) => ({
      ...r,
      area_sqm: r.area_sqm != null ? Number(r.area_sqm) : null,
      estimated_height_m: r.estimated_height_m != null ? Number(r.estimated_height_m) : null,
      distance_m: r.distance_m != null ? Number(r.distance_m).toFixed(1) : null,
      footprint: r.footprint_geojson ? JSON.parse(r.footprint_geojson) : null,
      centroid: r.centroid_geojson ? JSON.parse(r.centroid_geojson) : null,
      footprint_geojson: undefined,
      centroid_geojson: undefined,
    }));

    res.json({
      encroachments,
      count: encroachments.length,
      hasEncroachment: encroachments.length > 0,
      interpretation: encroachments.length > 0
        ? `${encroachments.length} structure(s) detected within 15m of your boundary. These may indicate encroachment by adjacent landowners. Consider a field visit to verify.`
        : 'No structures detected near your boundary. Your parcel borders appear clear of encroachment.',
    });
  } catch (err) {
    logger.error('[Monitoring] %s', err.message);
    next(err);
  }
};

// ═══════════════════════════════════════════════════════════
// 3. LAND USE / LAND COVER CLASSIFICATION
// ═══════════════════════════════════════════════════════════
exports.lulcClassify = async (req, res, next) => {
  try {
    const parcel = await getParcel(req.params.id, req.user.id, req.user.role, req.user.isSalesManager);
    if (!parcel) return res.status(404).json({ error: 'Parcel not found' });

    const ready = await init();
    if (!ready) return res.json({ classes: [], message: 'Earth Engine not configured' });

    const region = boundaryToEE(parcel.boundary);
    const now = new Date();
    const dateEnd = now.toISOString().slice(0, 10);
    const dateStart = new Date(now.getTime() - 90 * 86400000).toISOString().slice(0, 10);

    const image = ee.ImageCollection('COPERNICUS/S2_HARMONIZED')
      .filterDate(dateStart, dateEnd)
      .filter(ee.Filter.lt('CLOUDY_PIXEL_PERCENTAGE', 20))
      .filterBounds(region)
      .median();

    // Compute multiple indices for classification
    const ndvi = image.normalizedDifference(['B8', 'B4']).rename('ndvi');
    const ndbi = image.normalizedDifference(['B11', 'B8']).rename('ndbi');
    const mndwi = image.normalizedDifference(['B3', 'B11']).rename('mndwi');
    const ndmi = image.normalizedDifference(['B8', 'B11']).rename('ndmi');

    // Simple threshold-based LULC classification
    const lulc = ee.Image(0).where(mndwi.gt(0.2), 5) // Water
      .where(ndbi.gt(0.05).and(ndvi.lt(0.2)), 4) // Built-up
      .where(ndvi.lt(0.1).and(mndwi.lt(0)), 3) // Bare soil
      .where(ndvi.gte(0.1).and(ndvi.lt(0.3)), 2) // Sparse veg / grassland
      .where(ndvi.gte(0.3).and(ndvi.lt(0.6)), 1) // Moderate veg / cropland
      .where(ndvi.gte(0.6), 0) // Dense veg / forest
      .rename('lulc');

    // Compute area for each class within the parcel
    const pixelArea = ee.Image.pixelArea();
    const classAreas = lulc.addBands(pixelArea).reduceRegion({
      reducer: ee.Reducer.sum().group({
        groupField: 0,
        groupName: 'class',
      }),
      geometry: region,
      scale: 10,
      maxPixels: 1e9,
    });

    const areaInfo = await eeInfo(classAreas);
    const groups = areaInfo.groups || [];

    const classNames = ['Dense Vegetation / Forest', 'Moderate Vegetation / Cropland', 'Sparse Vegetation / Grassland', 'Bare Soil', 'Built-up', 'Water'];
    const classColors = ['#166534', '#84cc16', '#fbbf24', '#8b4513', '#6b7280', '#3b82f6'];

    const classes = groups.map((g) => ({
      classId: g.class,
      name: classNames[g.class] || 'Unknown',
      color: classColors[g.class] || '#999',
      area_sqm: Math.round(g.sum || 0),
      area_pct: parcel.area_sqm > 0 ? ((g.sum || 0) / parcel.area_sqm * 100).toFixed(1) : '0',
    })).filter(c => c.area_sqm > 0).sort((a, b) => b.area_sqm - a.area_sqm);

    res.json({
      classes,
      dateRange: { start: dateStart, end: dateEnd },
      interpretation: classes.length > 0
        ? `Your parcel is composed of: ${classes.map(c => `${c.name} (${c.area_pct}%)`).join(', ')}.`
        : 'Unable to classify land cover for this parcel.',
    });
  } catch (err) {
    logger.error('[Monitoring] %s', err.message);
    next(err);
  }
};

// ═══════════════════════════════════════════════════════════
// 4. FIRE / BURN DETECTION (NBR + BAI)
// ═══════════════════════════════════════════════════════════
exports.fireDetect = async (req, res, next) => {
  try {
    const parcel = await getParcel(req.params.id, req.user.id, req.user.role, req.user.isSalesManager);
    if (!parcel) return res.status(404).json({ error: 'Parcel not found' });

    const ready = await init();
    if (!ready) return res.json({ burnDetected: false, message: 'Earth Engine not configured' });

    const region = boundaryToEE(parcel.boundary);
    const now = new Date();
    const dateEnd = now.toISOString().slice(0, 10);
    const dateStart = new Date(now.getTime() - 30 * 86400000).toISOString().slice(0, 10);

    const image = ee.ImageCollection('COPERNICUS/S2_HARMONIZED')
      .filterDate(dateStart, dateEnd)
      .filter(ee.Filter.lt('CLOUDY_PIXEL_PERCENTAGE', 30))
      .filterBounds(region)
      .median();

    // NBR = (NIR - SWIR2) / (NIR + SWIR2) — low values = burned
    const nbr = image.normalizedDifference(['B8', 'B12']).rename('nbr');
    // BAI = 1 / ((0.1 - Red)^2 + (0.06 - NIR)^2) — high values = burned
    const bai = image.expression(
      '1 / ((0.1 - RED) ** 2 + (0.06 - NIR) ** 2)',
      { RED: image.select('B4'), NIR: image.select('B8') }
    ).rename('bai');

    const nbrVal = nbr.reduceRegion({ reducer: ee.Reducer.mean(), geometry: region, scale: 10, maxPixels: 1e9 });
    const baiVal = bai.reduceRegion({ reducer: ee.Reducer.mean(), geometry: region, scale: 10, maxPixels: 1e9 });

    const [nbrInfo, baiInfo] = await Promise.all([eeInfo(nbrVal), eeInfo(baiVal)]);

    const nbrMean = nbrInfo.nbr;
    const baiMean = baiInfo.bai;
    const burnDetected = (nbrMean != null && nbrMean < -0.1) || (baiMean != null && baiMean > 50);

    res.json({
      burnDetected,
      nbr: nbrMean != null ? Number(nbrMean.toFixed(3)) : null,
      bai: baiMean != null ? Number(baiMean.toFixed(2)) : null,
      dateRange: { start: dateStart, end: dateEnd },
      interpretation: burnDetected
        ? 'Burn scar detected on your parcel. This may indicate wildfire, agricultural burning, or slash-and-burn activity. Check the area and report any unauthorized burning.'
        : 'No burn scars detected in the last 30 days. Your parcel appears free of fire damage.',
    });
  } catch (err) {
    logger.error('[Monitoring] %s', err.message);
    next(err);
  }
};

// ═══════════════════════════════════════════════════════════
// 5. SOIL MOISTURE (Sentinel-1 SAR backscatter)
// ═══════════════════════════════════════════════════════════
exports.soilMoisture = async (req, res, next) => {
  try {
    const parcel = await getParcel(req.params.id, req.user.id, req.user.role, req.user.isSalesManager);
    if (!parcel) return res.status(404).json({ error: 'Parcel not found' });

    const ready = await init();
    if (!ready) return res.json({ soilMoisture: null, message: 'Earth Engine not configured' });

    const region = boundaryToEE(parcel.boundary);
    const now = new Date();
    const dateEnd = now.toISOString().slice(0, 10);
    const dateStart = new Date(now.getTime() - 14 * 86400000).toISOString().slice(0, 10);

    const s1 = ee.ImageCollection('COPERNICUS/S1_GRD')
      .filterDate(dateStart, dateEnd)
      .filterBounds(region)
      .filter(ee.Filter.eq('instrumentMode', 'IW'))
      .select(['VV', 'VH']);

    const s1Image = s1.mean();
    const vv = s1Image.select('VV').reduceRegion({ reducer: ee.Reducer.mean(), geometry: region, scale: 10, maxPixels: 1e9 });
    const vh = s1Image.select('VH').reduceRegion({ reducer: ee.Reducer.mean(), geometry: region, scale: 10, maxPixels: 1e9 });

    const [vvInfo, vhInfo] = await Promise.all([eeInfo(vv), eeInfo(vh)]);

    const vvVal = vvInfo.VV;
    const vhVal = vhInfo.VH;
    const ratio = (vvVal != null && vhVal != null) ? vvVal - vhVal : null;

    // Rough soil moisture estimate from backscatter
    // Higher backscatter = higher moisture
    let moistureLevel = 'unknown';
    if (vvVal != null) {
      if (vvVal < -20) moistureLevel = 'dry';
      else if (vvVal < -15) moistureLevel = 'moderate';
      else if (vvVal < -10) moistureLevel = 'moist';
      else moistureLevel = 'wet';
    }

    res.json({
      vvBackscatter: vvVal != null ? Number(vvVal.toFixed(2)) : null,
      vhBackscatter: vhVal != null ? Number(vhVal.toFixed(2)) : null,
      vvVhRatio: ratio != null ? Number(ratio.toFixed(2)) : null,
      moistureLevel,
      dateRange: { start: dateStart, end: dateEnd },
      interpretation: `Soil moisture appears ${moistureLevel}. ${
        moistureLevel === 'dry' ? 'Consider irrigation if crops are present. Drought stress likely.' :
        moistureLevel === 'moderate' ? 'Soil has some moisture but may need watering soon.' :
        moistureLevel === 'moist' ? 'Soil moisture is adequate for most crops and vegetation.' :
        moistureLevel === 'wet' ? 'Soil is saturated. Ensure drainage to prevent waterlogging.' :
        'Unable to determine soil moisture from available data.'
      }`,
    });
  } catch (err) {
    logger.error('[Monitoring] %s', err.message);
    next(err);
  }
};

// ═══════════════════════════════════════════════════════════
// 6. RAINFALL CONTEXT (CHIRPS via Earth Engine)
// ═══════════════════════════════════════════════════════════
exports.rainfall = async (req, res, next) => {
  try {
    const parcel = await getParcel(req.params.id, req.user.id, req.user.role, req.user.isSalesManager);
    if (!parcel) return res.status(404).json({ error: 'Parcel not found' });

    const ready = await init();
    if (!ready) return res.json({ rainfall: null, message: 'Earth Engine not configured' });

    const region = boundaryToEE(parcel.boundary);
    const now = new Date();
    const dateEnd = now.toISOString().slice(0, 10);
    const dateStart30 = new Date(now.getTime() - 30 * 86400000).toISOString().slice(0, 10);
    const dateStart90 = new Date(now.getTime() - 90 * 86400000).toISOString().slice(0, 10);
    const dateStartHist = new Date(now.getTime() - 365 * 86400000).toISOString().slice(0, 10);

    // CHIRPS daily rainfall
    const chirps30 = ee.ImageCollection('UCSB-CHG/CHIRPS/DAILY')
      .filterDate(dateStart30, dateEnd).filterBounds(region).sum();
    const chirps90 = ee.ImageCollection('UCSB-CHG/CHIRPS/DAILY')
      .filterDate(dateStart90, dateEnd).filterBounds(region).sum();
    const chirpsHist = ee.ImageCollection('UCSB-CHG/CHIRPS/DAILY')
      .filterDate(dateStartHist, dateEnd).filterBounds(region).sum();

    const [r30, r90, rHist] = await Promise.all([
      eeInfo(chirps30.reduceRegion({ reducer: ee.Reducer.mean(), geometry: region, scale: 5000, maxPixels: 1e9 })),
      eeInfo(chirps90.reduceRegion({ reducer: ee.Reducer.mean(), geometry: region, scale: 5000, maxPixels: 1e9 })),
      eeInfo(chirpsHist.reduceRegion({ reducer: ee.Reducer.mean(), geometry: region, scale: 5000, maxPixels: 1e9 })),
    ]);

    const rainfall30 = r30.precipitation ? Number(r30.precipitation.toFixed(1)) : null;
    const rainfall90 = r90.precipitation ? Number(r90.precipitation.toFixed(1)) : null;
    const rainfall365 = rHist.precipitation ? Number(rHist.precipitation.toFixed(1)) : null;

    // Historical average for same 30-day period (last 10 years)
    const histStart = new Date(now.getFullYear() - 10, now.getMonth(), now.getDate() - 30).toISOString().slice(0, 10);
    const histEnd = new Date(now.getFullYear() - 10, now.getMonth(), now.getDate()).toISOString().slice(0, 10);
    let histAvg = null;
    try {
      const chirpsHistAvg = ee.ImageCollection('UCSB-CHG/CHIRPS/DAILY')
        .filterDate(histStart, histEnd).filterBounds(region).sum();
      const histInfo = await eeInfo(chirpsHistAvg.reduceRegion({ reducer: ee.Reducer.mean(), geometry: region, scale: 5000, maxPixels: 1e9 }));
      histAvg = histInfo.precipitation ? Number(histInfo.precipitation.toFixed(1)) : null;
    } catch (e) { /* ignore historical error */ }

    const belowNormal = histAvg != null && rainfall30 != null && rainfall30 < histAvg * 0.7;
    const aboveNormal = histAvg != null && rainfall30 != null && rainfall30 > histAvg * 1.3;

    res.json({
      rainfall30mm: rainfall30,
      rainfall90mm: rainfall90,
      rainfall365mm: rainfall365,
      historicalAvg30mm: histAvg,
      belowNormal,
      aboveNormal,
      interpretation: belowNormal
        ? `Rainfall this month (${rainfall30}mm) is significantly below the historical average (${histAvg}mm). This explains any NDVI decline and indicates drought conditions. Consider irrigation.`
        : aboveNormal
        ? `Rainfall this month (${rainfall30}mm) is above the historical average (${histAvg}mm). Vegetation should be thriving. Watch for waterlogging in low-lying areas.`
        : `Rainfall this month (${rainfall30}mm) is near the historical average (${histAvg != null ? histAvg + 'mm' : 'unknown'}). Conditions are normal for this season.`,
    });
  } catch (err) {
    logger.error('[Monitoring] %s', err.message);
    next(err);
  }
};

// ═══════════════════════════════════════════════════════════
// 7. HISTORICAL IMAGERY COMPARISON (Landsat time series)
// ═══════════════════════════════════════════════════════════
exports.historicalImagery = async (req, res, next) => {
  try {
    const parcel = await getParcel(req.params.id, req.user.id, req.user.role, req.user.isSalesManager);
    if (!parcel) return res.status(404).json({ error: 'Parcel not found' });

    const ready = await init();
    if (!ready) return res.json({ snapshots: [], message: 'Earth Engine not configured' });

    const region = boundaryToEE(parcel.boundary);
    const now = new Date();
    const snapshots = [];

    // Generate snapshots at 6-month intervals for the last 3 years
    const intervals = [
      { label: '3 years ago', start: new Date(now.getFullYear() - 3, 0, 1), end: new Date(now.getFullYear() - 3, 5, 30) },
      { label: '2 years ago', start: new Date(now.getFullYear() - 2, 0, 1), end: new Date(now.getFullYear() - 2, 5, 30) },
      { label: '1 year ago', start: new Date(now.getFullYear() - 1, 0, 1), end: new Date(now.getFullYear() - 1, 5, 30) },
      { label: '6 months ago', start: new Date(now.getTime() - 180 * 86400000), end: new Date(now.getTime() - 150 * 86400000) },
      { label: 'Recent', start: new Date(now.getTime() - 60 * 86400000), end: now },
    ];

    for (const interval of intervals) {
      try {
        const collection = ee.ImageCollection('COPERNICUS/S2_HARMONIZED')
          .filterDate(interval.start.toISOString().slice(0, 10), interval.end.toISOString().slice(0, 10))
          .filter(ee.Filter.lt('CLOUDY_PIXEL_PERCENTAGE', 20))
          .filterBounds(region);
        const image = collection.median().visualize({ bands: ['B4', 'B3', 'B2'], min: 0, max: 3000, gamma: 1.4 });
        const result = await eeMapId(image, { min: 0, max: 255 });
        const ndvi = collection.median().normalizedDifference(['B8', 'B4']).rename('ndvi');
        const ndviVal = await eeInfo(ndvi.reduceRegion({ reducer: ee.Reducer.mean(), geometry: region, scale: 10, maxPixels: 1e9 }));
        snapshots.push({
          label: interval.label,
          date: interval.start.toISOString().slice(0, 10),
          tileUrl: result.urlFormat || `https://earthengine.googleapis.com/v1/${result.mapid}/tiles/{z}/{x}/{y}`,
          ndvi: ndviVal.ndvi != null ? Number(ndviVal.ndvi.toFixed(3)) : null,
        });
      } catch (e) { /* skip failed snapshots */ }
    }

    res.json({
      snapshots,
      interpretation: snapshots.length > 1
        ? `${snapshots.length} historical snapshots available. Compare them to see how your land has changed over time.`
        : 'Limited historical imagery available for this location.',
    });
  } catch (err) {
    logger.error('[Monitoring] %s', err.message);
    next(err);
  }
};

// ═══════════════════════════════════════════════════════════
// 8. TREE COVER LOSS (Hansen Global Forest Change)
// ═══════════════════════════════════════════════════════════
exports.treeCoverLoss = async (req, res, next) => {
  try {
    const parcel = await getParcel(req.params.id, req.user.id, req.user.role, req.user.isSalesManager);
    if (!parcel) return res.status(404).json({ error: 'Parcel not found' });

    const ready = await init();
    if (!ready) return res.json({ treeCoverLoss: null, message: 'Earth Engine not configured' });

    const region = boundaryToEE(parcel.boundary);

    // Hansen Global Forest Change 2023
    const gfc = ee.Image('UMD/hansen/global_forest_change_2023_v1_11');
    const treecover2000 = gfc.select('treecover2000');
    const loss = gfc.select('loss');
    const lossYear = gfc.select('lossyear');

    // Tree cover in 2000 within parcel
    const treeArea = treecover2000.gte(30).multiply(ee.Image.pixelArea());
    const treeInfo = await eeInfo(treeArea.reduceRegion({ reducer: ee.Reducer.sum(), geometry: region, scale: 30, maxPixels: 1e9 }));
    const treeCover2000_sqm = treeInfo.sum ? Math.round(treeInfo.sum) : 0;

    // Total loss area
    const lossArea = loss.eq(1).multiply(ee.Image.pixelArea());
    const lossInfo = await eeInfo(lossArea.reduceRegion({ reducer: ee.Reducer.sum(), geometry: region, scale: 30, maxPixels: 1e9 }));
    const lossArea_sqm = lossInfo.sum ? Math.round(lossInfo.sum) : 0;

    // Loss by year
    const lossByYear = {};
    for (let y = 1; y <= 23; y++) {
      const yearLoss = lossYear.eq(y).multiply(ee.Image.pixelArea());
      const yearInfo = await eeInfo(yearLoss.reduceRegion({ reducer: ee.Reducer.sum(), geometry: region, scale: 30, maxPixels: 1e9 }));
      if (yearInfo.sum && yearInfo.sum > 0) {
        lossByYear[2000 + y] = Math.round(yearInfo.sum);
      }
    }

    const recentLoss = Object.entries(lossByYear).filter(([y]) => parseInt(y) >= new Date().getFullYear() - 3);

    res.json({
      treeCover2000_sqm,
      totalLoss_sqm: lossArea_sqm,
      lossByYear,
      recentLoss_sqm: recentLoss.reduce((sum, [, a]) => sum + a, 0),
      hasRecentLoss: recentLoss.length > 0,
      interpretation: recentLoss.length > 0
        ? `Tree cover loss detected in recent years: ${recentLoss.map(([y, a]) => `${y}: ${(a / 10000).toFixed(2)}ha`).join(', ')}. This may indicate illegal logging or land clearing. Investigate immediately.`
        : treeCover2000_sqm > 0
        ? `Your parcel had ${(treeCover2000_sqm / 10000).toFixed(2)}ha of tree cover in 2000. Total loss: ${(lossArea_sqm / 10000).toFixed(2)}ha. No recent loss detected.`
        : 'Your parcel did not have significant tree cover (>=30% canopy) in 2000. Tree cover loss monitoring is most relevant for forested areas.',
    });
  } catch (err) {
    logger.error('[Monitoring] %s', err.message);
    next(err);
  }
};

// ═══════════════════════════════════════════════════════════
// 9. LAND SURFACE TEMPERATURE (Landsat-8 thermal)
// ═══════════════════════════════════════════════════════════
exports.landSurfaceTemp = async (req, res, next) => {
  try {
    const parcel = await getParcel(req.params.id, req.user.id, req.user.role, req.user.isSalesManager);
    if (!parcel) return res.status(404).json({ error: 'Parcel not found' });

    const ready = await init();
    if (!ready) return res.json({ lst: null, message: 'Earth Engine not configured' });

    const region = boundaryToEE(parcel.boundary);
    const now = new Date();
    const dateEnd = now.toISOString().slice(0, 10);
    const dateStart = new Date(now.getTime() - 90 * 86400000).toISOString().slice(0, 10);

    const landsat = ee.ImageCollection('LANDSAT/LC08/C02/T1_L2')
      .filterDate(dateStart, dateEnd)
      .filterBounds(region)
      .filter(ee.Filter.lt('CLOUD_COVER', 30));

    // Check if any imagery exists by getting collection size
    const countInfo = await eeInfo(landsat.size());
    if (!countInfo || countInfo === 0) {
      return res.json({ lst: null, message: 'No Landsat imagery available in the last 90 days' });
    }

    const image = landsat.sort('CLOUD_COVER', true).first();

    // Compute LST from thermal band (ST_B10)
    const lst = image.select('ST_B10').multiply(0.00341802).add(149.0).subtract(273.15);
    const lstVal = await eeInfo(lst.reduceRegion({ reducer: ee.Reducer.mean(), geometry: region, scale: 100, maxPixels: 1e9 }));

    const tempC = lstVal.ST_B10 != null ? Number(lstVal.ST_B10.toFixed(1)) : null;

    // Also compute for surrounding area (1km buffer) for comparison
    const bufferRegion = region.buffer(1000);
    const bufferLst = await eeInfo(lst.reduceRegion({ reducer: ee.Reducer.mean(), geometry: bufferRegion, scale: 100, maxPixels: 1e9 }));
    const bufferTempC = bufferLst.ST_B10 != null ? Number(bufferLst.ST_B10.toFixed(1)) : null;

    const heatIsland = tempC != null && bufferTempC != null ? Number((tempC - bufferTempC).toFixed(1)) : null;

    res.json({
      lstCelsius: tempC,
      surroundingLstCelsius: bufferTempC,
      heatIslandEffect: heatIsland,
      dateRange: { start: dateStart, end: dateEnd },
      interpretation: tempC != null
        ? `Land surface temperature: ${tempC}°C. ${
            heatIsland != null && heatIsland > 2
            ? `Your parcel is ${heatIsland}°C hotter than the surrounding area — possible urban heat island or bare soil effect. Tree planting could reduce this.`
            : heatIsland != null && heatIsland < -2
            ? `Your parcel is ${Math.abs(heatIsland)}°C cooler than surroundings — likely due to vegetation cover.`
            : 'Temperature is similar to the surrounding area.'
          }`
        : 'Unable to compute land surface temperature from available Landsat imagery.',
    });
  } catch (err) {
    logger.error('[Monitoring] %s', err.message);
    next(err);
  }
};

// ═══════════════════════════════════════════════════════════
// 10. MULTI-INDEX CROP HEALTH (EVI, NDRE, SAVI, GNDVI)
// ═══════════════════════════════════════════════════════════
exports.multiIndex = async (req, res, next) => {
  try {
    const parcel = await getParcel(req.params.id, req.user.id, req.user.role, req.user.isSalesManager);
    if (!parcel) return res.status(404).json({ error: 'Parcel not found' });

    const ready = await init();
    if (!ready) return res.json({ indices: [], message: 'Earth Engine not configured' });

    const region = boundaryToEE(parcel.boundary);
    const now = new Date();
    const dateEnd = now.toISOString().slice(0, 10);
    const dateStart = new Date(now.getTime() - 30 * 86400000).toISOString().slice(0, 10);

    const image = ee.ImageCollection('COPERNICUS/S2_HARMONIZED')
      .filterDate(dateStart, dateEnd)
      .filter(ee.Filter.lt('CLOUDY_PIXEL_PERCENTAGE', 20))
      .filterBounds(region)
      .median();

    const ndvi = image.normalizedDifference(['B8', 'B4']).rename('ndvi');
    const evi = image.expression(
      '2.5 * ((NIR - RED) / (NIR + 6 * RED - 7.5 * BLUE + 1))',
      { NIR: image.select('B8'), RED: image.select('B4'), BLUE: image.select('B2') }
    ).rename('evi');
    const savi = image.expression(
      '((NIR - RED) / (NIR + RED + 0.5)) * 1.5',
      { NIR: image.select('B8'), RED: image.select('B4') }
    ).rename('savi');
    const gndvi = image.normalizedDifference(['B8', 'B3']).rename('gndvi');
    const ndre = image.normalizedDifference(['B8', 'B5']).rename('ndre');

    const [ndviInfo, eviInfo, saviInfo, gndviInfo, ndreInfo] = await Promise.all([
      eeInfo(ndvi.reduceRegion({ reducer: ee.Reducer.mean(), geometry: region, scale: 10, maxPixels: 1e9 })),
      eeInfo(evi.reduceRegion({ reducer: ee.Reducer.mean(), geometry: region, scale: 10, maxPixels: 1e9 })),
      eeInfo(savi.reduceRegion({ reducer: ee.Reducer.mean(), geometry: region, scale: 10, maxPixels: 1e9 })),
      eeInfo(gndvi.reduceRegion({ reducer: ee.Reducer.mean(), geometry: region, scale: 10, maxPixels: 1e9 })),
      eeInfo(ndre.reduceRegion({ reducer: ee.Reducer.mean(), geometry: region, scale: 10, maxPixels: 1e9 })),
    ]);

    const indices = [
      {
        name: 'NDVI', value: ndviInfo.ndvi != null ? Number(ndviInfo.ndvi.toFixed(3)) : null,
        label: 'Normalized Difference Vegetation Index',
        interpretation: ndviInfo.ndvi != null ? (ndviInfo.ndvi > 0.5 ? 'Healthy dense vegetation' : ndviInfo.ndvi > 0.3 ? 'Moderate vegetation' : ndviInfo.ndvi > 0.1 ? 'Sparse vegetation' : 'Bare soil or built-up') : 'N/A',
      },
      {
        name: 'EVI', value: eviInfo.evi != null ? Number(eviInfo.evi.toFixed(3)) : null,
        label: 'Enhanced Vegetation Index',
        interpretation: eviInfo.evi != null ? (eviInfo.evi > 0.4 ? 'High biomass, actively growing' : eviInfo.evi > 0.2 ? 'Moderate biomass' : 'Low biomass or stressed') : 'N/A',
      },
      {
        name: 'SAVI', value: saviInfo.savi != null ? Number(saviInfo.savi.toFixed(3)) : null,
        label: 'Soil-Adjusted Vegetation Index',
        interpretation: saviInfo.savi != null ? (saviInfo.savi > 0.4 ? 'Good vegetation with soil background corrected' : 'Low vegetation, soil influence high') : 'N/A',
      },
      {
        name: 'GNDVI', value: gndviInfo.gndvi != null ? Number(gndviInfo.gndvi.toFixed(3)) : null,
        label: 'Green NDVI (Chlorophyll)',
        interpretation: gndviInfo.gndvi != null ? (gndviInfo.gndvi > 0.5 ? 'High chlorophyll content' : gndviInfo.gndvi > 0.3 ? 'Moderate chlorophyll' : 'Low chlorophyll, possible nutrient deficiency') : 'N/A',
      },
      {
        name: 'NDRE', value: ndreInfo.ndre != null ? Number(ndreInfo.ndre.toFixed(3)) : null,
        label: 'Red Edge (Nitrogen Stress)',
        interpretation: ndreInfo.ndre != null ? (ndreInfo.ndre > 0.3 ? 'Sufficient nitrogen' : ndreInfo.ndre > 0.1 ? 'Moderate nitrogen' : 'Nitrogen deficiency likely — consider fertilization') : 'N/A',
      },
    ];

    res.json({
      indices: indices.filter(i => i.value != null),
      dateRange: { start: dateStart, end: dateEnd },
      interpretation: `${indices.filter(i => i.value != null).length} vegetation indices computed. Cross-reference them: if NDVI is moderate but NDRE is low, nitrogen fertilizer may help. If EVI is lower than NDVI, vegetation may be sparse or young.`,
    });
  } catch (err) {
    logger.error('[Monitoring] %s', err.message);
    next(err);
  }
};

// ═══════════════════════════════════════════════════════════
// 11. WATER BODY / WELL DETECTION (MNDWI + SAR)
// ═══════════════════════════════════════════════════════════
exports.waterDetect = async (req, res, next) => {
  try {
    const parcel = await getParcel(req.params.id, req.user.id, req.user.role, req.user.isSalesManager);
    if (!parcel) return res.status(404).json({ error: 'Parcel not found' });

    const ready = await init();
    if (!ready) return res.json({ waterDetected: false, message: 'Earth Engine not configured' });

    const region = boundaryToEE(parcel.boundary);
    const buffer = region.buffer(500); // Check 500m around parcel for water access

    const now = new Date();
    const dateEnd = now.toISOString().slice(0, 10);
    const dateStart = new Date(now.getTime() - 90 * 86400000).toISOString().slice(0, 10);

    const image = ee.ImageCollection('COPERNICUS/S2_HARMONIZED')
      .filterDate(dateStart, dateEnd)
      .filter(ee.Filter.lt('CLOUDY_PIXEL_PERCENTAGE', 20))
      .filterBounds(buffer)
      .median();

    const mndwi = image.normalizedDifference(['B3', 'B11']);
    const waterMask = mndwi.gt(0.2);

    // Water within parcel
    const waterInParcel = waterMask.multiply(ee.Image.pixelArea());
    const parcelWaterInfo = await eeInfo(waterInParcel.reduceRegion({ reducer: ee.Reducer.sum(), geometry: region, scale: 10, maxPixels: 1e9 }));
    const waterAreaInParcel = parcelWaterInfo.sum ? Math.round(parcelWaterInfo.sum) : 0;

    // Water within 500m buffer (water access)
    const waterInBuffer = waterMask.multiply(ee.Image.pixelArea());
    const bufferWaterInfo = await eeInfo(waterInBuffer.reduceRegion({ reducer: ee.Reducer.sum(), geometry: buffer, scale: 10, maxPixels: 1e9 }));
    const waterAreaInBuffer = bufferWaterInfo.sum ? Math.round(bufferWaterInfo.sum) : 0;

    res.json({
      waterInParcel_sqm: waterAreaInParcel,
      waterWithin500m_sqm: waterAreaInBuffer,
      hasWaterOnParcel: waterAreaInParcel > 100,
      hasWaterNearby: waterAreaInBuffer > 500,
      interpretation: waterAreaInParcel > 100
        ? `Water body detected on your parcel (~${(waterAreaInParcel / 10000).toFixed(2)}ha). This could be a pond, stream, or seasonal water feature. Water access increases land value.`
        : waterAreaInBuffer > 500
        ? `Water body detected within 500m of your parcel (~${(waterAreaInBuffer / 10000).toFixed(2)}ha). You have nearby water access for irrigation or livestock.`
        : 'No significant water bodies detected on or near your parcel. Consider rainwater harvesting or well installation for water supply.',
    });
  } catch (err) {
    logger.error('[Monitoring] %s', err.message);
    next(err);
  }
};

// ═══════════════════════════════════════════════════════════
// 12. CARBON STOCK ESTIMATION
// ═══════════════════════════════════════════════════════════
exports.carbonStock = async (req, res, next) => {
  try {
    const parcel = await getParcel(req.params.id, req.user.id, req.user.role, req.user.isSalesManager);
    if (!parcel) return res.status(404).json({ error: 'Parcel not found' });

    const ready = await init();
    if (!ready) return res.json({ carbonStock: null, message: 'Earth Engine not configured' });

    const region = boundaryToEE(parcel.boundary);
    const now = new Date();
    const dateEnd = now.toISOString().slice(0, 10);
    const dateStart = new Date(now.getTime() - 90 * 86400000).toISOString().slice(0, 10);

    const image = ee.ImageCollection('COPERNICUS/S2_HARMONIZED')
      .filterDate(dateStart, dateEnd)
      .filter(ee.Filter.lt('CLOUDY_PIXEL_PERCENTAGE', 20))
      .filterBounds(region)
      .median();

    const ndvi = image.normalizedDifference(['B8', 'B4']).rename('ndvi');
    const ndmi = image.normalizedDifference(['B8', 'B11']).rename('ndmi');

    const [ndviInfo, ndmiInfo] = await Promise.all([
      eeInfo(ndvi.reduceRegion({ reducer: ee.Reducer.mean(), geometry: region, scale: 10, maxPixels: 1e9 })),
      eeInfo(ndmi.reduceRegion({ reducer: ee.Reducer.mean(), geometry: region, scale: 10, maxPixels: 1e9 })),
    ]);

    const ndviMean = ndviInfo.ndvi || 0;
    const ndmiMean = ndmiInfo.ndmi || 0;

    // Rough above-ground biomass (AGB) estimation from NDVI
    // Using a simplified relationship: AGB (t/ha) ≈ NDVI * 200 for tropical regions
    const agb_t_ha = Math.max(0, ndviMean * 200);
    const totalAGB_t = (agb_t_ha * parcel.area_sqm) / 10000;
    // Carbon content is ~47% of biomass
    const carbonStock_t = totalAGB_t * 0.47;
    // CO2 equivalent = carbon * 3.67
    const co2e_t = carbonStock_t * 3.67;
    // Rough carbon credit value at $5/tonne CO2e
    const carbonCreditValue = co2e_t * 5;

    res.json({
      ndvi: Number(ndviMean.toFixed(3)),
      ndmi: Number(ndmiMean.toFixed(3)),
      aboveGroundBiomass_t_ha: Number(agb_t_ha.toFixed(1)),
      totalBiomass_t: Number(totalAGB_t.toFixed(1)),
      carbonStock_t: Number(carbonStock_t.toFixed(1)),
      co2Equivalent_t: Number(co2e_t.toFixed(1)),
      estimatedCarbonCreditValue_USD: Number(carbonCreditValue.toFixed(0)),
      interpretation: carbonStock_t > 10
        ? `Estimated carbon stock: ${carbonStock_t.toFixed(1)} tonnes C (${co2e_t.toFixed(1)} t CO₂e). Potential carbon credit value: ~$${carbonCreditValue.toFixed(0)}/year. Your parcel has significant carbon sequestration value — preserve tree cover to maintain this.`
        : carbonStock_t > 2
        ? `Estimated carbon stock: ${carbonStock_t.toFixed(1)} tonnes C. Moderate carbon value. Planting trees could increase this to a marketable level.`
        : `Estimated carbon stock: ${carbonStock_t.toFixed(1)} tonnes C. Low carbon value — the parcel has limited vegetation. Tree planting could generate future carbon credit income.`,
    });
  } catch (err) {
    logger.error('[Monitoring] %s', err.message);
    next(err);
  }
};

// ═══════════════════════════════════════════════════════════
// 13. PARCEL VALUATION ESTIMATOR
// ═══════════════════════════════════════════════════════════
exports.valuation = async (req, res, next) => {
  try {
    const parcel = await getParcel(req.params.id, req.user.id, req.user.role, req.user.isSalesManager);
    if (!parcel) return res.status(404).json({ error: 'Parcel not found' });

    // Get buildings count
    const buildingsRes = await db.query(
      `SELECT COUNT(*) as count, COALESCE(SUM(area_sqm), 0) as total_building_area
       FROM buildings WHERE parcel_id = $1`,
      [req.params.id]
    );
    const buildingCount = parseInt(buildingsRes.rows[0].count);
    const buildingArea = Number(buildingsRes.rows[0].total_building_area);

    // Get latest NDVI
    const ndviRes = await db.query(
      `SELECT ndvi_value FROM parcel_images WHERE parcel_id = $1 AND ndvi_value IS NOT NULL ORDER BY captured_at DESC LIMIT 1`,
      [req.params.id]
    );
    const ndvi = ndviRes.rows[0] ? Number(ndviRes.rows[0].ndvi_value) : null;

    // Get alerts count
    const alertsRes = await db.query(
      `SELECT COUNT(*) as count FROM alerts WHERE parcel_id = $1`,
      [req.params.id]
    );
    const alertCount = parseInt(alertsRes.rows[0].count);

    // Simple valuation model (Ghana-specific rough estimates)
    const areaHa = parcel.area_sqm / 10000;
    const region = parcel.region || 'Unknown';

    // Base land value per hectare (rough Ghana averages)
    const basePricePerHa = {
      'Greater Accra': 150000,
      'Ashanti': 80000,
      'Central': 60000,
      'Eastern': 50000,
      'Western': 40000,
      'Volta': 35000,
      'Bono': 30000,
      'Ahafo': 25000,
      'Bono East': 25000,
      'Oti': 20000,
      'Northern': 15000,
      'Savannah': 10000,
      'North East': 10000,
      'Upper East': 12000,
      'Upper West': 10000,
      'Western North': 35000,
    };

    const basePrice = basePricePerHa[region] || 30000;
    let landValue = areaHa * basePrice;

    // Adjustments
    const factors = [];

    // Building value (rough: GHS 2,000 per sqm of building)
    const buildingValue = buildingArea * 2000;
    if (buildingCount > 0) {
      factors.push({ factor: 'Structures on land', impact: `+GHS ${buildingValue.toLocaleString()}`, detail: `${buildingCount} building(s), ${Math.round(buildingArea)}m²` });
    }
    landValue += buildingValue;

    // Vegetation health bonus
    if (ndvi != null) {
      if (ndvi > 0.5) {
        const bonus = landValue * 0.1;
        factors.push({ factor: 'Healthy vegetation', impact: `+GHS ${bonus.toLocaleString()}`, detail: `NDVI: ${ndvi.toFixed(2)} — productive land` });
        landValue += bonus;
      } else if (ndvi < 0.2) {
        const penalty = landValue * 0.05;
        factors.push({ factor: 'Poor vegetation', impact: `-GHS ${penalty.toLocaleString()}`, detail: `NDVI: ${ndvi.toFixed(2)} — degraded land` });
        landValue -= penalty;
      }
    }

    // Alert penalty (risk factor)
    if (alertCount > 5) {
      const penalty = landValue * 0.05;
      factors.push({ factor: 'High alert history', impact: `-GHS ${penalty.toLocaleString()}`, detail: `${alertCount} alerts — monitoring risk` });
      landValue -= penalty;
    }

    // Water access bonus (would need water detection result — skip if not available)

    const lowEstimate = Math.round(landValue * 0.8);
    const highEstimate = Math.round(landValue * 1.2);
    const confidence = buildingCount > 0 && ndvi != null ? 'medium' : 'low';

    res.json({
      estimatedValue_GHS: Math.round(landValue),
      lowEstimate_GHS: lowEstimate,
      highEstimate_GHS: highEstimate,
      confidence,
      factors,
      region,
      areaHa: Number(areaHa.toFixed(2)),
      basePricePerHa,
      interpretation: `Estimated value: GHS ${lowEstimate.toLocaleString()} – ${highEstimate.toLocaleString()} (confidence: ${confidence}). This is a rough estimate based on regional land prices, parcel size, structures, vegetation health, and risk factors. For an official valuation, consult a licensed land valuer.`,
      disclaimer: 'This estimate is for informational purposes only and is not a formal appraisal. Market prices vary significantly. Consult a licensed valuer for official valuation.',
    });
  } catch (err) {
    logger.error('[Monitoring] %s', err.message);
    next(err);
  }
};

// ═══════════════════════════════════════════════════════════
// 14. EVIDENCE PACKAGE (summary data for PDF generation)
// ═══════════════════════════════════════════════════════════
exports.evidencePackage = async (req, res, next) => {
  try {
    const parcel = await getParcel(req.params.id, req.user.id, req.user.role, req.user.isSalesManager);
    if (!parcel) return res.status(404).json({ error: 'Parcel not found' });

    // Gather all monitoring data
    const [buildingsRes, imagesRes, alertsRes, visitsRes] = await Promise.all([
      db.query(`SELECT id, area_sqm, estimated_height_m, estimated_floors, status, detected_at, in_protected_area, notes FROM buildings WHERE parcel_id = $1 ORDER BY detected_at DESC`, [req.params.id]),
      db.query(`SELECT id, image_url, ndvi_value, captured_at, source FROM parcel_images WHERE parcel_id = $1 ORDER BY captured_at DESC LIMIT 10`, [req.params.id]),
      db.query(`SELECT id, alert_type, detected_at, verified, verified_at FROM alerts WHERE parcel_id = $1 ORDER BY detected_at DESC`, [req.params.id]),
      db.query(`SELECT v.id, v.type, v.status, v.requested_at, a.name AS agent_name FROM visit_requests v LEFT JOIN agents a ON v.agent_id = a.id WHERE v.parcel_id = $1 ORDER BY v.requested_at DESC`, [req.params.id]),
    ]);

    const ownerRes = await db.query(`SELECT name, email, phone FROM owners WHERE id = $1`, [parcel.owner_id]);
    const owner = ownerRes.rows[0] || {};

    res.json({
      generatedAt: new Date().toISOString(),
      parcel: {
        id: parcel.id,
        name: parcel.name,
        region: parcel.region,
        area_sqm: Number(parcel.area_sqm),
        perimeter_m: Number(parcel.perimeter_m),
        boundary: parcel.boundary,
      },
      owner: {
        name: owner.name,
        email: owner.email,
        phone: owner.phone,
      },
      buildings: buildingsRes.rows.map(b => ({
        ...b,
        area_sqm: b.area_sqm != null ? Number(b.area_sqm) : null,
        estimated_height_m: b.estimated_height_m != null ? Number(b.estimated_height_m) : null,
      })),
      satelliteImages: imagesRes.rows.map(i => ({
        ...i,
        ndvi_value: i.ndvi_value != null ? Number(i.ndvi_value) : null,
      })),
      alerts: alertsRes.rows,
      visits: visitsRes.rows,
      summary: {
        totalBuildings: buildingsRes.rows.length,
        totalAlerts: alertsRes.rows.length,
        verifiedAlerts: alertsRes.rows.filter(a => a.verified).length,
        totalVisits: visitsRes.rows.length,
        latestNdvi: imagesRes.rows[0]?.ndvi_value ? Number(imagesRes.rows[0].ndvi_value) : null,
      },
    });
  } catch (err) {
    logger.error('[Monitoring] %s', err.message);
    next(err);
  }
};

// ═══════════════════════════════════════════════════════════
// 15. COMPREHENSIVE MONITORING SUMMARY (all-in-one)
// ═══════════════════════════════════════════════════════════
exports.monitoringSummary = async (req, res, next) => {
  try {
    const parcel = await getParcel(req.params.id, req.user.id, req.user.role, req.user.isSalesManager);
    if (!parcel) return res.status(404).json({ error: 'Parcel not found' });

    const ready = await init();
    const eeAvailable = ready;

    // Gather what we can without EE
    const [buildingsRes, imagesRes, alertsRes] = await Promise.all([
      db.query(`SELECT COUNT(*) as count, COALESCE(SUM(area_sqm), 0) as total_area FROM buildings WHERE parcel_id = $1`, [req.params.id]),
      db.query(`SELECT ndvi_value, captured_at FROM parcel_images WHERE parcel_id = $1 AND ndvi_value IS NOT NULL ORDER BY captured_at DESC LIMIT 5`, [req.params.id]),
      db.query(`SELECT COUNT(*) as count, COUNT(*) FILTER (WHERE NOT verified) as unverified FROM alerts WHERE parcel_id = $1`, [req.params.id]),
    ]);

    const summary = {
      eeAvailable,
      parcel: {
        name: parcel.name,
        region: parcel.region,
        area_sqm: Number(parcel.area_sqm),
      },
      buildings: {
        count: parseInt(buildingsRes.rows[0].count),
        totalArea: Number(buildingsRes.rows[0].total_area),
      },
      ndvi: {
        latest: imagesRes.rows[0]?.ndvi_value ? Number(imagesRes.rows[0].ndvi_value) : null,
        history: imagesRes.rows.map(r => ({ value: Number(r.ndvi_value), date: r.captured_at })),
      },
      alerts: {
        total: parseInt(alertsRes.rows[0].count),
        unverified: parseInt(alertsRes.rows[0].unverified),
      },
      monitoringFeatures: {
        flood: eeAvailable,
        encroachment: true, // PostGIS-based, always available
        lulc: eeAvailable,
        fire: eeAvailable,
        soilMoisture: eeAvailable,
        rainfall: eeAvailable,
        historical: eeAvailable,
        treeCoverLoss: eeAvailable,
        landSurfaceTemp: eeAvailable,
        multiIndex: eeAvailable,
        water: eeAvailable,
        carbon: eeAvailable,
        valuation: true, // DB-based, always available
        evidence: true,
      },
    };

    res.json(summary);
  } catch (err) {
    logger.error('[Monitoring] %s', err.message);
    next(err);
  }
};

