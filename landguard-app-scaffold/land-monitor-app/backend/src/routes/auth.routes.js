const express = require('express');
const router = express.Router();
const authController = require('../controllers/auth.controller');
const { loginLimiter } = require('../middleware/security');
const { validateBody, schemas } = require('../middleware/validate');

router.post('/signup', validateBody(schemas.signup), authController.signup);
router.post('/otp/request', authController.requestOtp);
router.post('/otp/verify', authController.verifyOtp);
router.post('/login', validateBody(schemas.login), loginLimiter, authController.login);

module.exports = router;
