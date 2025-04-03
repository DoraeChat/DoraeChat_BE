const Conversation = require("../models/Conversation");

const ConversationService = {
  // Lấy danh sách hội thoại của người dùng
  async getListByUserId(userId) {
    return await Conversation.getListByUserId(userId);
  },
  // 🔍 Kiểm tra xem cuộc trò chuyện cá nhân giữa 2 user có tồn tại không
  async findOrCreateIndividualConversation(userId1, userId2) {
    // Kiểm tra nếu đã có cuộc trò chuyện 1-1 giữa hai user
    let conversation = await Conversation.existsIndividualConversation(
      userId1,
      userId2
    );
    if (conversation) {
      return await Conversation.getById(conversation);
    }

    // Nếu chưa có, tạo cuộc trò chuyện mới
    conversation = new Conversation({
      members: [userId1, userId2],
      type: false, // Chat cá nhân
    });
    await conversation.save();
    return conversation;
  },
  // tạo cuộc trò chuyện nhóm
  async createGroupConversation(name, members, leaderId) {
    if (members.length < 2) {
      throw new Error("Group conversation must have at least 2 members");
    }
    const conversation = new Conversation({
      name,
      members,
      leaderId,
      type: true, // Chat nhóm
    });
    await conversation.save();
    return conversation;
  },
  // 🔹 Đổi tên nhóm hội thoại
  async updateGroupName(conversationId, newName, userId) {
    const conversation = await Conversation.findById(conversationId);

    if (!conversation) {
      throw new Error("Conversation not found");
    }

    if (!conversation.type) {
      throw new Error("Cannot rename an individual conversation");
    }

    // Kiểm tra xem user có phải là leader hoặc quản trị viên không
    if (
      conversation.leaderId.toString() !== userId &&
      !conversation.managerIds.includes(userId)
    ) {
      throw new Error("You do not have permission to rename this group");
    }
    conversation.name = newName;
    await conversation.save();
    return conversation;
  },
  // Lấy hội thoại theo ID
  async getConversationById(conversationId) {
    return await Conversation.getById(conversationId);
  },

  // Kiểm tra hội thoại cá nhân giữa hai user
  async existsIndividualConversation(userId1, userId2) {
    return await Conversation.existsIndividualConversation(userId1, userId2);
  },
  async getByIdAndUserId(conversationId, userId) {
    return await Conversation.getByIdAndUserId(conversationId, userId);
  },
};

module.exports = ConversationService;
