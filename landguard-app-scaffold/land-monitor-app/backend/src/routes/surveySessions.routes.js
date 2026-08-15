const express = require('express');
const router = express.Router();
const multer = require('multer');
const { requireAuth, requireRole } = require('../middleware/auth');
const controller = require('../controllers/surveySessions.controller');

const upload = multer({ storage: multer.memoryStorage() });

router.post('/', requireAuth, requireRole('admin', 'agent'), controller.start);
router.patch('/:id', requireAuth, requireRole('admin', 'agent'), controller.update);
router.post('/:id/sync', requireAuth, requireRole('admin', 'agent'), controller.syncPoints);
router.post('/:id/finalize', requireAuth, requireRole('admin', 'agent'), controller.finalize);
router.post('/import', requireAuth, requireRole('admin', 'agent'), upload.single('file'), controller.importFile);

module.exports = router;
