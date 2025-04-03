const Channel = require("../models/Channel");

const ChannelService = {
  async getAllChannelByConversationId(conversationId) {
    return await Channel.getAllChannelByConversationId(conversationId);
  },

  async addChannel(channel) {
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
