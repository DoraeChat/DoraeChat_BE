const Message = require("../models/Message");
const Conversation = require("../models/Conversation");

const VoteService = {
  async getVotesByConversationId(conversationId) {
    return await Message.getVotesByConversationId(conversationId);
  },

  async addVote(vote) {
    // vote is message
    const { conversationId, memberId } = vote;
    const conversation = await Conversation.getById(conversationId);
    if (!conversation) throw new Error("Conversation not found");
    if (!conversation.members.includes(memberId))
      throw new Error("User not in conversation");

    return await Message.createVote(vote);
  },

  async lockVote(voteId, memberId) {
    const conversation = await Conversation.getById(voteId);
    if (!conversation) throw new Error("Conversation not found");

    const vote = await Message.getById(voteId);

    if (!vote) throw new NotFoundError("Vote not found");

    if (vote.type !== "VOTE") throw new Error("Message is not a vote");

    if (vote.lockedVote.lockedStatus) throw new Error("Vote is already locked");

    if (
      !conversation.managerIds.includes(memberId) &&
      conversation.leaderId.toString() !== memberId &&
      vote.memberId.toString() !== memberId
    ) {
      throw new Error(
        "Only the vote creator, leader, manager can lock the vote"
      );
    }

    return await Message.lockVote(voteId, memberId);
  },

  async addVoteOption(voteId, memberId, newOption) {
    return await Message.addVoteOption(voteId, memberId, newOption);
  },

  async deleteVoteOption(voteId, memberId, optionId) {
    const vote = await Message.getById(voteId);
    if (!vote) throw new NotFoundError("Vote not found");

    if (vote.type !== "VOTE") throw new Error("Message is not a vote");

    if (vote.lockedVote.lockedStatus) throw new Error("Vote is already locked");

    const conversation = await Conversation.getById(vote.conversationId);
    if (!conversation) throw new Error("Conversation not found");

    const option = vote.voteOptions.find(
      (option) => option._id.toString() === optionId
    );
    if (
      !conversation.managerIds.includes(memberId) && // manager
      conversation.leaderId.toString() !== memberId && // leader
      vote.memberId.toString() !== memberId && // creator
      option.memberCreated.toString() !== memberId
    )
      // option creator
      throw new Error(
        "Only the vote creator, leader, manager or option creator can delete the option"
      );

    return await Message.removeVoteOption(voteId, memberId, optionId);
  },

  async selectVoteOption(voteId, memberId, optionId) {
    const vote = await Message.getById(voteId);
    if (!vote) throw new NotFoundError("Vote not found");

    if (vote.type !== "VOTE") throw new Error("Message is not a vote");
    if (vote.lockedVote.lockedStatus) throw new Error("Vote is already locked");

    const conversation = await Conversation.getById(vote.conversationId);
    if (!conversation) throw new Error("Conversation not found");

    if (!conversation.members.includes(memberId))
        throw new Error("User not in conversation");

    return await Message.selectVoteOption(voteId, memberId, optionId);
  },

  async deselectVoteOption(voteId, memberId, optionId) {
    const vote = await Message.getById(voteId);
    if (!vote) throw new NotFoundError("Vote not found");

    if (vote.type !== "VOTE") throw new Error("Message is not a vote");
    if (vote.lockedVote.lockedStatus) throw new Error("Vote is already locked");

    const conversation = await Conversation.getById(vote.conversationId);
    if (!conversation) throw new Error("Conversation not found");

    if (!conversation.members.includes(memberId))
        throw new Error("User not in conversation");
    return await Message.deselectVoteOption(voteId, memberId, optionId);
  },
};

module.exports = VoteService;
