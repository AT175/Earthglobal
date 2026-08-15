const express = require('express');
const router = express.Router();
const { requireAuth } = require('../middleware/auth');
const controller = require('../controllers/alerts.controller');

router.get('/:id/alerts', requireAuth, controller.listForParcel);
router.patch('/alerts/:alertId', requireAuth, controller.verify);

module.exports = router;
