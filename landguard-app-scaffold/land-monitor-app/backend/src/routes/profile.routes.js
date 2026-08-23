const express = require('express');
const router = express.Router();
const { requireAuth } = require('../middleware/auth');
const ctrl = require('../controllers/profile.controller');

// All profile routes require authentication — role is auto-detected from JWT
router.get('/me', requireAuth, ctrl.getMe);
router.patch('/', requireAuth, ctrl.updateProfile);
router.patch('/password', requireAuth, ctrl.changePassword);
router.get('/stats', requireAuth, ctrl.getStats);

module.exports = router;
