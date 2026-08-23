const db = require('../config/db');
const bcrypt = require('bcrypt');

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

// ═══════════════════════════════════════════════════════════
// USER MANAGEMENT
// ═══════════════════════════════════════════════════════════

// GET /admin/users — list all users across roles
exports.listUsers = async (req, res, next) => {
  try {
    const { role } = req.query;
    const results = {};

    if (!role || role === 'owner') {
      const owners = await db.query('SELECT id, name, email, phone, approved, created_at FROM owners ORDER BY created_at DESC');
      results.owners = owners.rows;
    }
    if (!role || role === 'agent') {
      const agents = await db.query('SELECT id, name, email, phone, region, active, created_at FROM agents ORDER BY created_at DESC');
      results.agents = agents.rows;
    }
    if (!role || role === 'admin') {
      const admins = await db.query('SELECT id, name, email, role, created_at FROM admins ORDER BY created_at DESC');
      results.admins = admins.rows;
    }
    if (!role || role === 'assembly') {
      const assembly = await db.query(
        `SELECT a.id, a.name, a.email, a.phone, a.role as assembly_role, a.active, a.created_at, o.name as org_name
         FROM assembly_users a LEFT JOIN organizations o ON a.organization_id = o.id
         ORDER BY a.created_at DESC`
      );
      results.assembly = assembly.rows;
    }

    res.json(results);
  } catch (err) {
    next(err);
  }
};

// PATCH /admin/users/owner/:id — approve/reject owner
exports.updateOwner = async (req, res, next) => {
  try {
    const { approved } = req.body;
    const result = await db.query(
      'UPDATE owners SET approved = $1 WHERE id = $2 RETURNING id, name, email, phone, approved',
      [approved, req.params.id]
    );
    if (!result.rows[0]) return res.status(404).json({ error: 'Owner not found' });
    res.json(result.rows[0]);
  } catch (err) {
    next(err);
  }
};

// DELETE /admin/users/owner/:id — delete owner
exports.deleteOwner = async (req, res, next) => {
  try {
    const result = await db.query('DELETE FROM owners WHERE id = $1 RETURNING id', [req.params.id]);
    if (!result.rows[0]) return res.status(404).json({ error: 'Owner not found' });
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
};

// POST /admin/users/admin — create admin account
// role: 'super_admin' (full platform access) | 'finance_officer' (finance dashboard only)
exports.createAdmin = async (req, res, next) => {
  try {
    const { name, email, password, role } = req.body;
    if (!name || !email || !password) return res.status(400).json({ error: 'Name, email, and password are required' });

    const adminRole = role === 'finance_officer' ? 'finance_officer' : 'super_admin';

    const hash = await bcrypt.hash(password, 10);
    const result = await db.query(
      'INSERT INTO admins (name, email, password_hash, role) VALUES ($1, $2, $3, $4) RETURNING id, name, email, role, created_at',
      [name, email, hash, adminRole]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    if (err.code === '23505') return res.status(409).json({ error: 'Email already exists' });
    next(err);
  }
};

// DELETE /admin/users/admin/:id — delete admin
exports.deleteAdmin = async (req, res, next) => {
  try {
    const result = await db.query('DELETE FROM admins WHERE id = $1 RETURNING id', [req.params.id]);
    if (!result.rows[0]) return res.status(404).json({ error: 'Admin not found' });
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
};

// ═══════════════════════════════════════════════════════════
// ORGANIZATION (ASSEMBLY TENANT) MANAGEMENT
// ═══════════════════════════════════════════════════════════

// GET /admin/organizations — list all organizations
exports.listOrganizations = async (req, res, next) => {
  try {
    const result = await db.query(
      `SELECT o.id, o.name, o.type, o.region, o.contact_email, o.contact_phone, o.address, o.active, o.created_at,
              (SELECT COUNT(*) FROM assembly_users WHERE organization_id = o.id) as user_count,
              (SELECT COUNT(*) FROM parcels WHERE organization_id = o.id) as parcel_count
       FROM organizations o ORDER BY o.created_at DESC`
    );
    res.json(result.rows);
  } catch (err) {
    next(err);
  }
};

// POST /admin/organizations — create a new organization (district assembly)
exports.createOrganization = async (req, res, next) => {
  try {
    const { name, type, region, contact_email, contact_phone, address } = req.body;
    if (!name || !region) return res.status(400).json({ error: 'Name and region are required' });

    const result = await db.query(
      `INSERT INTO organizations (name, type, region, contact_email, contact_phone, address)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING id, name, type, region, contact_email, contact_phone, address, active, created_at`,
      [name, type || 'district_assembly', region, contact_email, contact_phone, address]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    next(err);
  }
};

// PATCH /admin/organizations/:id — update organization
exports.updateOrganization = async (req, res, next) => {
  try {
    const { name, type, region, contact_email, contact_phone, address, active } = req.body;
    const result = await db.query(
      `UPDATE organizations SET
         name = COALESCE($1, name),
         type = COALESCE($2, type),
         region = COALESCE($3, region),
         contact_email = COALESCE($4, contact_email),
         contact_phone = COALESCE($5, contact_phone),
         address = COALESCE($6, address),
         active = COALESCE($7, active)
       WHERE id = $8 RETURNING *`,
      [name, type, region, contact_email, contact_phone, address, active, req.params.id]
    );
    if (!result.rows[0]) return res.status(404).json({ error: 'Organization not found' });
    res.json(result.rows[0]);
  } catch (err) {
    next(err);
  }
};

// DELETE /admin/organizations/:id — delete organization
exports.deleteOrganization = async (req, res, next) => {
  try {
    const result = await db.query('DELETE FROM organizations WHERE id = $1 RETURNING id', [req.params.id]);
    if (!result.rows[0]) return res.status(404).json({ error: 'Organization not found' });
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
};

// GET /admin/organizations/:id/users — list assembly users in an organization
exports.listAssemblyUsers = async (req, res, next) => {
  try {
    const result = await db.query(
      `SELECT id, name, email, phone, role as assembly_role, active, created_at
       FROM assembly_users WHERE organization_id = $1 ORDER BY created_at DESC`,
      [req.params.id]
    );
    res.json(result.rows);
  } catch (err) {
    next(err);
  }
};

// POST /admin/organizations/:id/users — create an assembly user for an organization
exports.createAssemblyUser = async (req, res, next) => {
  try {
    const { name, email, phone, password, role } = req.body;
    if (!name || !email || !password) return res.status(400).json({ error: 'Name, email, and password are required' });

    const hash = await bcrypt.hash(password, 10);
    const result = await db.query(
      `INSERT INTO assembly_users (organization_id, name, email, phone, password_hash, role)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING id, name, email, phone, role as assembly_role, active, created_at`,
      [req.params.id, name, email, phone, hash, role || 'planning_officer']
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    if (err.code === '23505') return res.status(409).json({ error: 'Email already exists' });
    next(err);
  }
};

// PATCH /admin/organizations/:id/users/:userId — update assembly user
exports.updateAssemblyUser = async (req, res, next) => {
  try {
    const { name, phone, role, active } = req.body;
    const result = await db.query(
      `UPDATE assembly_users SET
         name = COALESCE($1, name),
         phone = COALESCE($2, phone),
         role = COALESCE($3, role),
         active = COALESCE($4, active)
       WHERE id = $5 AND organization_id = $6
       RETURNING id, name, email, phone, role as assembly_role, active`,
      [name, phone, role, active, req.params.userId, req.params.id]
    );
    if (!result.rows[0]) return res.status(404).json({ error: 'Assembly user not found' });
    res.json(result.rows[0]);
  } catch (err) {
    next(err);
  }
};

// DELETE /admin/organizations/:id/users/:userId — delete assembly user
exports.deleteAssemblyUser = async (req, res, next) => {
  try {
    const result = await db.query(
      'DELETE FROM assembly_users WHERE id = $1 AND organization_id = $2 RETURNING id',
      [req.params.userId, req.params.id]
    );
    if (!result.rows[0]) return res.status(404).json({ error: 'Assembly user not found' });
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
};
