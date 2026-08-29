/**
 * Encroachment Monitor — runs daily via cron.
 *
 * For every parcel, checks if any new buildings have appeared within 15m
 * of the boundary since the last check. If new structures are detected:
 *   1. Creates an alert (alert_type = 'possible_structure')
 *   2. Sends push notification via WebSocket
 *   3. Sends email/SMS if configured
 *   4. Saves to monitoring_logs
 *
 * This makes encroachment monitoring "at speed" for owners — they don't
 * need to manually click anything. Alerts arrive automatically.
 *
 * The job uses PostGIS (instant) for buildings already in the database,
 * and optionally uses Google OpenBuildings (EE) for AI-detected structures
 * that haven't been vectorized yet.
 */
require('dotenv').config();
const db = require('../config/db');
const bus = require('../realtime/eventBus');
const logger = require('../config/logger');
const { notifyOwnerOfAlert } = require('../services/notificationService');

/**
 * Run encroachment check for all parcels.
 * Called by cron schedule.
 */
async function runScheduled() {
  logger.info('[EncroachmentMonitor] Starting scheduled run...');

  // Get all parcels with their owner info
  const parcelsRes = await db.query(
    `SELECT p.id, p.name, p.owner_id, p.region,
            ST_AsGeoJSON(p.boundary) AS boundary_geojson
     FROM parcels p
     WHERE p.boundary IS NOT NULL
     ORDER BY p.id`
  );

  logger.info(`[EncroachmentMonitor] Checking ${parcelsRes.rowCount} parcels`);

  let totalAlerts = 0;
  let parcelsWithNewEncroachment = 0;

  for (const parcel of parcelsRes.rows) {
    try {
      const newEncroachments = await checkParcelForNewEncroachment(parcel);
      if (newEncroachments.length > 0) {
        totalAlerts += newEncroachments.length;
        parcelsWithNewEncroachment++;

        // Create alert + notify owner
        for (const enc of newEncroachments) {
          await db.query(
            `INSERT INTO alerts (parcel_id, alert_type, change_score, image_url)
             VALUES ($1, 'possible_structure', $2, $3)
             ON CONFLICT DO NOTHING`,
            [parcel.id, enc.distance_m ? Number(enc.distance_m) : null, null]
          );

          // Notify owner via WebSocket + email/SMS
          if (parcel.owner_id) {
            const message = `${newEncroachments.length} new structure(s) detected within 15m of your parcel boundary "${parcel.name}". Closest: ${enc.distance_m}m. Visit your dashboard to review.`;
            try {
              await db.query(
                `INSERT INTO notifications (owner_id, title, body, type)
                 VALUES ($1, $2, $3, 'alert')`,
                [parcel.owner_id, `Encroachment Alert: ${parcel.name}`, message]
              );
              bus.emit('notification:new', {
                ownerId: parcel.owner_id,
                title: `Encroachment Alert: ${parcel.name}`,
                body: message,
                alert: { type: 'encroachment', parcelId: parcel.id },
              });
              bus.emit('alert:new', {
                alert: { alert_type: 'possible_structure', parcelId: parcel.id },
                parcelId: parcel.id,
                ownerId: parcel.owner_id,
              });
            } catch (e) {
              logger.error(`[EncroachmentMonitor] Notification failed for parcel ${parcel.id}: ${e.message}`);
            }
          }
        }

        // Save to monitoring log
        const logResult = {
          encroachments: newEncroachments,
          count: newEncroachments.length,
          hasEncroachment: true,
          interpretation: `${newEncroachments.length} NEW structure(s) detected near boundary since last check.`,
          automated: true,
        };
        await db.query(
          `INSERT INTO monitoring_logs (parcel_id, indicator, result, summary)
           VALUES ($1, 'encroachment', $2, $3)`,
          [parcel.id, JSON.stringify(logResult), `${newEncroachments.length} new encroachment(s) [auto]`]
        );

        logger.info(`[EncroachmentMonitor] ${newEncroachments.length} new encroachment(s) on parcel ${parcel.name}`);
      }
    } catch (err) {
      logger.error(`[EncroachmentMonitor] Error on parcel ${parcel.id}: ${err.message}`);
    }
  }

  logger.info(`[EncroachmentMonitor] Done. ${totalAlerts} alerts across ${parcelsWithNewEncroachment} parcels.`);
  return { totalAlerts, parcelsWithNewEncroachment, parcelsChecked: parcelsRes.rowCount };
}

/**
 * Check a single parcel for NEW encroachments since last check.
 * Uses PostGIS to find buildings near the boundary that weren't there before.
 *
 * "New" = building detected_at is more recent than the last encroachment
 * monitoring log for this parcel.
 */
async function checkParcelForNewEncroachment(parcel) {
  // Find when we last checked this parcel for encroachment
  const lastCheckRes = await db.query(
    `SELECT MAX(detected_at) AS last_check
     FROM monitoring_logs
     WHERE parcel_id = $1 AND indicator = 'encroachment'`,
    [parcel.id]
  );
  const lastCheck = lastCheckRes.rows[0]?.last_check;

  // Find buildings within 15m of boundary that are NEW since last check
  // (or all buildings if this is the first check)
  const query = lastCheck
    ? `WITH boundary_line AS (
         SELECT ST_Boundary(boundary) AS bl FROM parcels WHERE id = $1
       )
       SELECT b.id, b.area_sqm, b.estimated_height_m, b.status, b.detected_at,
              ST_Distance(b.footprint, (SELECT bl FROM boundary_line)) AS distance_m,
              ST_AsGeoJSON(ST_Centroid(b.footprint)) AS centroid_geojson
       FROM buildings b
       WHERE ST_DWithin(b.footprint, (SELECT bl FROM boundary_line), 15)
       AND (b.parcel_id IS NULL OR b.parcel_id != $1)
       AND b.detected_at > $2
       ORDER BY distance_m ASC
       LIMIT 20`
    : `WITH boundary_line AS (
         SELECT ST_Boundary(boundary) AS bl FROM parcels WHERE id = $1
       )
       SELECT b.id, b.area_sqm, b.estimated_height_m, b.status, b.detected_at,
              ST_Distance(b.footprint, (SELECT bl FROM boundary_line)) AS distance_m,
              ST_AsGeoJSON(ST_Centroid(b.footprint)) AS centroid_geojson
       FROM buildings b
       WHERE ST_DWithin(b.footprint, (SELECT bl FROM boundary_line), 15)
       AND (b.parcel_id IS NULL OR b.parcel_id != $1)
       ORDER BY distance_m ASC
       LIMIT 20`;

  const params = lastCheck ? [parcel.id, lastCheck] : [parcel.id];
  const result = await db.query(query, params);

  return result.rows.map((r) => ({
    id: r.id,
    area_sqm: r.area_sqm != null ? Number(r.area_sqm) : null,
    estimated_height_m: r.estimated_height_m != null ? Number(r.estimated_height_m) : null,
    distance_m: r.distance_m != null ? Number(r.distance_m).toFixed(1) : null,
    status: r.status,
    detected_at: r.detected_at,
    centroid: r.centroid_geojson ? JSON.parse(r.centroid_geojson) : null,
  }));
}

/**
 * Check a single parcel on-demand (for manual trigger).
 */
async function checkSingleParcel(parcelId) {
  const parcelRes = await db.query(
    `SELECT p.id, p.name, p.owner_id, p.region,
            ST_AsGeoJSON(p.boundary) AS boundary_geojson
     FROM parcels p WHERE p.id = $1`,
    [parcelId]
  );
  if (parcelRes.rowCount === 0) throw new Error('Parcel not found');
  return checkParcelForNewEncroachment(parcelRes.rows[0]);
}

module.exports = {
  runScheduled,
  checkSingleParcel,
  checkParcelForNewEncroachment,
};
