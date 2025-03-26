const express = require('express');
const router = express.Router();
const QRController = require('../controllers/QRController');

router.get('/user/:userId', QRController.generateQRUser);
router.get('/group/:groupId', QRController.generateQRGroup); // groupId chinh la conversationId 

module.exports = router;