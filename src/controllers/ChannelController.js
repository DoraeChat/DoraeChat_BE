const ChannelService = require("../services/ChannelService");
const SOCKET_EVENTS = require("../constants/socketEvents");

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

      if (this.socketHandler) {
        this.socketHandler.emitToConversation(
          channel.conversationId.toString(),
          SOCKET_EVENTS.NEW_CHANNEL,
          newChannel
        );
      }
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

      if (this.socketHandler) {
        this.socketHandler.emitToConversation(
          updatedChannel.conversationId.toString(),
          SOCKET_EVENTS.UPDATE_CHANNEL,
          updatedChannel
        );
      }
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

      if (this.socketHandler) {
        this.socketHandler.emitToConversation(
          deletedChannel.conversationId.toString(),
          SOCKET_EVENTS.DELETE_CHANNEL,
          deletedChannel
        );
      }
    } catch (err) {
      next(err);
    }
  }
}
module.exports = ChannelController;
