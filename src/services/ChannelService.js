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
      throw new Error("Member is not access to add channel");
    if (!conversation.type) throw new Error("Conversation is not a group");
    return await Channel.addChannel(channel);
  },

  async updateChannel(channelId, channel) {
    const conversation = await Conversation.getById(channel.conversationId);
    if (!channelId) throw new Error("Channel ID is required");
    if (channel.memberId === conversation.leaderId || conversation.managerIds.includes(channel.memberId)) 
      throw new Error("Member is not access to update channel");
    if (!conversation.type) throw new Error("Conversation is not a group");
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
