const express = require('express');
const router = express.Router();
const { requireAuth, requireRole } = require('../middleware/auth');
const controller = require('../controllers/agents.controller');

router.get('/', requireAuth, requireRole('admin'), controller.list);
router.get('/stats', requireAuth, requireRole('admin'), controller.stats);
router.post('/', requireAuth, requireRole('admin'), controller.create);
router.patch('/:id', requireAuth, requireRole('admin'), controller.update);
router.delete('/:id', requireAuth, requireRole('admin'), controller.remove);

module.exports = router;
