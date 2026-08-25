const db = require('../config/db');
const bus = require('../realtime/eventBus');
const logger = require('../config/logger');

// ── Helper: find best agent for a parcel's region ──
// Picks the active agent in the same region with the fewest pending visits.
// Falls back to any active agent if no regional match.
async function findBestAgent(parcelId) {
  // Get the parcel's region
  const parcelResult = await db.query('SELECT region FROM parcels WHERE id = $1', [parcelId]);
  const region = parcelResult.rows[0]?.region;

  // Find active agent in the region with the fewest assigned pending visits
  if (region) {
    const regional = await db.query(
      `SELECT a.id, a.name,
              COUNT(v.id) FILTER (WHERE v.status IN ('pending', 'assigned', 'in_progress')) AS active_visits
       FROM agents a
       LEFT JOIN visit_requests v ON v.agent_id = a.id AND v.status IN ('pending', 'assigned', 'in_progress')
       WHERE a.active = true AND a.region = $1
       GROUP BY a.id, a.name
       ORDER BY active_visits ASC, a.name ASC
       LIMIT 1`,
      [region]
    );
    if (regional.rows[0]) return regional.rows[0];
  }

  // Fallback: any active agent with the fewest pending visits
  const anyAgent = await db.query(
    `SELECT a.id, a.name,
            COUNT(v.id) FILTER (WHERE v.status IN ('pending', 'assigned', 'in_progress')) AS active_visits
     FROM agents a
     LEFT JOIN visit_requests v ON v.agent_id = a.id AND v.status IN ('pending', 'assigned', 'in_progress')
     WHERE a.active = true
     GROUP BY a.id, a.name
     ORDER BY active_visits ASC, a.name ASC
     LIMIT 1`
  );
  return anyAgent.rows[0] || null;
}

// ── Helper: create a notification row ──
async function createNotification({ ownerId, agentId, title, body }) {
  await db.query(
    `INSERT INTO notifications (owner_id, agent_id, title, body) VALUES ($1, $2, $3, $4)`,
    [ownerId || null, agentId || null, title, body || null]
  );
}

// GET /visit-requests/my-stats — agent's own dashboard stats
exports.myStats = async (req, res, next) => {
  try {
    const agentId = req.user.id;

    const statusCounts = await db.query(
      `SELECT status, COUNT(*) as count
       FROM visit_requests WHERE agent_id = $1
       GROUP BY status`,
      [agentId]
    );

    const totalResult = await db.query(
      'SELECT COUNT(*) as total FROM visit_requests WHERE agent_id = $1',
      [agentId]
    );

    const completedResult = await db.query(
      "SELECT COUNT(*) as completed FROM visit_requests WHERE agent_id = $1 AND status = 'completed'",
      [agentId]
    );

    const pendingResult = await db.query(
      "SELECT COUNT(*) as pending FROM visit_requests WHERE agent_id = $1 AND status IN ('pending', 'assigned')",
      [agentId]
    );

    const inProgressResult = await db.query(
      "SELECT COUNT(*) as in_progress FROM visit_requests WHERE agent_id = $1 AND status = 'in_progress'",
      [agentId]
    );

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

    const mediaResult = await db.query(
      `SELECT COUNT(*) as media_count FROM media m
       JOIN visit_requests v ON m.visit_request_id = v.id
       WHERE v.agent_id = $1`,
      [agentId]
    );

    // Available (unassigned) visits in the agent's region
    const agentRow = await db.query('SELECT region FROM agents WHERE id = $1', [agentId]);
    const agentRegion = agentRow.rows[0]?.region;
    let availableCount = 0;
    if (agentRegion) {
      const availResult = await db.query(
        `SELECT COUNT(*) as cnt FROM visit_requests v
         JOIN parcels p ON v.parcel_id = p.id
         WHERE v.agent_id IS NULL AND v.status = 'pending' AND p.region = $1`,
        [agentRegion]
      );
      availableCount = parseInt(availResult.rows[0]?.cnt, 10) || 0;
    }

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
      available: availableCount,
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

// GET /visit-requests/available — unassigned visits in the agent's region
exports.available = async (req, res, next) => {
  try {
    const agentId = req.user.id;
    const agentRow = await db.query('SELECT region FROM agents WHERE id = $1', [agentId]);
    const region = agentRow.rows[0]?.region;

    let query, params;
    if (region) {
      query = `SELECT v.id, v.type, v.status, v.requested_at, v.scheduled_at,
                      p.name as parcel_name, p.region, p.area_sqm,
                      o.name as owner_name, o.phone as owner_phone
               FROM visit_requests v
               JOIN parcels p ON v.parcel_id = p.id
               JOIN owners o ON v.owner_id = o.id
               WHERE v.agent_id IS NULL AND v.status = 'pending' AND p.region = $1
               ORDER BY v.requested_at ASC`;
      params = [region];
    } else {
      // No region set — show all unassigned
      query = `SELECT v.id, v.type, v.status, v.requested_at, v.scheduled_at,
                      p.name as parcel_name, p.region, p.area_sqm,
                      o.name as owner_name, o.phone as owner_phone
               FROM visit_requests v
               JOIN parcels p ON v.parcel_id = p.id
               JOIN owners o ON v.owner_id = o.id
               WHERE v.agent_id IS NULL AND v.status = 'pending'
               ORDER BY v.requested_at ASC`;
      params = [];
    }

    const result = await db.query(query, params);
    res.json(result.rows);
  } catch (err) {
    next(err);
  }
};

// POST /visit-requests/:id/claim — agent claims an unassigned visit
exports.claim = async (req, res, next) => {
  try {
    const visitId = req.params.id;
    const agentId = req.user.id;

    // Atomically claim the visit only if it's still unassigned
    const result = await db.query(
      `UPDATE visit_requests
       SET agent_id = $1, status = 'assigned'
       WHERE id = $2 AND agent_id IS NULL AND status = 'pending'
       RETURNING *`,
      [agentId, visitId]
    );

    if (!result.rows[0]) {
      return res.status(409).json({ error: 'This visit has already been claimed or is no longer available' });
    }

    const visit = result.rows[0];

    // Get parcel + owner info for the notification
    const infoResult = await db.query(
      `SELECT p.name as parcel_name, o.name as owner_name
       FROM visit_requests v
       JOIN parcels p ON v.parcel_id = p.id
       JOIN owners o ON v.owner_id = o.id
       WHERE v.id = $1`,
      [visitId]
    );
    const info = infoResult.rows[0];

    // Notify the owner that their visit has been assigned
    await createNotification({
      ownerId: visit.owner_id,
      agentId: null,
      title: 'Visit assigned to agent',
      body: `Your ${visit.type} visit for "${info?.parcel_name || 'your parcel'}" has been assigned to an agent.`,
    });

    // Notify the agent (confirmation)
    const agentRow = await db.query('SELECT name FROM agents WHERE id = $1', [agentId]);
    await createNotification({
      ownerId: null,
      agentId,
      title: 'Visit claimed successfully',
      body: `You claimed the ${visit.type} visit for "${info?.parcel_name || 'a parcel'}".`,
    });

    bus.emit('visit:status', { visit, ownerId: visit.owner_id, agentId });
    logger.info({ visitId, agentId }, 'Visit claimed by agent');

    res.json(visit);
  } catch (err) {
    next(err);
  }
};

// GET /visit-requests/unassigned — admin sees all unassigned visits
exports.unassigned = async (req, res, next) => {
  try {
    const result = await db.query(
      `SELECT v.id, v.type, v.status, v.requested_at, v.scheduled_at,
              p.name as parcel_name, p.region, p.area_sqm,
              o.name as owner_name, o.phone as owner_phone,
              (SELECT json_agg(json_build_object('id', a.id, 'name', a.name, 'region', a.region, 'active_visits', cnt))
               FROM (
                 SELECT a.id, a.name, a.region,
                        COUNT(v2.id) FILTER (WHERE v2.status IN ('pending', 'assigned', 'in_progress')) AS cnt
                 FROM agents a
                 LEFT JOIN visit_requests v2 ON v2.agent_id = a.id AND v2.status IN ('pending', 'assigned', 'in_progress')
                 WHERE a.active = true
                 GROUP BY a.id, a.name, a.region
               ) a) as candidate_agents
       FROM visit_requests v
       JOIN parcels p ON v.parcel_id = p.id
       JOIN owners o ON v.owner_id = o.id
       WHERE v.agent_id IS NULL AND v.status = 'pending'
       ORDER BY v.requested_at ASC`
    );
    res.json(result.rows);
  } catch (err) {
    next(err);
  }
};

// GET /visit-requests — scoped by role: owner sees own, agent sees assigned, admin sees all
exports.list = async (req, res, next) => {
  try {
    let query, params;
    if (req.user.role === 'owner') {
      query = `SELECT v.*, p.name as parcel_name, p.region,
                      o.name as owner_name, o.phone as owner_phone,
                      a.name as agent_name,
                      (SELECT COUNT(*) FROM media m WHERE m.visit_request_id = v.id) AS media_count
               FROM visit_requests v
               JOIN parcels p ON v.parcel_id = p.id
               JOIN owners o ON v.owner_id = o.id
               LEFT JOIN agents a ON v.agent_id = a.id
               WHERE v.owner_id = $1 ORDER BY v.requested_at DESC`;
      params = [req.user.id];
    } else if (req.user.role === 'agent') {
      query = `SELECT v.*, p.name as parcel_name, p.region,
                      o.name as owner_name, o.phone as owner_phone,
                      (SELECT COUNT(*) FROM media m WHERE m.visit_request_id = v.id) AS media_count
               FROM visit_requests v
               JOIN parcels p ON v.parcel_id = p.id
               JOIN owners o ON v.owner_id = o.id
               WHERE v.agent_id = $1 ORDER BY v.requested_at DESC`;
      params = [req.user.id];
    } else {
      query = `SELECT v.*, p.name as parcel_name, p.region,
                      o.name as owner_name, o.phone as owner_phone,
                      a.name as agent_name,
                      (SELECT COUNT(*) FROM media m WHERE m.visit_request_id = v.id) AS media_count
               FROM visit_requests v
               JOIN parcels p ON v.parcel_id = p.id
               JOIN owners o ON v.owner_id = o.id
               LEFT JOIN agents a ON v.agent_id = a.id
               ORDER BY v.requested_at DESC`;
      params = [];
    }
    const result = await db.query(query, params);
    res.json(result.rows);
  } catch (err) {
    next(err);
  }
};

// POST /visit-requests — owner requests a visit; auto-assigns agent by region
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

    // Find the best agent for this parcel's region
    const bestAgent = await findBestAgent(parcelId);
    const agentId = bestAgent?.id || null;
    const initialStatus = agentId ? 'assigned' : 'pending';

    const result = await db.query(
      `INSERT INTO visit_requests (parcel_id, owner_id, agent_id, type, status, scheduled_at, plan_credit_used)
       VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
      [parcel_id, req.user.id, agentId, type, initialStatus, scheduled_at || null, useCredit]
    );

    if (useCredit) {
      await db.query(
        `UPDATE subscriptions SET credits_remaining = credits_remaining - 1 WHERE id = $1`,
        [subscription.id]
      );
    }

    const visit = result.rows[0];

    // Get parcel name for notifications
    const parcelRow = await db.query('SELECT name, region FROM parcels WHERE id = $1', [parcel_id]);
    const parcelName = parcelRow.rows[0]?.name || 'your parcel';

    if (agentId) {
      // Notify the assigned agent
      await createNotification({
        ownerId: null,
        agentId,
        title: 'New visit assigned to you',
        body: `${type} visit for "${parcelName}" has been auto-assigned to you.`,
      });
      // Notify the owner
      await createNotification({
        ownerId: req.user.id,
        agentId: null,
        title: 'Visit request assigned',
        body: `Your ${type} visit for "${parcelName}" has been assigned to ${bestAgent.name}.`,
      });
      logger.info({ visitId: visit.id, agentId }, 'Visit auto-assigned to agent');
    } else {
      // No agent available — notify all active agents in the region (if any)
      logger.warn({ visitId: visit.id }, 'No active agent found for visit — left unassigned');
    }

    bus.emit('visit:status', { visit, ownerId: visit.owner_id, agentId: visit.agent_id });

    res.status(201).json(visit);
  } catch (err) {
    next(err);
  }
};

// PATCH /visit-requests/:id — agent/admin updates status, assigns agent, or saves notes
exports.updateStatus = async (req, res, next) => {
  try {
    const { status, agent_id, agent_notes, survey_session_id } = req.body;
    const fields = [];
    const values = [];
    let i = 1;
    if (status) { fields.push(`status = $${i++}`); values.push(status); }
    if (agent_id) { fields.push(`agent_id = $${i++}`); values.push(agent_id); }
    if (agent_notes !== undefined) { fields.push(`agent_notes = $${i++}`); values.push(agent_notes); }
    if (survey_session_id !== undefined) { fields.push(`survey_session_id = $${i++}`); values.push(survey_session_id); }
    if (status === 'completed') { fields.push(`completed_at = now()`); }
    if (status === 'assigned' && agent_id) {
      // Admin manually assigning — create notification for the agent
    }

    values.push(req.params.id);
    const result = await db.query(
      `UPDATE visit_requests SET ${fields.join(', ')} WHERE id = $${i} RETURNING *`,
      values
    );
    const visit = result.rows[0];

    if (!visit) return res.status(404).json({ error: 'Visit not found' });

    // If admin assigned an agent, notify them
    if (agent_id && status === 'assigned') {
      const parcelRow = await db.query(
        `SELECT p.name as parcel_name FROM visit_requests v JOIN parcels p ON v.parcel_id = p.id WHERE v.id = $1`,
        [req.params.id]
      );
      const parcelName = parcelRow.rows[0]?.parcel_name || 'a parcel';
      await createNotification({
        ownerId: null,
        agentId: agent_id,
        title: 'Visit assigned to you',
        body: `${visit.type} visit for "${parcelName}" has been assigned to you by an admin.`,
      });
      // Also notify the owner
      await createNotification({
        ownerId: visit.owner_id,
        agentId: null,
        title: 'Visit assigned',
        body: `Your ${visit.type} visit for "${parcelName}" has been assigned to an agent.`,
      });
    }

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

// GET /visit-requests/:id/media — retrieve all media for a visit (owner or agent)
exports.getMedia = async (req, res, next) => {
  try {
    const result = await db.query(
      `SELECT m.* FROM media m
       JOIN visit_requests v ON m.visit_request_id = v.id
       WHERE m.visit_request_id = $1
       ORDER BY m.uploaded_at ASC`,
      [req.params.id]
    );
    res.json(result.rows);
  } catch (err) {
    next(err);
  }
};

// GET /visit-requests/:id/detail — full visit detail with parcel, owner, agent, and media
exports.getDetail = async (req, res, next) => {
  try {
    const visitResult = await db.query(
      `SELECT v.*, p.name as parcel_name, p.region, p.area_sqm,
              ST_AsGeoJSON(p.boundary) as boundary_geojson,
              o.name as owner_name, o.phone as owner_phone,
              a.name as agent_name, a.phone as agent_phone, a.region as agent_region
       FROM visit_requests v
       JOIN parcels p ON v.parcel_id = p.id
       JOIN owners o ON v.owner_id = o.id
       LEFT JOIN agents a ON v.agent_id = a.id
       WHERE v.id = $1`,
      [req.params.id]
    );

    if (!visitResult.rows[0]) return res.status(404).json({ error: 'Visit not found' });

    const visit = visitResult.rows[0];

    // Authorization: owner can only see their own, agent can only see assigned
    if (req.user.role === 'owner' && !req.user.isSalesManager && visit.owner_id !== req.user.id) {
      return res.status(403).json({ error: 'Not authorized' });
    }
    if (req.user.role === 'agent' && visit.agent_id !== req.user.id) {
      return res.status(403).json({ error: 'Not authorized' });
    }

    // Fetch media
    const mediaResult = await db.query(
      `SELECT * FROM media WHERE visit_request_id = $1 ORDER BY uploaded_at ASC`,
      [req.params.id]
    );

    visit.media = mediaResult.rows;
    visit.media_count = mediaResult.rows.length;
    // Parse boundary GeoJSON for the map
    if (visit.boundary_geojson) {
      visit.boundary = JSON.parse(visit.boundary_geojson);
      visit.boundary_geojson = undefined;
    }

    res.json(visit);
  } catch (err) {
    next(err);
  }
};
