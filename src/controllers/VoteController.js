const VoteService = require('../services/VoteService');

const VoteController = {
    // [GET] /api/votes/:conversationId
    async getVotesByConversationId(req, res, next) {
        try {
            const { conversationId } = req.params;
            const votes = await VoteService.getVotesByConversationId(conversationId);
            res.json(votes);
        } catch (error) {
            next(error);
        }
    },

    // [POST] /api/votes
    async addVote(req, res, next) {
        try {
            const vote = req.body;
            const newVote = await VoteService.addVote(vote);
            res.json(newVote);
        } catch (error) {
            next(error);
        }
    },

    // [PUT] /api/votes/:voteId
    async lockVote(req, res, next) {
        try {
            const { voteId } = req.params;
            const memberId = req.body.memberId;
            const vote = await VoteService.lockVote(voteId, memberId);
            res.json(vote);
        } catch (error) {
            next(error);
        }
    },

    // [POST] /api/votes/option/:voteId
    async addVoteOption(req, res, next) {
        try {
            const { voteId } = req.params;
            const memberId = req.body.memberId;
            const newOption = req.body.option;
            const vote = await VoteService.addVoteOption(voteId, memberId, newOption);
            res.json(vote);
        } catch (error) {
            next(error);
        }
    },

    // [DELETE] /api/votes/option/:voteId/:optionId
    async deleteVoteOption(req, res, next) {
        try {
            const { voteId, optionId } = req.params;
            const memberId = req.body.memberId;
            const vote = await VoteService.deleteVoteOption(voteId, memberId, optionId);
            res.json(vote);
        } catch (error) {
            next(error);
        }
    },

    // [POST] /api/votes/option/select/:voteId/:optionId
    async selectVoteOption(req, res, next) {
        try {
            const { voteId, optionId } = req.params;
            const memberId = req.body.memberId;
            const vote = await VoteService.selectVoteOption(voteId, memberId, optionId);
            res.json(vote);
        } catch (error) {
            next(error);
        }
    },

    // [DELETE] /api/votes/option/deselect/:voteId/:optionId
    async deselectVoteOption(req, res, next) {
        try {
            const { voteId, optionId } = req.params;
            const memberId = req.body.memberId;
            const vote = await VoteService.deselectVoteOption(voteId, memberId, optionId);
            res.json(vote);
        } catch (error) {
            next(error);
        }
    },
};

module.exports = VoteController;