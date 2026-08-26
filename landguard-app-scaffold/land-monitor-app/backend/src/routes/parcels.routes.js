const express = require('express');
const router = express.Router();
const { requireAuth, requireRole } = require('../middleware/auth');
const parcelsController = require('../controllers/parcels.controller');

router.get('/', requireAuth, parcelsController.listForOwner);
router.get('/:id', requireAuth, parcelsController.getById);
router.get('/:id/satellite', requireAuth, parcelsController.captureSatellite);
router.get('/:id/images', requireAuth, parcelsController.listImages);
router.get('/:id/media', requireAuth, parcelsController.listMedia);
router.get('/:id/alert-trends', requireAuth, parcelsController.alertTrends);
router.get('/:id/buildings', requireAuth, parcelsController.listBuildings);
router.post('/', requireAuth, requireRole('admin', 'agent'), parcelsController.create);
router.patch('/:id', requireAuth, requireRole('admin', 'agent'), parcelsController.update);
router.delete('/:id', requireAuth, requireRole('admin'), parcelsController.remove);

module.exports = router;
