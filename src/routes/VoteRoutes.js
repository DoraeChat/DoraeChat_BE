const express = require('express');
const router = express.Router();
const VoteController = require('../controllers/VoteController');

router.get('/:channelId', VoteController.getVotesByChannelId);
router.post('/', VoteController.addVote);
router.put('/:voteId', VoteController.lockVote);
router.post('/option/:voteId', VoteController.addVoteOption);
router.delete('/option/:voteId/:optionId', VoteController.deleteVoteOption);
router.post('/option/select/:voteId/:optionId', VoteController.selectVoteOption);
router.delete('/option/deselect/:voteId/:optionId', VoteController.deselectVoteOption);

module.exports = router;