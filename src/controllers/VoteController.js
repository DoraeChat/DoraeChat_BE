const VoteService = require('../services/VoteService');

const VoteController = {
    async getVotesByConversationId(req, res, next) {
        try {
            const { conversationId } = req.params;
            const votes = await VoteService.getVotesByConversationId(conversationId);
            res.json(votes);
        } catch (error) {
            next(error);
        }
    },

    async addVote(req, res, next) {
        try {
            const vote = req.body;
            const newVote = await VoteService.addVote(vote);
            res.json(newVote);
        } catch (error) {
            next(error);
        }
    },

    async deleteVote(req, res, next) {
        try {
            const { voteId } = req.params;
            const userId = req.body.userId;
            const vote = await VoteService.deleteVote(voteId, userId);
            res.json(vote);
        } catch (error) {
            next(error);
        }
    },

    async addVoteOption(req, res, next) {
        try {
            const { voteId } = req.params;
            const userId = req.body.userId;
            const newOption = req.body.option;
            const vote = await VoteService.addVoteOption(voteId, userId, newOption);
            res.json(vote);
        } catch (error) {
            next(error);
        }
    },

    async deleteVoteOption(req, res, next) {
        try {
            const { voteId, optionId } = req.params;
            const userId = req.body.userId;
            const vote = await VoteService.deleteVoteOption(voteId, userId, optionId);
            res.json(vote);
        } catch (error) {
            next(error);
        }
    },

    async selectVoteOption(req, res, next) {
        try {
            const { voteId, optionId } = req.params;
            const userId = req.body.userId;
            const vote = await VoteService.selectVoteOption(voteId, userId, optionId);
            res.json(vote);
        } catch (error) {
            next(error);
        }
    },

    async deselectVoteOption(req, res, next) {
        try {
            const { voteId, optionId } = req.params;
            const userId = req.body.userId;
            const vote = await VoteService.deselectVoteOption(voteId, userId, optionId);
            res.json(vote);
        } catch (error) {
            next(error);
        }
    },
};

module.exports = VoteController;