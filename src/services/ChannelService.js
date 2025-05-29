const Channel = require("../models/Channel");
const Conversation = require("../models/Conversation");
const NotFoundError = require("../exceptions/NotFoundError");
const CustomError = require("../exceptions/CustomError");

class ChannelService {
  async getAllChannelByConversationId(conversationId) {
    return await Channel.getAllChannelByConversationId(conversationId);
  }

  async addChannel(channel) {
    try {
      const conversation = await Conversation.getById(channel.conversationId);

      if (!conversation) throw new NotFoundError("Conversation");

      const managerIds = conversation.managerIds.map((id) => id.toString());
      if (
        !managerIds.includes(channel.memberId) &&
        conversation.leaderId.toString() !== channel.memberId
      )
        throw new CustomError("Member is not access to add channel", 400);

      if (!conversation.type) throw new NotFoundError("Conversation");

      return await Channel.addChannel(channel);
    } catch (err) {
      if (err instanceof NotFoundError || err instanceof CustomError) throw err;
    }
  }

  async updateChannel(channelId, channel) {
    try {
      const conversation = await Conversation.getById(channel.conversationId);
      if (!conversation) throw new NotFoundError("Conversation");

      if (!channelId) throw new CustomError("Channel ID is required", 400);

      const managerIds = conversation.managerIds.map((id) => id.toString());
      if (
        !managerIds.includes(channel.memberId) &&
        conversation.leaderId.toString() !== channel.memberId
      )
        throw new CustomError("Member is not access to update channel", 400);

      if (!conversation.type)
        throw new CustomError("Conversation is not a group", 400);

      return await Channel.updateChannel(channelId, channel);
    } catch (err) {
      if (err instanceof CustomError) throw err;
    }
  }

  async deleteChannel(channelId, memberId, conversationId) {
    try {
      if (!channelId) throw new CustomError("Channel ID is required", 400);

      const conversation = await Conversation.getById(conversationId);
      if (!conversation) throw new NotFoundError("Conversation");

      const managerIds = conversation.managerIds.map((id) => id.toString());
      if (
        !managerIds.includes(memberId) &&
        conversation.leaderId.toString() !== memberId
      )
        throw new CustomError("Member is not access to update channel", 400);

      if (!conversation.type)
        throw new CustomError("Conversation is not a group", 400);

      // find channels by conversationId
      const channels = await Channel.getAllChannelByConversationId(conversationId);
      if (channels.length <= 1) {
        throw new CustomError("Cannot delete channel General", 400);
      }
      return await Channel.deleteChannel(channelId);
    } catch (err) {
      if (err instanceof NotFoundError || err instanceof CustomError) throw err;
    }
  }

  async getById(channelId) {
    return await Channel.getById(channelId);
  }
}

module.exports = new ChannelService();
