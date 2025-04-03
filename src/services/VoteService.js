const Message = require('../models/Message');
const Conversation = require('../models/Conversation');

const VoteService = {
    async getVotesByConversationId(conversationId) {
        return await Message.getVotesByConversationId(conversationId);
    },

    async addVote(vote) { // vote is message
        const { conversationId, memberId } = vote;
        const conversation = await Conversation.getById(conversationId);
        if (!conversation) throw new Error('Conversation not found');
        if (!conversation.members.includes(memberId)) throw new Error('User not in conversation');

        return await Message.createVote(vote);
    },

    async deleteVote(voteId, memberId) {
        return await Message.deleteVote(voteId, memberId);
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