const express = require('express');
const router = express.Router();
const AuthController = require('../controllers/AuthController');

router.post('/contact', AuthController.registerContact);
router.post('/register', AuthController.submitInformation);
router.post('/verify-otp', AuthController.verifyOTP);
router.post('/resend-otp', AuthController.resendOTP);
router.post('/login', AuthController.login);
router.post('/refresh-token', AuthController.refreshToken);
router.post('/logout', AuthController.logout);
router.post('/verify-email-forgot-password', AuthController.verifyEmailResetPassword);
router.post('/forgot-password', AuthController.resetPassword);
router.get('/qr', AuthController.getQRSession);
router.post('/qr/verify', AuthController.verifyQRSession);
router.get('/qr/status/:sessionId', AuthController.getQRSessionStatus);

module.exports = router;