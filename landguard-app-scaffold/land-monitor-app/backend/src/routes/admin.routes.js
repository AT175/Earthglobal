const express = require('express');
const router = express.Router();
const { requireAuth, requireRole, requireAdminRole } = require('../middleware/auth');
const ctrl = require('../controllers/admin.controller');

router.use(requireAuth, requireRole('admin'));

// Dashboard
router.get('/stats', ctrl.getStats);
router.get('/recent-activity', ctrl.getRecentActivity);

// User management
router.get('/users', ctrl.listUsers);
router.patch('/users/owner/:id', ctrl.updateOwner);
router.delete('/users/owner/:id', ctrl.deleteOwner);
// Admin account creation/deletion is restricted to super_admin only
router.post('/users/admin', requireAdminRole('super_admin'), ctrl.createAdmin);
router.delete('/users/admin/:id', requireAdminRole('super_admin'), ctrl.deleteAdmin);

// Organization (assembly tenant) management
router.get('/organizations', ctrl.listOrganizations);
router.post('/organizations', ctrl.createOrganization);
router.patch('/organizations/:id', ctrl.updateOrganization);
router.delete('/organizations/:id', ctrl.deleteOrganization);

// Assembly users within an organization
router.get('/organizations/:id/users', ctrl.listAssemblyUsers);
router.post('/organizations/:id/users', ctrl.createAssemblyUser);
router.patch('/organizations/:id/users/:userId', ctrl.updateAssemblyUser);
router.delete('/organizations/:id/users/:userId', ctrl.deleteAssemblyUser);

module.exports = router;
