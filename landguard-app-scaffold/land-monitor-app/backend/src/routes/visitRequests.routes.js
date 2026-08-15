const express = require('express');
const router = express.Router();
const multer = require('multer');
const { requireAuth } = require('../middleware/auth');
const controller = require('../controllers/visitRequests.controller');

const upload = multer({ storage: multer.memoryStorage() });

router.get('/', requireAuth, controller.list);
router.post('/', requireAuth, controller.create);
router.patch('/:id', requireAuth, controller.updateStatus);
router.post('/:id/media', requireAuth, upload.single('file'), controller.uploadMedia);

module.exports = router;
