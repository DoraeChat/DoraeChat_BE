const express = require('express');
const router = express.Router();
const AuthController = require('../controllers/AuthController');

router.post('/contact', AuthController.registerContact);
router.post('/information', AuthController.submitInformation);
router.post('/verify-otp', AuthController.verifyOTP);
router.post('/resend-otp', AuthController.resendOTP);
router.post('/login', AuthController.login);
router.post('/refresh-token', AuthController.refreshToken);

module.exports = router;