const ChannelService = require("../services/ChannelService");

class ChannelController {
  constructor(socketHandler) {
    this.socketHandler = socketHandler;
    this.addChannel = this.addChannel.bind(this);
    this.updateChannel = this.updateChannel.bind(this);
    this.deleteChannel = this.deleteChannel.bind(this);
  }

  // [GET] /api/channels/:channelId
  async getAllChannelByConversationId(req, res) {
    const conversationId = req.params.conversationId;
    const channels = await ChannelService.getAllChannelByConversationId(
      conversationId
    );
    res.status(200).json(channels);
  }

  // [POST] /api/channels
  async addChannel(req, res, next) {
    try {
      const channel = req.body;
      const newChannel = await ChannelService.addChannel(channel);
      res.status(200).json(newChannel);
    } catch (err) {
      next(err);
    }
  }

  // [PUT] /api/channels/:channelId
  async updateChannel(req, res, next) {
    try {
      const channelId = req.params.channelId;
      const channel = req.body;
      const updatedChannel = await ChannelService.updateChannel(
        channelId,
        channel
      );
      res.status(200).json(updatedChannel);
    } catch (err) {
      next(err);
    }
  }

  // [DELETE] /api/channels/:channelId
  async deleteChannel(req, res, next) {
    try {
      const channelId = req.params.channelId;
      const memberId = req.body.memberId;
      const conversationId = req.body.conversationId;
      const deletedChannel = await ChannelService.deleteChannel(
        channelId,
        memberId,
        conversationId
      );
      res.status(200).json(deletedChannel);
    } catch (err) {
      next(err);
    }
  }
}
module.exports = ChannelController;
