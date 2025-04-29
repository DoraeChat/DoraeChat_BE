const express = require('express');
const router = express.Router();
const meteredController = require('../controllers/meteredController');

router.post('/create-meeting-room', meteredController.createMeetingRoom);
router.get('/validate-meeting', meteredController.validateMeetingRoom);
router.get('/metered-domain', meteredController.getMeteredDomain);
router.post('/end-meeting/:conversationId', meteredController.endMeeting);


module.exports = router;
