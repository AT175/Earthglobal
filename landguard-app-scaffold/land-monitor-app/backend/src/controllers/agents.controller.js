const db = require('../config/db');

// GET /agents — list all agents (admin only)
exports.list = async (req, res, next) => {
  try {
    const result = await db.query(
      'SELECT id, name, phone, region, active, created_at FROM agents ORDER BY created_at DESC'
    );
    res.json(result.rows);
  } catch (err) {
    next(err);
  }
};

// GET /agents/stats — agent list with completed visit counts for the performance chart.
// Returns [{ id, name, visits }, ...] sorted by visits descending.
exports.stats = async (req, res, next) => {
  try {
    const result = await db.query(
      `SELECT a.id, a.name,
              COUNT(v.id) FILTER (WHERE v.status = 'completed') AS visits
       FROM agents a
       LEFT JOIN visit_requests v ON v.agent_id = a.id
       GROUP BY a.id, a.name
       ORDER BY visits DESC`
    );
    res.json(
      result.rows.map((row) => ({
        id: row.id,
        name: row.name,
        visits: parseInt(row.visits, 10) || 0,
      }))
    );
  } catch (err) {
    next(err);
  }
};
