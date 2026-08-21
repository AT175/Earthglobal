const jwt = require('jsonwebtoken');

function requireAuth(req, res, next) {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Missing or invalid Authorization header' });
  }
  const token = header.split(' ')[1];
  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    req.user = payload; // { id, role: 'owner' | 'agent' | 'admin' }
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
}

function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({ error: 'Forbidden' });
    }
    next();
  };
}

// Fine-grained assembly role check (assembly_admin, planning_officer, etc.)
function requireAssemblyRole(...assemblyRoles) {
  return (req, res, next) => {
    if (!req.user || req.user.role !== 'assembly') {
      return res.status(403).json({ error: 'Forbidden — assembly account required' });
    }
    if (!assemblyRoles.includes(req.user.assemblyRole)) {
      return res.status(403).json({ error: 'Forbidden — insufficient permissions for this action' });
    }
    next();
  };
}

module.exports = { requireAuth, requireRole, requireAssemblyRole };
