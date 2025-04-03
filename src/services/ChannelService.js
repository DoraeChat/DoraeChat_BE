const Channel = require("../models/Channel");
const Conversation = require("../models/Conversation");

const ChannelService = {
  async getAllChannelByConversationId(conversationId) {
    return await Channel.getAllChannelByConversationId(conversationId);
  },

  async addChannel(channel) {
    const conversation = await Conversation.getById(channel.conversationId);
    if (!conversation) throw new Error("Conversation not found");
    if (!conversation.managerIds.includes(channel.memberId) || !conversation.leaderId === channel.memberId)
      throw new Error("User is not a member of this conversation");
    if (!conversation.type) throw new Error("Conversation is not a group");
    return await Channel.addChannel(channel);
  },

  async updateChannel(channelId, channel) {
    return await Channel.updateChannel(channelId, channel);
  },

  async deleteChannel(channelId) {
    return await Channel.deleteChannel(channelId);
  },
  async getById(channelId) {
    return await Channel.getById(channelId);
  },
};

module.exports = ChannelService;
