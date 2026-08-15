const db = require('../config/db');

exports.listPlans = async (_req, res, next) => {
  try {
    const result = await db.query('SELECT * FROM plans ORDER BY price ASC');
    res.json(result.rows);
  } catch (err) {
    next(err);
  }
};

exports.subscribe = async (req, res, next) => {
  try {
    const { plan_id } = req.body;
    const planResult = await db.query('SELECT * FROM plans WHERE id = $1', [plan_id]);
    const plan = planResult.rows[0];
    if (!plan) return res.status(404).json({ error: 'Plan not found' });

    // TODO: charge the owner via payment provider before activating, then record in `payments`

    const result = await db.query(
      `INSERT INTO subscriptions (owner_id, plan_id, credits_remaining, renews_at, status)
       VALUES ($1, $2, $3, now() + interval '1 month', 'active') RETURNING *`,
      [req.user.id, plan_id, plan.included_visits_per_period]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    next(err);
  }
};

exports.getMine = async (req, res, next) => {
  try {
    const result = await db.query(
      `SELECT s.*, p.name AS plan_name, p.live_video_included
       FROM subscriptions s JOIN plans p ON p.id = s.plan_id
       WHERE s.owner_id = $1 AND s.status = 'active' ORDER BY s.created_at DESC LIMIT 1`,
      [req.user.id]
    );
    res.json(result.rows[0] || null);
  } catch (err) {
    next(err);
  }
};
