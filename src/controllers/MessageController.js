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

  async getMessages(req, res) {
    try {
      const { conversationId } = req.params;
      const messages = await MessageService.getMessagesByConversationId(
        conversationId
      );
      res.status(200).json(messages);
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  }
}

module.exports = MessageController;
