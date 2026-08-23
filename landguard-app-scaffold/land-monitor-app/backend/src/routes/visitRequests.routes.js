const express = require('express');
const router = express.Router();
const multer = require('multer');
const { requireAuth, requireRole } = require('../middleware/auth');
const controller = require('../controllers/visitRequests.controller');

const upload = multer({ storage: multer.memoryStorage() });

router.get('/', requireAuth, controller.list);
router.get('/my-stats', requireAuth, requireRole('agent'), controller.myStats);
router.get('/available', requireAuth, requireRole('agent'), controller.available);
router.get('/unassigned', requireAuth, requireRole('admin'), controller.unassigned);
router.post('/:id/claim', requireAuth, requireRole('agent'), controller.claim);
router.post('/', requireAuth, controller.create);
router.patch('/:id', requireAuth, controller.updateStatus);
router.post('/:id/media', requireAuth, upload.single('file'), controller.uploadMedia);

module.exports = router;
