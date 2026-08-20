const express = require('express');
const router = express.Router();
const { requireAuth, requireRole } = require('../middleware/auth');
const ctrl = require('../controllers/admin.controller');

router.use(requireAuth, requireRole('admin'));

router.get('/stats', ctrl.getStats);
router.get('/recent-activity', ctrl.getRecentActivity);

module.exports = router;
