/**
 * NDVI Change Detection — runs on a schedule (every 2 days via node-cron).
 *
 * For each active parcel:
 *   1. Fetch the latest cloud-free Sentinel-2 imagery via Google Earth Engine
 *   2. Compute mean NDVI for the parcel's boundary
 *   3. Capture a satellite image URL (getMapId) for visual reference
 *   4. Compare NDVI to the last stored value
 *   5. If change >= threshold, create an alert + push via WebSocket
 *   6. Store the satellite image in parcel_images for historical comparison
 *
 * Requires Earth Engine credentials (EE_SERVICE_ACCOUNT_JSON or GOOGLE_APPLICATION_CREDENTIALS).
 * If EE is not configured, the job logs a warning and exits gracefully.
 */
require('dotenv').config();
const db = require('../config/db');
const bus = require('../realtime/eventBus');
const { ee, init, isReady } = require('../config/earthEngine');
const { notifyOwnerOfAlert } = require('../services/notificationService');

const NDVI_CHANGE_THRESHOLD = 0.15;

/**
 * Compute mean NDVI for a parcel boundary using Earth Engine.
 * Returns { ndviValue, imageUrl } or null if EE fails.
 */
async function computeParcelNdvi(boundaryGeojson) {
  const ready = await init();
  if (!ready) return null;

  return new Promise((resolve) => {
    try {
      const coords = boundaryGeojson.coordinates[0];
      const ring = ee.Geometry.LinearRing(coords);
      const polygon = ee.Geometry.Polygon([ring]);

      // Get the latest Sentinel-2 imagery (last 30 days, < 20% cloud)
      const now = new Date();
      const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      const dateEnd = now.toISOString().slice(0, 10);
      const dateStart = thirtyDaysAgo.toISOString().slice(0, 10);

      const collection = ee.ImageCollection('COPERNICUS/S2_HARMONIZED')
        .filterDate(dateStart, dateEnd)
        .filter(ee.Filter.lt('CLOUDY_PIXEL_PERCENTAGE', 20))
        .filterBounds(polygon);

      const image = collection.median();

      // NDVI = (NIR - Red) / (NIR + Red) = (B8 - B4) / (B8 + B4)
      const ndvi = image.normalizedDifference(['B8', 'B4']);

      // Compute mean NDVI within the parcel boundary
      const ndviValue = ndvi.reduceRegion({
        reducer: ee.Reducer.mean(),
        geometry: polygon,
        scale: 10,
        maxPixels: 1e9,
      });

      // Get a map ID for the satellite image (natural color RGB)
      const visualized = image.visualize({
        bands: ['B4', 'B3', 'B2'],
        min: 0,
        max: 3000,
        gamma: 1.4,
      });

      visualized.getMapId({ min: 0, max: 255 }, (errOrResult, map) => {
        const result = map || errOrResult;
        const mapErr = map ? errOrResult : null;
        if (mapErr || !result || !result.mapid) {
          console.error('EE getMapId failed:', mapErr ? String(mapErr).substring(0, 200) : 'no mapid');
          resolve(null);
          return;
        }

        const imageUrl = result.urlFormat || `https://earthengine.googleapis.com/v1/${result.mapid}/tiles/{z}/{x}/{y}`;

        // Extract the NDVI mean value
        ndviValue.getInfo((infoOrErr, info) => {
          const hasErr = info != null;
          const actualInfo = hasErr ? info : infoOrErr;
          const infoErr = hasErr ? infoOrErr : null;
          if (infoErr) {
            console.error('EE NDVI getInfo failed:', String(infoErr).substring(0, 200));
            resolve(null);
            return;
          }
          const meanNdvi = actualInfo.nd ? actualInfo.nd : null;
          if (meanNdvi === null || meanNdvi === undefined) {
            console.error('EE NDVI returned null — possibly no imagery in date range');
            resolve(null);
            return;
          }
          resolve({ ndviValue: meanNdvi, imageUrl });
        });
      });
    } catch (err) {
      console.error('EE computeParcelNdvi error:', err.message);
      resolve(null);
    }
  });
}

/**
 * Main job — iterate all parcels, compute NDVI, detect changes, create alerts.
 */
async function run() {
  console.log('[NDVI Job] Starting change detection run...');

  const ready = await init();
  if (!ready) {
    console.warn('[NDVI Job] Earth Engine not configured — skipping. Set EE_SERVICE_ACCOUNT_JSON to enable satellite monitoring.');
    return;
  }

  const { rows: parcels } = await db.query(
    `SELECT id, name, owner_id, ST_AsGeoJSON(boundary) AS boundary_geojson FROM parcels`
  );

  console.log(`[NDVI Job] Processing ${parcels.length} parcels...`);

  for (const parcel of parcels) {
    try {
      const boundary = JSON.parse(parcel.boundary_geojson);
      const result = await computeParcelNdvi(boundary);

      if (!result) {
        console.log(`[NDVI Job] Parcel ${parcel.name} (${parcel.id}): no imagery available`);
        continue;
      }

      const { ndviValue, imageUrl } = result;

      // Store the satellite image snapshot
      await db.query(
        `INSERT INTO parcel_images (parcel_id, image_url, ndvi_value, source) VALUES ($1, $2, $3, $4)`,
        [parcel.id, imageUrl, ndviValue, 'sentinel-2']
      );

      // Get the last NDVI value for comparison
      const { rows: lastAlerts } = await db.query(
        `SELECT ndvi_after FROM alerts WHERE parcel_id = $1 ORDER BY detected_at DESC LIMIT 1`,
        [parcel.id]
      );
      const { rows: lastImages } = await db.query(
        `SELECT ndvi_value FROM parcel_images WHERE parcel_id = $1 AND ndvi_value IS NOT NULL ORDER BY captured_at DESC LIMIT 1 OFFSET 1`,
        [parcel.id]
      );

      // Use last alert's NDVI, or last image's NDVI as baseline
      const previousNdvi = lastAlerts[0]?.ndvi_after ?? lastImages[0]?.ndvi_value ?? ndviValue;

      const changeScore = Math.abs(previousNdvi - ndviValue);

      console.log(`[NDVI Job] Parcel ${parcel.name}: NDVI ${ndviValue.toFixed(3)} (prev: ${previousNdvi.toFixed(3)}, change: ${changeScore.toFixed(3)})`);

      if (changeScore >= NDVI_CHANGE_THRESHOLD) {
        const alertType = ndviValue < previousNdvi ? 'clearing' : 'possible_structure';

        const { rows: alertRows } = await db.query(
          `INSERT INTO alerts (parcel_id, ndvi_before, ndvi_after, change_score, alert_type, image_url)
           VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
          [parcel.id, previousNdvi, ndviValue, changeScore, alertType, imageUrl]
        );
        const alert = alertRows[0];

        // Push alert via WebSocket to the parcel owner + send email/SMS
        if (parcel.owner_id) {
          bus.emit('alert:new', {
            alert,
            parcelId: parcel.id,
            parcelName: parcel.name,
            ownerId: parcel.owner_id,
          });

          // Send email + SMS notification (if configured)
          notifyOwnerOfAlert(parcel.owner_id, alert, parcel.name).catch((err) =>
            console.error('[NDVI Job] Notification failed:', err.message)
          );

          console.log(`[NDVI Job] ALERT created for parcel ${parcel.name}: ${alertType} (change: ${changeScore.toFixed(3)})`);
        }
      }
    } catch (err) {
      console.error(`[NDVI Job] Failed to process parcel ${parcel.id}:`, err.message);
    }
  }

  console.log('[NDVI Job] Run complete.');
}

if (require.main === module) {
  run()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error('[NDVI Job] Fatal error:', err);
      process.exit(1);
    });
}

module.exports = { run, computeParcelNdvi };
