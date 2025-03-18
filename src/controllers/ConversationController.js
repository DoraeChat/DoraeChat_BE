const ConversationService = require("../services/ConversationService");

class ConversationController {
  async getListByUserId(req, res) {
    try {
      const userId = req.user.id;
      const conversations = await ConversationService.getListByUserId(userId);
      res.status(200).json(conversations);
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  }

  async createConversation(req, res) {
    try {
      const { name, members, type } = req.body;
      const leaderId = req.user.id;
      const conversation = await ConversationService.createConversation(
        name,
        members,
        type,
        leaderId
      );
      res.status(201).json(conversation);
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  }

  async getConversationById(req, res) {
    try {
      const conversation = await ConversationService.getConversationById(
        req.params.id
      );
      res.status(200).json(conversation);
    } catch (error) {
      res.status(404).json({ message: "Conversation not found" });
    }
  }
}

module.exports = new ConversationController();
