const express = require('express');
const router = express.Router();
const { requireAuth } = require('../middleware/auth');
const controller = require('../controllers/payments.controller');

// Public
router.get('/methods', controller.listMethods);

// Authenticated
router.post('/', requireAuth, controller.create);
router.post('/charge', requireAuth, controller.charge); // legacy alias
router.get('/me', requireAuth, controller.getMyPayments);
router.get('/:id', requireAuth, controller.getPaymentDetail);

// Webhook: no requireAuth — verified via provider signature instead. In production this route
// needs the raw request body (express.raw()), mounted before the global JSON parser.
router.post('/webhook', controller.webhook);

module.exports = router;
