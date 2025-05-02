const Message = require("../models/Message");
const Conversation = require("../models/Conversation");
const NotFoundError = require("../exceptions/NotFoundError");
const CustomError = require("../exceptions/CustomError");

const VoteService = {
  async getVotesByChannelId(channelId) {
    return await Message.getVotesByChannelId(channelId);
  },

  async addVote(vote) {
    // vote is message
    const { conversationId, memberId } = vote;
    if (!conversationId)
      throw new CustomError("Conversation ID is required", 400);
    if (!memberId) throw new CustomError("Member ID is required", 400);

    const conversation = await Conversation.getById(conversationId);
    if (!conversation) throw new NotFoundError("Conversation");
    console.log(conversation.members, memberId);

    const memberIds = conversation.members.map((member) => member.toString());
    if (!memberIds.includes(memberId))
      throw new CustomError("Member is not in conversation", 400);

    if (!vote.content) throw new CustomError("Poll topic is required", 400);

    if (!vote.options || vote.options.length < 2)
      throw new CustomError("At least 2 options are required", 400);

    return await Message.createVote(vote);
  },

  async lockVote(voteId, memberId) {
    const vote = await Message.getById(voteId);
    if (!vote) throw new NotFoundError("Vote");

    const conversation = await Conversation.getById(vote.conversationId);
    if (!conversation) throw new NotFoundError("Conversation");

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
    
    // newOption is object { name, memberIds, memberCreated }
    const vote = await Message.getById(voteId);
    if (!vote) {
      throw new NotFoundError("Vote");
    }

    // Ensure the option has a name
    if (!newOption.name) {
      throw new CustomError("Option must have a name", 400);
    }
    return await Message.addVoteOption(voteId, memberId, newOption);
  },

  async deleteVoteOption(voteId, memberId, optionId) {
    const vote = await Message.getById(voteId);
    if (!vote) throw new NotFoundError("Vote");

    if (vote.type !== "VOTE")
      throw new CustomError("Message is not a vote", 400);

    if (vote.lockedVote.lockedStatus)
      throw new CustomError("Vote is already locked", 400);

    const conversation = await Conversation.getById(vote.conversationId);
    if (!conversation) throw new NotFoundError("Conversation");

    const option = vote.options.find(
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

    return await Message.removeVoteOption(voteId, optionId);
  },

  async selectVoteOption(voteId, memberId, optionId) {
    const vote = await Message.getById(voteId);
    if (!vote) throw new NotFoundError("Vote");

    const optionIndex = vote.options.findIndex(
      (option) => option._id.toString() === optionId
    );
    if (vote.type !== "VOTE")
      throw new CustomError("Message is not a vote", 400);
    if (vote.lockedVote.lockedStatus)
      throw new CustomError("Vote is already locked", 400);
    if (optionIndex === -1) {
      throw new NotFoundError("Option");
    }

    const conversation = await Conversation.getById(vote.conversationId);
    if (!conversation) throw new NotFoundError("Conversation");

    const memberIds = conversation.members.map((member) => member.toString());
    if (!memberIds.includes(memberId))
      throw new CustomError("Member not in conversation", 400);

    return await Message.selectVoteOption(voteId, memberId, optionId);
  },

  async deselectVoteOption(voteId, memberId, optionId) {
    const vote = await Message.getById(voteId);
    if (!vote) throw new NotFoundError("Vote");

    const optionIndex = vote.options.findIndex(
      (option) => option._id.toString() === optionId
    );
    if (optionIndex === -1) {
      throw new Error("Invalid option ID");
    }
    if (vote.type !== "VOTE")
      throw new CustomError("Message is not a vote", 400);
    if (vote.lockedVote.lockedStatus)
      throw new CustomError("Vote is already locked", 400);

    const conversation = await Conversation.getById(vote.conversationId);
    if (!conversation) throw new NotFoundError("Conversation");

    const memberIds = conversation.members.map((member) => member.toString());
    if (!memberIds.includes(memberId))
      throw new CustomError("Member not in conversation", 400);
    return await Message.deselectVoteOption(voteId, memberId, optionId);
  },
};

module.exports = VoteService;
