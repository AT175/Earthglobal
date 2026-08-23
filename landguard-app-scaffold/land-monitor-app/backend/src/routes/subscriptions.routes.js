const express = require('express');
const router = express.Router();
const { requireAuth } = require('../middleware/auth');
const controller = require('../controllers/subscriptions.controller');

// Public — browse plans (grouped by category) and preview pricing
router.get('/plans', controller.listPlans);
router.get('/price-preview', controller.previewPrice);

// Owner — manage subscriptions and top-ups
router.post('/', requireAuth, controller.subscribe);
router.get('/me', requireAuth, controller.getMine);
router.get('/me/all', requireAuth, controller.getMyHistory);
router.post('/top-up', requireAuth, controller.topUp);
router.get('/top-ups', requireAuth, controller.getMyTopUps);

module.exports = router;
