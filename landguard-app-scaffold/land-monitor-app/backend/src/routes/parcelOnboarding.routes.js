const express = require('express');
const router = express.Router();
const { requireAuth, requireRole } = require('../middleware/auth');
const ctrl = require('../controllers/parcelOnboarding.controller');

router.use(requireAuth);

// Owner creates an onboarding request for a new parcel
router.post('/', requireRole('owner'), ctrl.createRequest);

// List requests (role-scoped: owner sees own, agent sees assigned, admin sees all)
router.get('/', requireRole('owner', 'admin', 'agent'), ctrl.listRequests);

// Get a single request
router.get('/:id', requireRole('owner', 'admin', 'agent'), ctrl.getById);

// Admin updates status (reject / mark in_review / assign)
router.patch('/:id', requireRole('admin'), ctrl.updateStatus);

// Admin finalizes the survey and onboards the parcel
router.post('/:id/onboard', requireRole('admin'), ctrl.onboard);

module.exports = router;
