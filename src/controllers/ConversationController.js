const ConversationService = require("../services/ConversationService");

class ConversationController {
  // [GET] /api/conversations - Lấy danh sách hội thoại của người dùng
  async getListByUserId(req, res) {
    try {
      const userId = req._id; // Lấy userId từ token
      const conversations = await ConversationService.getListByUserId(userId);
      res.status(200).json(conversations);
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  }
  // [POST] /api/conversations/individuals/:userId - Tạo hoặc lấy cuộc trò chuyện cá nhân
  async createOrGetIndividualConversation(req, res) {
    try {
      const userId = req._id;
      const userId2 = req.params.userId;
      if (userId === userId2) {
        return res
          .status(400)
          .json({ message: "Cannot create conversation with yourself" });
      }

      const conversation =
        await ConversationService.findOrCreateIndividualConversation(
          userId,
          userId2
        );
      res.status(201).json(conversation);
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  }
  //  Tạo nhóm hội thoại
  async createGroupConversation(req, res) {
    try {
      const { name, members } = req.body;
      const leaderId = req._id; // Người tạo nhóm

      // Đảm bảo danh sách thành viên chứa leaderId
      if (!members.includes(leaderId)) {
        members.push(leaderId);
      }

      const conversation = await ConversationService.createGroupConversation(
        name,
        members,
        leaderId
      );
      res.status(201).json(conversation);
    } catch (error) {
      res.status(400).json({ message: error.message });
    }
  }
  // 🔹 Đổi tên nhóm hội thoại
  async updateGroupName(req, res) {
    try {
      const { name } = req.body;
      const conversationId = req.params.id;
      const userId = req._id; // Người thực hiện đổi tên

      if (!name) {
        return res.status(400).json({ message: "Group name is required" });
      }

      const conversation = await ConversationService.updateGroupName(
        conversationId,
        name,
        userId
      );
      res.status(200).json(conversation);
    } catch (error) {
      res.status(400).json({ message: error.message });
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
