const express = require('express');
const router = express.Router();
const PinMessageController = require('../controllers/PinMessageController');

router.get('/all/:conversationId', PinMessageController.getAllByConversationId);
router.post('/', PinMessageController.addPinMessage);
router.delete('/:messageId', PinMessageController.deletePinMessage);

module.exports = router;