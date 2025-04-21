const express = require('express');
const router = express.Router();
const MemberController = require('../controllers/MemberController');

router.get('/is-member', MemberController.isMember);
router.get('/:conversationId', MemberController.getByConversationId);

module.exports = router;