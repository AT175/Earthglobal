const express = require('express');
const router = express.Router();
const { requireAuth, requireRole } = require('../middleware/auth');
const controller = require('../controllers/agents.controller');

router.get('/', requireAuth, requireRole('admin'), controller.list);
router.get('/stats', requireAuth, requireRole('admin'), controller.stats);

module.exports = router;
