const ChatService = require("../services/ChatService");

class ChatController {
  async sendMessage(req, res) {
    try {
      const { receiverId, message } = req.body;
      const senderId = req.user.id; // Lấy ID từ middleware xác thực

      const newMessage = await ChatService.sendMessage(
        senderId,
        receiverId,
        message
      );
      return res.status(201).json(newMessage);
    } catch (error) {
      return res.status(500).json({ error: error.message });
    }
  }

  async getMessages(req, res) {
    try {
      const { userId } = req.params;
      const senderId = req.user.id;

      const messages = await ChatService.getMessages(senderId, userId);
      return res.status(200).json(messages);
    } catch (error) {
      return res.status(500).json({ error: error.message });
    }
  }
}

module.exports = new ChatController();
