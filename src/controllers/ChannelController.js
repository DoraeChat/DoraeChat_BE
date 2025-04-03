const ChannelService = require("../services/ChannelService");

const ChannelController = {
  async getAllChannelByConversationId(req, res) {
    const conversationId = req.params.conversationId;
    const channels = await ChannelService.getAllChannelByConversationId(
      conversationId
    );
    res.json(channels);
  },

  async addChannel(req, res) {
    const channel = req.body;
    const newChannel = await ChannelService.addChannel(channel);
    res.json(newChannel);
  },

  async updateChannel(req, res) {
    const channelId = req.params.channelId;
    const channel = req.body;
    const updatedChannel = await ChannelService.updateChannel(
      channelId,
      channel
    );
    res.json(updatedChannel);
  },

  async deleteChannel(req, res) {
    const channelId = req.params.channelId;
    const deletedChannel = await ChannelService.deleteChannel(channelId);
    res.json(deletedChannel);
  },
};
module.exports = ChannelController;
