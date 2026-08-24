const express = require('express');
const router = express.Router();
const { requireAuth, requireRole, requireAssemblyRole } = require('../middleware/auth');
const ctrl = require('../controllers/sitePlan.controller');

// All routes require authentication
router.use(requireAuth);

// ═══════════════════════════════════════════════════════════
// SITE PLANS
// ═══════════════════════════════════════════════════════════

// Generate a site plan (any authenticated user)
router.post('/generate', ctrl.generate);

// List site plans (role-scoped)
router.get('/', ctrl.list);

// Get single site plan
router.get('/:id', ctrl.getById);

// Certify a plan (assembly only)
router.patch('/:id/certify', requireRole('assembly'), requireAssemblyRole('assembly_admin', 'planning_officer'), ctrl.certify);

// Reject a plan (assembly only)
router.patch('/:id/reject', requireRole('assembly'), requireAssemblyRole('assembly_admin', 'planning_officer'), ctrl.reject);

// Delete a plan
router.delete('/:id', ctrl.remove);

// ═══════════════════════════════════════════════════════════
// SITE PLAN REQUESTS
// ═══════════════════════════════════════════════════════════

// Create a request (owner only)
router.post('/requests', requireRole('owner'), ctrl.createRequest);

// List requests (role-scoped)
router.get('/requests/list', ctrl.listRequests);

// Update a request (assembly only)
router.patch('/requests/:id', requireRole('assembly'), requireAssemblyRole('assembly_admin', 'planning_officer'), ctrl.updateRequest);

module.exports = router;
