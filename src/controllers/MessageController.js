const SOCKET_EVENTS = require("../constants/socketEvents");
const MessageService = require("../services/MessageService");

class MessageController {
  constructor(socketHandler) {
    this.socketHandler = socketHandler;
    this.sendTextMessage = this.sendTextMessage.bind(this);
    this.recallMessage = this.recallMessage.bind(this);
  }
  // [POST] /api/message/text - Gửi tin nhắn văn bản
  async sendTextMessage(req, res) {
    try {
      const { conversationId, content, channelId } = req.body;
      const userId = req._id;

      if (!conversationId || !content) {
        return res
          .status(400)
          .json({ message: "Conversation ID and content are required" });
      }

      const message = await MessageService.sendTextMessage(
        userId,
        conversationId,
        content,
        channelId // Truyền channelId (có thể là null)
      );

      // Phát sự kiện socket đến conversationId (và channelId nếu có)
      this.socketHandler.emitToConversation(
        conversationId,
        SOCKET_EVENTS.RECEIVE_MESSAGE,
        message
      );

      res.status(201).json(message);
    } catch (error) {
      res.status(400).json({ message: error.message });
    }
  }

  // [GET] /api/messages/:conversationId - Lấy danh sách tin nhắn theo conversationId 1-1
  async getMessagesByConversation(req, res) {
    try {
      const { conversationId } = req.params;
      const userId = req._id; //userId được lấy từ middleware xác thực

      if (!conversationId) {
        return res.status(400).json({ message: "Conversation ID is required" });
      }

      // Gọi phương thức từ MessageService để lấy danh sách tin nhắn
      const messages = await MessageService.getMessagesByConversationId(
        conversationId,
        userId
      );
      res.status(200).json(messages);
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  }
  // [GET] /api/message/channel/:channelId - Lấy danh sách tin nhắn theo channelId - group
  async getMessagesByChannelId(req, res) {
    try {
      const { channelId } = req.params;
      const userId = req._id; //userId được lấy từ middleware xác thực
      const { skip = 0, limit = 20 } = req.query; // Phân trang mặc định

      if (!channelId) {
        return res.status(400).json({ message: "Channel ID is required" });
      }

      // Gọi MessageService để lấy danh sách tin nhắn
      const messages = await MessageService.getMessagesByChannelId(
        channelId,
        userId,
        parseInt(skip),
        parseInt(limit)
      );
      res.status(200).json(messages);
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  } // [DELETE] /api/message/:id/conversation/:conversationId- Thu hồi tin nhắn
  async recallMessage(req, res) {
    try {
      const { id: messageId, conversationId } = req.params;
      const userId = req._id;

      if (!conversationId || !messageId) {
        return res
          .status(400)
          .json({ message: "Conversation ID and Message ID are required" });
      }

      const recalledMessage = await MessageService.recallMessage(
        conversationId,
        userId,
        messageId
      );

      // Gửi sự kiện real-time đến tất cả user trong phòng chat
      if (this.socketHandler) {
        this.socketHandler.emitToConversation(
          conversationId,
          SOCKET_EVENTS.MESSAGE_RECALLED,
          recalledMessage
        );
      }

      res.status(200).json(recalledMessage);
    } catch (error) {
      res.status(400).json({ message: error.message });
    }
  }
}

module.exports = MessageController;
