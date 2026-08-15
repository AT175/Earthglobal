/**
 * Scheduled worker — run via cron every ~5 days (Sentinel-2 revisit cycle).
 * For each active parcel: fetch latest Sentinel imagery, compute NDVI,
 * compare to the last stored value, and write an alert if the change is significant.
 *
 * Run standalone: `npm run worker:ndvi`
 * In production, trigger this via a scheduled job (Render Cron, AWS EventBridge, etc.)
 * rather than a long-running process.
 */
require('dotenv').config();
const db = require('../config/db');

const NDVI_CHANGE_THRESHOLD = 0.15; // tune based on testing — higher = fewer false positives

async function getSentinelAccessToken() {
  // TODO: OAuth2 client-credentials flow against Sentinel Hub's auth endpoint,
  // using SENTINEL_HUB_CLIENT_ID / SENTINEL_HUB_CLIENT_SECRET
  throw new Error('Not implemented — wire up Sentinel Hub OAuth token fetch here');
}

async function fetchNdviForParcel(boundaryGeojson, accessToken) {
  // TODO: call Sentinel Hub's Processing API with an NDVI evalscript, passing the
  // parcel's polygon as the request geometry. Returns { ndviValue, imageUrl }.
  throw new Error('Not implemented — wire up Sentinel Hub Processing API call here');
}

async function run() {
  const accessToken = await getSentinelAccessToken();

  const { rows: parcels } = await db.query(
    `SELECT id, ST_AsGeoJSON(boundary) AS boundary_geojson FROM parcels`
  );

  for (const parcel of parcels) {
    try {
      const boundary = JSON.parse(parcel.boundary_geojson);
      const { ndviValue, imageUrl } = await fetchNdviForParcel(boundary, accessToken);

      const { rows: lastAlerts } = await db.query(
        `SELECT ndvi_after FROM alerts WHERE parcel_id = $1 ORDER BY detected_at DESC LIMIT 1`,
        [parcel.id]
      );
      const previousNdvi = lastAlerts[0]?.ndvi_after ?? ndviValue; // first run has no baseline to compare

      const changeScore = Math.abs(previousNdvi - ndviValue);

      if (changeScore >= NDVI_CHANGE_THRESHOLD) {
        const alertType = ndviValue < previousNdvi ? 'clearing' : 'possible_structure';
        await db.query(
          `INSERT INTO alerts (parcel_id, ndvi_before, ndvi_after, change_score, alert_type, image_url)
           VALUES ($1, $2, $3, $4, $5, $6)`,
          [parcel.id, previousNdvi, ndviValue, changeScore, alertType, imageUrl]
        );
        // TODO: insert a notification row for the parcel's owner here
        console.log(`Alert created for parcel ${parcel.id}: ${alertType} (change: ${changeScore.toFixed(3)})`);
      }
    } catch (err) {
      console.error(`Failed to process parcel ${parcel.id}:`, err.message);
    }
  }
}

if (require.main === module) {
  run()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error('NDVI worker failed:', err);
      process.exit(1);
    });
}

module.exports = { run };
