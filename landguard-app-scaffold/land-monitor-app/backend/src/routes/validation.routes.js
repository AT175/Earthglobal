const express = require('express');
const router = express.Router();
const multer = require('multer');
const { requireAuth, requireRole, requireAssemblyRole } = require('../middleware/auth');
const ctrl = require('../controllers/validation.controller');

const upload = multer({ storage: multer.memoryStorage() });

// ═══════════════════════════════════════════════════════════
// REQUESTER ROUTES (owners + external customers)
// Any authenticated user can submit a validation request
// ═══════════════════════════════════════════════════════════
router.post('/request', requireAuth, ctrl.createValidationRequest);
router.get('/my-requests', requireAuth, ctrl.listMyValidationRequests);
router.get('/my-requests/:id', requireAuth, ctrl.getMyValidationRequest);
router.get('/my-requests/:id/report', requireAuth, ctrl.downloadMyReport);
router.get('/my-requests/:id/kml', requireAuth, ctrl.downloadMyKML);

// ═══════════════════════════════════════════════════════════
// PLANNER ROUTES (planning_officer + assembly_admin)
// ═══════════════════════════════════════════════════════════
router.get('/planner/requests', requireAuth, requireRole('assembly'), requireAssemblyRole('assembly_admin', 'planning_officer'), ctrl.listValidationRequests);
router.get('/planner/requests/:id', requireAuth, requireRole('assembly'), requireAssemblyRole('assembly_admin', 'planning_officer'), ctrl.getValidationRequest);
router.post('/planner/search', requireAuth, requireRole('assembly'), requireAssemblyRole('assembly_admin', 'planning_officer'), ctrl.searchParcels);
router.patch('/planner/requests/:id/validate', requireAuth, requireRole('assembly'), requireAssemblyRole('assembly_admin', 'planning_officer'), ctrl.validateRequest);
router.post('/planner/requests/:id/certify', requireAuth, requireRole('assembly'), requireAssemblyRole('assembly_admin', 'planning_officer'), ctrl.certifyRequest);

// Stamp + signature management
router.get('/planner/stamp', requireAuth, requireRole('assembly'), requireAssemblyRole('assembly_admin', 'planning_officer'), ctrl.getStamp);
router.post('/planner/stamp', requireAuth, requireRole('assembly'), requireAssemblyRole('assembly_admin', 'planning_officer'),
  upload.fields([{ name: 'stamp', maxCount: 1 }, { name: 'signature', maxCount: 1 }]), ctrl.uploadStamp);
router.get('/planner/stamp/image/:type', requireAuth, requireRole('assembly'), requireAssemblyRole('assembly_admin', 'planning_officer'), ctrl.getStampImage);

module.exports = router;
