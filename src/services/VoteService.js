const Message = require('../models/Message');

const VoteService = {
    async getVotesByConversationId(conversationId) {
        return await Message.getVotesByConversationId(conversationId);
    },

    async addVote(vote) { // vote is message
        return await Message.createVote(vote);
    },

    async deleteVote(voteId, userId) {
        return await Message.removeVote(voteId, userId);
    },

    async addVoteOption(voteId, userId, newOption) {
        return await Message.addVoteOption(voteId, userId, newOption);
    },

    async deleteVoteOption(voteId, userId, optionId) {
        return await Message.removeVoteOption(voteId, userId, optionId);
    },

    async selectVoteOption(voteId, userId, optionId) {
        return await Message.selectVoteOption(voteId, userId, optionId);
    },

    async deselectVoteOption(voteId, userId, optionId) {
        return await Message.deselectVoteOption(voteId, userId, optionId);
    },
};

module.exports = VoteService;