const db = require('../config/db');
const bus = require('../realtime/eventBus');

// GET /visit-requests/my-stats — agent's own dashboard stats
exports.myStats = async (req, res, next) => {
  try {
    const agentId = req.user.id;

    // Visit counts by status
    const statusCounts = await db.query(
      `SELECT status, COUNT(*) as count
       FROM visit_requests WHERE agent_id = $1
       GROUP BY status`,
      [agentId]
    );

    // Total visits
    const totalResult = await db.query(
      'SELECT COUNT(*) as total FROM visit_requests WHERE agent_id = $1',
      [agentId]
    );

    // Completed visits
    const completedResult = await db.query(
      "SELECT COUNT(*) as completed FROM visit_requests WHERE agent_id = $1 AND status = 'completed'",
      [agentId]
    );

    // Pending visits
    const pendingResult = await db.query(
      "SELECT COUNT(*) as pending FROM visit_requests WHERE agent_id = $1 AND status IN ('pending', 'assigned')",
      [agentId]
    );

    // In progress
    const inProgressResult = await db.query(
      "SELECT COUNT(*) as in_progress FROM visit_requests WHERE agent_id = $1 AND status = 'in_progress'",
      [agentId]
    );

    // Recent visits (last 5)
    const recentResult = await db.query(
      `SELECT v.id, v.type, v.status, v.requested_at, v.scheduled_at, v.completed_at,
              p.name as parcel_name, p.region,
              o.name as owner_name, o.phone as owner_phone
       FROM visit_requests v
       JOIN parcels p ON v.parcel_id = p.id
       JOIN owners o ON v.owner_id = o.id
       WHERE v.agent_id = $1
       ORDER BY v.requested_at DESC
       LIMIT 5`,
      [agentId]
    );

    // Media uploaded count
    const mediaResult = await db.query(
      `SELECT COUNT(*) as media_count FROM media m
       JOIN visit_requests v ON m.visit_request_id = v.id
       WHERE v.agent_id = $1`,
      [agentId]
    );

    // Agent info
    const agentResult = await db.query(
      'SELECT name, email, phone, region, active FROM agents WHERE id = $1',
      [agentId]
    );

    res.json({
      agent: agentResult.rows[0] || null,
      total: parseInt(totalResult.rows[0]?.total, 10) || 0,
      completed: parseInt(completedResult.rows[0]?.completed, 10) || 0,
      pending: parseInt(pendingResult.rows[0]?.pending, 10) || 0,
      in_progress: parseInt(inProgressResult.rows[0]?.in_progress, 10) || 0,
      media_count: parseInt(mediaResult.rows[0]?.media_count, 10) || 0,
      status_breakdown: statusCounts.rows.reduce((acc, r) => {
        acc[r.status] = parseInt(r.count, 10);
        return acc;
      }, {}),
      recent_visits: recentResult.rows,
    });
  } catch (err) {
    next(err);
  }
};

// GET /visit-requests — scoped by role: owner sees own, agent sees assigned, admin sees all
exports.list = async (req, res, next) => {
  try {
    let query, params;
    if (req.user.role === 'owner') {
      query = 'SELECT * FROM visit_requests WHERE owner_id = $1 ORDER BY requested_at DESC';
      params = [req.user.id];
    } else if (req.user.role === 'agent') {
      query = 'SELECT * FROM visit_requests WHERE agent_id = $1 ORDER BY requested_at DESC';
      params = [req.user.id];
    } else {
      query = 'SELECT * FROM visit_requests ORDER BY requested_at DESC';
      params = [];
    }
    const result = await db.query(query, params);
    res.json(result.rows);
  } catch (err) {
    next(err);
  }
};

// POST /visit-requests — owner requests a visit; checks subscription credits first
exports.create = async (req, res, next) => {
  try {
    const { parcel_id, type, scheduled_at } = req.body;

    // Check for available subscription credit
    const subResult = await db.query(
      `SELECT * FROM subscriptions WHERE owner_id = $1 AND status = 'active' ORDER BY renews_at DESC LIMIT 1`,
      [req.user.id]
    );
    const subscription = subResult.rows[0];
    const useCredit = subscription && subscription.credits_remaining > 0;

    // TODO: if !useCredit, charge via /payments/charge before creating the request,
    // then pass the resulting price into price_charged below.

    const result = await db.query(
      `INSERT INTO visit_requests (parcel_id, owner_id, type, scheduled_at, plan_credit_used)
       VALUES ($1, $2, $3, $4, $5) RETURNING *`,
      [parcel_id, req.user.id, type, scheduled_at || null, useCredit]
    );

    if (useCredit) {
      await db.query(
        `UPDATE subscriptions SET credits_remaining = credits_remaining - 1 WHERE id = $1`,
        [subscription.id]
      );
    }

    const visit = result.rows[0];

    // Create a notification for agents in the parcel's region + emit real-time event
    // TODO: in a real build, look up agents by region and insert notification rows.
    bus.emit('visit:status', { visit, ownerId: visit.owner_id, agentId: visit.agent_id });

    res.status(201).json(visit);
  } catch (err) {
    next(err);
  }
};

// PATCH /visit-requests/:id — agent/admin updates status through fulfillment
exports.updateStatus = async (req, res, next) => {
  try {
    const { status, agent_id } = req.body;
    const fields = [];
    const values = [];
    let i = 1;
    if (status) { fields.push(`status = $${i++}`); values.push(status); }
    if (agent_id) { fields.push(`agent_id = $${i++}`); values.push(agent_id); }
    if (status === 'completed') { fields.push(`completed_at = now()`); }

    values.push(req.params.id);
    const result = await db.query(
      `UPDATE visit_requests SET ${fields.join(', ')} WHERE id = $${i} RETURNING *`,
      values
    );
    const visit = result.rows[0];

    // Emit real-time status change to the owner and assigned agent
    bus.emit('visit:status', { visit, ownerId: visit.owner_id, agentId: visit.agent_id });

    res.json(visit);
  } catch (err) {
    next(err);
  }
};

// POST /visit-requests/:id/media — agent uploads photo/video from the field
exports.uploadMedia = async (req, res, next) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
    // TODO: upload req.file.buffer to S3/R2, then store the resulting URL below
    const fakeUrl = `https://media.example.com/${req.params.id}/${req.file.originalname}`;
    const type = req.file.mimetype.startsWith('video') ? 'video' : 'photo';

    const result = await db.query(
      `INSERT INTO media (visit_request_id, url, type) VALUES ($1, $2, $3) RETURNING *`,
      [req.params.id, fakeUrl, type]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    next(err);
  }
};
