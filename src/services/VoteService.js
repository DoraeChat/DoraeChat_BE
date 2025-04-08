const Message = require("../models/Message");
const Conversation = require("../models/Conversation");
const NotFoundError = require("../exceptions/NotFoundError");
const CustomError = require("../exceptions/CustomError");

const VoteService = {
  async getVotesByConversationId(conversationId) {
    return await Message.getVotesByConversationId(conversationId);
  },

  async addVote(vote) {
    // vote is message
    const { conversationId, memberId } = vote;
    const conversation = await Conversation.getById(conversationId);
    if (!conversation) throw new NotFoundError("Conversation");
    if (!conversation.members.includes(memberId))
      throw new CustomError("User not in conversation", 400);

    return await Message.createVote(vote);
  },

  async lockVote(voteId, memberId) {
    const conversation = await Conversation.getById(voteId);
    if (!conversation) throw new NotFoundError("Conversation");

    const vote = await Message.getById(voteId);

    if (!vote) throw new NotFoundError("Vote");

    if (vote.type !== "VOTE")
      throw new CustomError("Message is not a vote", 400);

    if (vote.lockedVote.lockedStatus)
      throw new CustomError("Vote is already locked", 400);

    if (
      !conversation.managerIds.includes(memberId) &&
      conversation.leaderId.toString() !== memberId &&
      vote.memberId.toString() !== memberId
    ) {
      throw new CustomError(
        "Only the vote creator, leader, manager can lock the vote",
        400
      );
    }

    return await Message.lockVote(voteId, memberId);
  },

  async addVoteOption(voteId, memberId, newOption) {
    return await Message.addVoteOption(voteId, memberId, newOption);
  },

  async deleteVoteOption(voteId, memberId, optionId) {
    const vote = await Message.getById(voteId);
    if (!vote) throw new NotFoundError("Vote");

    if (vote.type !== "VOTE") throw new CustomError("Message is not a vote", 400);

    if (vote.lockedVote.lockedStatus) throw new CustomError("Vote is already locked", 400);

    const conversation = await Conversation.getById(vote.conversationId);
    if (!conversation) throw new NotFoundError("Conversation");

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
      throw new CustomError(
        "Only the vote creator, leader, manager or option creator can delete the option",
        400
      );

    return await Message.removeVoteOption(voteId, memberId, optionId);
  },

  async selectVoteOption(voteId, memberId, optionId) {
    const vote = await Message.getById(voteId);
    if (!vote) throw new NotFoundError("Vote not found");

    if (vote.type !== "VOTE") throw new CustomError("Message is not a vote", 400);
    if (vote.lockedVote.lockedStatus) throw new CustomError("Vote is already locked", 400);

    const conversation = await Conversation.getById(vote.conversationId);
    if (!conversation) throw new NotFoundError("Conversation");

    if (!conversation.members.includes(memberId))
      throw new CustomError("User not in conversation", 400);

    return await Message.selectVoteOption(voteId, memberId, optionId);
  },

  async deselectVoteOption(voteId, memberId, optionId) {
    const vote = await Message.getById(voteId);
    if (!vote) throw new NotFoundError("Vote");

    if (vote.type !== "VOTE") throw new CustomError("Message is not a vote", 400);
    if (vote.lockedVote.lockedStatus) throw new CustomError("Vote is already locked", 400);

    const conversation = await Conversation.getById(vote.conversationId);
    if (!conversation) throw new NotFoundError("Conversation");

    if (!conversation.members.includes(memberId))
      throw new CustomError("User not in conversation", 400);
    return await Message.deselectVoteOption(voteId, memberId, optionId);
  },
};

module.exports = VoteService;
