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
    }
};

module.exports = ChannelService;