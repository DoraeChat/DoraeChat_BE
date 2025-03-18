const MessageService = require("../services/MessageService");

class MessageController {
  async sendMessage(req, res) {
    try {
      const { conversationId, content, type } = req.body;
      const userId = req.user.id;
      const message = await MessageService.sendMessage(
        userId,
        conversationId,
        content,
        type
      );
      res.status(201).json(message);
    } catch (error) {
      res.status(500).json({ message: error.message });
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

module.exports = new MessageController();
