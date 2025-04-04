const ChannelService = require("../services/ChannelService");

const ChannelController = {
  // [GET] /api/channels/:channelId
  async getAllChannelByConversationId(req, res) {
    const conversationId = req.params.conversationId;
    const channels = await ChannelService.getAllChannelByConversationId(
      conversationId
    );
    res.json(channels);
  },

  // [POST] /api/channels
  async addChannel(req, res) {
    const channel = req.body;
    const newChannel = await ChannelService.addChannel(channel);
    res.json(newChannel);
  },

  // [PUT] /api/channels/:channelId
  async updateChannel(req, res) {
    const channelId = req.params.channelId;
    const channel = req.body;
    const updatedChannel = await ChannelService.updateChannel(
      channelId,
      channel
    );
    res.json(updatedChannel);
  },

  // [DELETE] /api/channels/:channelId
  async deleteChannel(req, res) {
    const channelId = req.params.channelId;
    const memberId = req.body.memberId;
    const deletedChannel = await ChannelService.deleteChannel(channelId, memberId);
    res.json(deletedChannel);
  },
};
module.exports = ChannelController;
