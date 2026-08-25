/**
 * Profile Controller
 *
 * Handles user profile operations for ALL roles:
 *   - owners, agents, admins (super_admin + finance_officer), assembly_users
 *
 * All endpoints use the JWT payload to determine which table to query,
 * so the same endpoints work regardless of the caller's role.
 */
const bcrypt = require('bcrypt');
const db = require('../config/db');

// ── Map role → table name + role-specific columns ──
const ROLE_TABLES = {
  owner: {
    table: 'owners',
    // Columns that can be read/updated via profile
    profileColumns: 'id, name, email, phone, avatar_url, bio, address, region, account_type, is_sales_manager, approved, created_at, notification_email, notification_sms, notification_push',
    editableFields: ['name', 'phone', 'avatar_url', 'bio', 'address', 'region', 'notification_email', 'notification_sms', 'notification_push'],
  },
  agent: {
    table: 'agents',
    profileColumns: 'id, name, email, phone, region, avatar_url, bio, address, active, created_at, notification_email, notification_push',
    editableFields: ['name', 'phone', 'avatar_url', 'bio', 'address', 'notification_email', 'notification_push'],
  },
  admin: {
    table: 'admins',
    profileColumns: 'id, name, email, phone, role as admin_role, avatar_url, bio, created_at, notification_email',
    editableFields: ['name', 'phone', 'avatar_url', 'bio', 'notification_email'],
  },
  assembly: {
    table: 'assembly_users',
    profileColumns: 'id, name, email, phone, role as assembly_role, avatar_url, bio, address, active, created_at, organization_id, notification_email, notification_push',
    editableFields: ['name', 'phone', 'avatar_url', 'bio', 'address', 'notification_email', 'notification_push'],
  },
};

// GET /auth/me — returns the current user's full profile based on JWT role
exports.getMe = async (req, res, next) => {
  try {
    const config = ROLE_TABLES[req.user.role];
    if (!config) return res.status(400).json({ error: 'Unknown role' });

    const result = await db.query(
      `SELECT ${config.profileColumns} FROM ${config.table} WHERE id = $1`,
      [req.user.id]
    );
    if (!result.rows[0]) return res.status(404).json({ error: 'User not found' });

    const profile = result.rows[0];
    // Include role + sub-role info from JWT for the frontend
    const response = {
      ...profile,
      role: req.user.role,
      adminRole: req.user.adminRole || null,
      assemblyRole: req.user.assemblyRole || null,
      organizationId: req.user.organizationId || profile.organization_id || null,
    };

    // For assembly users, fetch org name
    if (req.user.role === 'assembly' && profile.organization_id) {
      const orgResult = await db.query('SELECT name, type, region FROM organizations WHERE id = $1', [profile.organization_id]);
      if (orgResult.rows[0]) {
        response.organization = orgResult.rows[0];
      }
    }

    res.json(response);
  } catch (err) {
    next(err);
  }
};

// PATCH /profile — update profile fields (name, phone, avatar, bio, address, notification prefs)
exports.updateProfile = async (req, res, next) => {
  try {
    const config = ROLE_TABLES[req.user.role];
    if (!config) return res.status(400).json({ error: 'Unknown role' });

    const allowedFields = config.editableFields;
    const updates = [];
    const params = [];
    let pc = 1;

    for (const field of allowedFields) {
      if (req.body[field] !== undefined) {
        // Booleans need explicit cast
        const val = typeof req.body[field] === 'boolean' ? req.body[field] : req.body[field];
        params.push(val);
        updates.push(`${field} = $${pc++}`);
      }
    }

    if (updates.length === 0) {
      return res.status(400).json({ error: 'No valid fields to update' });
    }

    params.push(req.user.id);

    const result = await db.query(
      `UPDATE ${config.table} SET ${updates.join(', ')} WHERE id = $${pc} RETURNING ${config.profileColumns}`,
      params
    );

    if (!result.rows[0]) return res.status(404).json({ error: 'User not found' });

    const profile = result.rows[0];
    res.json({
      ...profile,
      role: req.user.role,
      adminRole: req.user.adminRole || null,
      assemblyRole: req.user.assemblyRole || null,
      organizationId: req.user.organizationId || profile.organization_id || null,
    });
  } catch (err) {
    next(err);
  }
};

// PATCH /profile/password — change password (requires current_password)
exports.changePassword = async (req, res, next) => {
  try {
    const config = ROLE_TABLES[req.user.role];
    if (!config) return res.status(400).json({ error: 'Unknown role' });

    const { current_password, new_password } = req.body;
    if (!current_password || !new_password) {
      return res.status(400).json({ error: 'Current password and new password are required' });
    }
    if (new_password.length < 6) {
      return res.status(400).json({ error: 'New password must be at least 6 characters' });
    }

    // Fetch current password hash
    const result = await db.query(
      `SELECT password_hash FROM ${config.table} WHERE id = $1`,
      [req.user.id]
    );
    if (!result.rows[0]) return res.status(404).json({ error: 'User not found' });

    const valid = await bcrypt.compare(current_password, result.rows[0].password_hash);
    if (!valid) return res.status(401).json({ error: 'Current password is incorrect' });

    const newHash = await bcrypt.hash(new_password, 10);
    await db.query(
      `UPDATE ${config.table} SET password_hash = $1 WHERE id = $2`,
      [newHash, req.user.id]
    );

    res.json({ success: true, message: 'Password changed successfully' });
  } catch (err) {
    next(err);
  }
};

// GET /profile/stats — role-specific stats for the profile page
exports.getStats = async (req, res, next) => {
  try {
    const role = req.user.role;
    const userId = req.user.id;
    let stats = {};

    if (role === 'owner') {
      const [parcels, alerts, visits, subscriptions] = await Promise.all([
        db.query('SELECT COUNT(*) AS count FROM parcels WHERE owner_id = $1', [userId]),
        db.query('SELECT COUNT(*) AS total, COUNT(*) FILTER (WHERE a.verified = false) AS unverified FROM alerts a JOIN parcels p ON a.parcel_id = p.id WHERE p.owner_id = $1', [userId]),
        db.query('SELECT COUNT(*) AS total, COUNT(*) FILTER (WHERE status = \'completed\') AS completed FROM visit_requests WHERE owner_id = $1', [userId]),
        db.query('SELECT COUNT(*) AS count, MAX(created_at) AS latest FROM subscriptions WHERE owner_id = $1 AND status = \'active\'', [userId]),
      ]);
      stats = {
        parcels: parseInt(parcels.rows[0].count, 10),
        alerts: { total: parseInt(alerts.rows[0].total, 10), unverified: parseInt(alerts.rows[0].unverified, 10) },
        visits: { total: parseInt(visits.rows[0].total, 10), completed: parseInt(visits.rows[0].completed, 10) },
        active_subscriptions: parseInt(subscriptions.rows[0].count, 10),
        member_since: null, // filled below
      };
    } else if (role === 'agent') {
      const [visits, completed, media] = await Promise.all([
        db.query('SELECT COUNT(*) AS count FROM visit_requests WHERE agent_id = $1', [userId]),
        db.query('SELECT COUNT(*) AS count FROM visit_requests WHERE agent_id = $1 AND status = \'completed\'', [userId]),
        db.query('SELECT COUNT(*) AS count FROM media m JOIN visit_requests v ON v.id = m.visit_request_id WHERE v.agent_id = $1', [userId]),
      ]);
      stats = {
        assigned_visits: parseInt(visits.rows[0].count, 10),
        completed_visits: parseInt(completed.rows[0].count, 10),
        media_uploads: parseInt(media.rows[0].count, 10),
      };
    } else if (role === 'admin') {
      const [owners, agents, parcels] = await Promise.all([
        db.query('SELECT COUNT(*) AS count FROM owners'),
        db.query('SELECT COUNT(*) AS count FROM agents'),
        db.query('SELECT COUNT(*) AS count FROM parcels'),
      ]);
      stats = {
        total_owners: parseInt(owners.rows[0].count, 10),
        total_agents: parseInt(agents.rows[0].count, 10),
        total_parcels: parseInt(parcels.rows[0].count, 10),
      };
    } else if (role === 'assembly') {
      const orgId = req.user.organizationId;
      if (orgId) {
        const [parcels, permits, listings] = await Promise.all([
          db.query('SELECT COUNT(*) AS count FROM parcels WHERE organization_id = $1', [orgId]),
          db.query('SELECT COUNT(*) AS count FROM building_permits WHERE organization_id = $1', [orgId]),
          db.query('SELECT COUNT(*) AS count FROM land_listings WHERE organization_id = $1', [orgId]),
        ]);
        stats = {
          org_parcels: parseInt(parcels.rows[0].count, 10),
          org_permits: parseInt(permits.rows[0].count, 10),
          org_listings: parseInt(listings.rows[0].count, 10),
        };
      }
    }

    // Add member_since from the user's record
    const config = ROLE_TABLES[role];
    const userResult = await db.query(`SELECT created_at FROM ${config.table} WHERE id = $1`, [userId]);
    if (userResult.rows[0]) {
      stats.member_since = userResult.rows[0].created_at;
    }

    res.json(stats);
  } catch (err) {
    next(err);
  }
};
