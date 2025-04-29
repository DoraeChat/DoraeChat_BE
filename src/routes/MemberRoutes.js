const express = require('express');
const router = express.Router();
const MemberController = require('../controllers/MemberController');

router.get('/is-member', MemberController.isMember);
router.get('/member/:memberId', MemberController.getByMemberId);
router.get('/:conversationId', MemberController.getByConversationId);
router.get('/:conversationId/:userId', MemberController.getByConversationIdAndUserId);

module.exports = router;