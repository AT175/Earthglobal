const db = require('../config/db');

// GET /admin/stats — dashboard overview numbers
exports.getStats = async (req, res, next) => {
  try {
    const [parcels, owners, agents, visits, alerts, revenue] = await Promise.all([
      db.query('SELECT COUNT(*) FROM parcels'),
      db.query('SELECT COUNT(*) FROM owners'),
      db.query("SELECT COUNT(*) FILTER (WHERE active = true) as active, COUNT(*) as total FROM agents"),
      db.query("SELECT COUNT(*) FILTER (WHERE status = 'pending') as pending, COUNT(*) FILTER (WHERE status = 'completed') as completed, COUNT(*) FILTER (WHERE status = 'in_progress') as in_progress FROM visit_requests"),
      db.query("SELECT COUNT(*) FILTER (WHERE verified = false) as unverified, COUNT(*) as total FROM alerts"),
      db.query("SELECT COALESCE(SUM(amount), 0) as total FROM payments WHERE status = 'succeeded'"),
    ]);

    res.json({
      parcels: parseInt(parcels.rows[0].count),
      owners: parseInt(owners.rows[0].count),
      agents: {
        active: parseInt(agents.rows[0].active),
        total: parseInt(agents.rows[0].total),
      },
      visits: {
        pending: parseInt(visits.rows[0].pending),
        completed: parseInt(visits.rows[0].completed),
        inProgress: parseInt(visits.rows[0].in_progress),
      },
      alerts: {
        unverified: parseInt(alerts.rows[0].unverified),
        total: parseInt(alerts.rows[0].total),
      },
      revenue: parseFloat(revenue.rows[0].total),
    });
  } catch (err) {
    next(err);
  }
};

// GET /admin/recent-activity — latest parcels, visits, alerts
exports.getRecentActivity = async (req, res, next) => {
  try {
    const [recentParcels, recentVisits, recentAlerts] = await Promise.all([
      db.query(`SELECT p.id, p.name, p.region, p.area_sqm, p.created_at, o.name as owner_name
                FROM parcels p LEFT JOIN owners o ON p.owner_id = o.id
                ORDER BY p.created_at DESC LIMIT 5`),
      db.query(`SELECT v.id, v.type, v.status, v.requested_at, p.name as parcel_name
                FROM visit_requests v LEFT JOIN parcels p ON v.parcel_id = p.id
                ORDER BY v.requested_at DESC LIMIT 5`),
      db.query(`SELECT a.id, a.alert_type, a.detected_at, a.verified, p.name as parcel_name
                FROM alerts a LEFT JOIN parcels p ON a.parcel_id = p.id
                ORDER BY a.detected_at DESC LIMIT 5`),
    ]);

    res.json({
      parcels: recentParcels.rows,
      visits: recentVisits.rows,
      alerts: recentAlerts.rows,
    });
  } catch (err) {
    next(err);
  }
};
