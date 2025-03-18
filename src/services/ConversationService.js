const Conversation = require("../models/Conversation");

class ConversationService {
  // Lấy danh sách hội thoại của người dùng
  async getListByUserId(userId) {
    return await Conversation.getListByUserId(userId);
  }

  // Tạo hội thoại mới
  async createConversation(name, members, type, leaderId) {
    const conversation = new Conversation({
      name,
      members,
      type,
      leaderId,
    });
    await conversation.save();
    return conversation;
  }

  // Lấy hội thoại theo ID
  async getConversationById(conversationId) {
    return await Conversation.getById(conversationId);
  }

  // Kiểm tra hội thoại cá nhân giữa hai user
  async existsIndividualConversation(userId1, userId2) {
    return await Conversation.existsIndividualConversation(userId1, userId2);
  }
}

module.exports = new ConversationService();
