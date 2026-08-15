const express = require('express');
const router = express.Router();
const { requireAuth } = require('../middleware/auth');
const controller = require('../controllers/subscriptions.controller');

router.get('/plans', controller.listPlans); // public, no auth needed to browse plans
router.post('/', requireAuth, controller.subscribe);
router.get('/me', requireAuth, controller.getMine);

module.exports = router;
