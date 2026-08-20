const db = require('../config/db');
const bcrypt = require('bcrypt');

// GET /agents — list all agents (admin only)
exports.list = async (req, res, next) => {
  try {
    const result = await db.query(
      'SELECT id, name, email, phone, region, active, created_at FROM agents ORDER BY created_at DESC'
    );
    res.json(result.rows);
  } catch (err) {
    next(err);
  }
};

// GET /agents/stats — agent list with completed visit counts for the performance chart.
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

// POST /agents — create a new agent (admin only)
exports.create = async (req, res, next) => {
  try {
    const { name, email, phone, region, password } = req.body;
    if (!name || !phone) return res.status(400).json({ error: 'Name and phone are required' });

    const passwordHash = password ? await bcrypt.hash(password, 10) : null;
    const result = await db.query(
      `INSERT INTO agents (name, email, phone, region, password_hash)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id, name, email, phone, region, active, created_at`,
      [name, email, phone, region, passwordHash]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    if (err.code === '23505') return res.status(409).json({ error: 'Email or phone already exists' });
    next(err);
  }
};

// PATCH /agents/:id — update agent (activate/deactivate, edit info)
exports.update = async (req, res, next) => {
  try {
    const { name, email, phone, region, active } = req.body;
    const result = await db.query(
      `UPDATE agents SET
         name = COALESCE($1, name),
         email = COALESCE($2, email),
         phone = COALESCE($3, phone),
         region = COALESCE($4, region),
         active = COALESCE($5, active)
       WHERE id = $6
       RETURNING id, name, email, phone, region, active, created_at`,
      [name, email, phone, region, active, req.params.id]
    );
    if (!result.rows[0]) return res.status(404).json({ error: 'Agent not found' });
    res.json(result.rows[0]);
  } catch (err) {
    next(err);
  }
};

// DELETE /agents/:id — delete agent (admin only)
exports.remove = async (req, res, next) => {
  try {
    const result = await db.query('DELETE FROM agents WHERE id = $1 RETURNING id', [req.params.id]);
    if (!result.rows[0]) return res.status(404).json({ error: 'Agent not found' });
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
};
