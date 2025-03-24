const express = require('express');
const router = express.Router();
const ChannelController = require('../controllers/ChannelController');

router.get('/:conversationId', ChannelController.getAllChannelByConversationId);
router.post('/', ChannelController.addChannel);
router.put('/:channelId', ChannelController.updateChannel);
router.delete('/:channelId', ChannelController.deleteChannel);

module.exports = router;    