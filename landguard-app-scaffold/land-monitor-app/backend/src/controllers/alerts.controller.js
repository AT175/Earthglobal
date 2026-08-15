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
