const express = require('express');
const router = express.Router();
const { requireAuth } = require('../middleware/auth');
const controller = require('../controllers/payments.controller');

router.post('/charge', requireAuth, controller.charge);
// Webhook: no requireAuth — verified via provider signature instead. In production this route
// needs the raw request body (express.raw()), mounted before the global JSON parser.
router.post('/webhook', controller.webhook);

module.exports = router;
