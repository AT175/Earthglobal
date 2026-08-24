const { ee, init, isReady } = require('../config/earthEngine');

/**
 * GET /map-tiles/satellite
 *
 * Returns a tile URL template for Earth Engine Sentinel-2 satellite imagery.
 * The frontend uses this URL as a Leaflet TileLayer to display real satellite
 * imagery without Google Maps billing.
 *
 * Query params:
 *   - bbox: "minLng,minLat,maxLng,maxLat" (optional — filters to a region for
 *           better cloud-free compositing)
 *
 * Response: { url: "https://earthengine.googleapis.com/v1/{mapid}/tiles/{z}/{x}/{y}", token: "..." }
 *
 * Falls back to { url: null } if Earth Engine isn't configured — the frontend
 * then uses the free Esri World Imagery tiles instead.
 */
exports.getSatelliteTiles = async (req, res, next) => {
  try {
    const ready = await init();
    if (!ready) {
      return res.json({ url: null, provider: 'fallback' });
    }

    // Build a Sentinel-2 cloud-free composite for the requested region
    // (or a global composite if no bbox is provided)
    const collection = ee.ImageCollection('COPERNICUS/S2_HARMONIZED');

    let filtered = collection.filterDate('2025-01-01', '2025-12-31')
      .filter(ee.Filter.lt('CLOUDY_PIXEL_PERCENTAGE', 20));

    // If a bbox is provided, filter to that region for better imagery
    if (req.query.bbox) {
      const [minLng, minLat, maxLng, maxLat] = req.query.bbox.split(',').map(parseFloat);
      const region = ee.Geometry.Rectangle([minLng, minLat, maxLng, maxLat], 'EPSG:4326', false);
      filtered = filtered.filterBounds(region);
    }

    // Create a median composite (removes clouds by taking the median pixel value)
    const composite = filtered.median();

    // Visualize as natural-color RGB (B4=red, B3=green, B2=blue)
    const visParams = {
      bands: ['B4', 'B3', 'B2'],
      min: 0,
      max: 3000,
      gamma: 1.4,
    };

    const visualized = composite.visualize(visParams);

    // Get the map ID + token for tile serving
    visualized.getMapId({ min: 0, max: 255 }, (err, map) => {
      if (err) {
        const errMsg = typeof err === 'object' ? JSON.stringify(err) : String(err);
        console.error('Earth Engine getMapId failed:', errMsg);
        return res.json({ url: null, provider: 'fallback', error: errMsg });
      }

      const tileUrl = `https://earthengine.googleapis.com/v1/${map.mapid}/tiles/{z}/{x}/{y}`;
      console.log('Satellite tiles: returning EE tile URL', map.mapid);
      res.json({
        url: tileUrl,
        token: map.token,
        provider: 'earth-engine',
        attribution: 'Imagery &copy; Copernicus Sentinel-2 via Google Earth Engine',
      });
    });
  } catch (err) {
    console.error('Map tiles error:', err.message);
    res.json({ url: null, provider: 'fallback' });
  }
};

/**
 * GET /map-tiles/ndvi
 *
 * Returns a tile URL for NDVI (vegetation index) visualization over the
 * requested region. Green = healthy vegetation, brown = bare ground/clearing.
 *
 * Query params:
 *   - bbox: "minLng,minLat,maxLng,maxLat" (required for NDVI to keep processing fast)
 */
exports.getNdviTiles = async (req, res, next) => {
  try {
    const ready = await init();
    if (!ready) {
      return res.json({ url: null, provider: 'fallback' });
    }

    if (!req.query.bbox) {
      return res.status(400).json({ error: 'bbox query parameter is required for NDVI tiles' });
    }

    const [minLng, minLat, maxLng, maxLat] = req.query.bbox.split(',').map(parseFloat);
    const region = ee.Geometry.Rectangle([minLng, minLat, maxLng, maxLat], 'EPSG:4326', false);

    const collection = ee.ImageCollection('COPERNICUS/S2_HARMONIZED')
      .filterDate('2025-01-01', '2025-12-31')
      .filter(ee.Filter.lt('CLOUDY_PIXEL_PERCENTAGE', 20))
      .filterBounds(region);

    const composite = collection.median();

    // NDVI = (NIR - Red) / (NIR + Red) = (B8 - B4) / (B8 + B4)
    const ndvi = composite.normalizedDifference(['B8', 'B4']);

    // Visualize: brown (bare) → green (healthy vegetation)
    const visParams = {
      min: -0.2,
      max: 0.8,
      palette: ['#8B4513', '#D2B48C', '#ADFF2F', '#228B22', '#006400'],
    };

    const visualized = ndvi.visualize(visParams);

    visualized.getMapId({ min: 0, max: 255 }, (err, map) => {
      if (err) {
        const errMsg = typeof err === 'object' ? JSON.stringify(err) : String(err);
        console.error('Earth Engine NDVI getMapId failed:', errMsg);
        return res.json({ url: null, provider: 'fallback', error: errMsg });
      }

      const tileUrl = `https://earthengine.googleapis.com/v1/${map.mapid}/tiles/{z}/{x}/{y}`;
      console.log('NDVI tiles: returning EE tile URL', map.mapid);
      res.json({
        url: tileUrl,
        token: map.token,
        provider: 'earth-engine',
        attribution: 'NDVI &copy; Copernicus Sentinel-2 via Google Earth Engine',
      });
    });
  } catch (err) {
    console.error('NDVI tiles error:', err.message);
    res.json({ url: null, provider: 'fallback' });
  }
};
