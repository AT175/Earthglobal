const express = require('express');
const router = express.Router();
const { requireAuth, requireRole } = require('../middleware/auth');
const parcelsController = require('../controllers/parcels.controller');

router.get('/', requireAuth, parcelsController.listForOwner);
router.get('/:id', requireAuth, parcelsController.getById);
router.post('/', requireAuth, requireRole('admin', 'agent'), parcelsController.create);
router.patch('/:id', requireAuth, requireRole('admin', 'agent'), parcelsController.update);
router.delete('/:id', requireAuth, requireRole('admin'), parcelsController.remove);

module.exports = router;
