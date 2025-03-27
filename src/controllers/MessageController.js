const MessageService = require("../services/MessageService");

class MessageController {
  constructor(io) {
    this.io = io;
    this.sendTextMessage = this.sendTextMessage.bind(this);
  }
  // [POST] /api/message/text - Gửi tin nhắn văn bản
  async sendTextMessage(req, res) {
    try {
      const { conversationId, content } = req.body;
      const userId = req._id; // Người gửi tin nhắn

      if (!conversationId || !content) {
        return res
          .status(400)
          .json({ message: "Conversation ID and content are required" });
      }

      const message = await MessageService.sendTextMessage(
        userId,
        conversationId,
        content
      );
      // 🔹 Gửi tin nhắn real-time đến tất cả user trong phòng chat
      this.io.to(conversationId).emit("newMessage", message);
      res.status(201).json(message);
    } catch (error) {
      res.status(400).json({ message: error.message });
    }
  }

  // [GET] /api/message/:conversationId - Lấy danh sách tin nhắn theo conversationId
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
}

module.exports = MessageController;
