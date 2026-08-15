const db = require('../config/db');

// GET /parcels/:id/alerts
exports.listForParcel = async (req, res, next) => {
  try {
    const result = await db.query(
      'SELECT * FROM alerts WHERE parcel_id = $1 ORDER BY detected_at DESC',
      [req.params.id]
    );
    res.json(result.rows);
  } catch (err) {
    next(err);
  }
};

// GET /alerts/trends — aggregated alert counts by month for the authenticated owner.
// Returns [{ month: '2026-01', verified: 3, unverified: 5 }, ...] for the last 12 months.
exports.trends = async (req, res, next) => {
  try {
    const result = await db.query(
      `SELECT
         to_char(date_trunc('month', detected_at), 'YYYY-MM') AS month,
         COUNT(*) FILTER (WHERE verified = true)  AS verified,
         COUNT(*) FILTER (WHERE verified = false) AS unverified
       FROM alerts a
       JOIN parcels p ON p.id = a.parcel_id
       WHERE p.owner_id = $1
         AND a.detected_at >= now() - interval '12 months'
       GROUP BY date_trunc('month', detected_at)
       ORDER BY date_trunc('month', detected_at)`,
      [req.user.id]
    );
    res.json(result.rows);
  } catch (err) {
    next(err);
  }
};

// PATCH /parcels/alerts/:alertId — mark verified, optionally link to a visit request
exports.verify = async (req, res, next) => {
  try {
    const { verified_by_visit_id } = req.body;
    const result = await db.query(
      `UPDATE alerts SET verified = true, verified_by_visit_id = $1 WHERE id = $2 RETURNING *`,
      [verified_by_visit_id || null, req.params.alertId]
    );
    res.json(result.rows[0]);
  } catch (err) {
    next(err);
  }
};
