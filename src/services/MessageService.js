const Message = require("../models/Message");
const Conversation = require("../models/Conversation");

class MessageService {
  // 🔹 Gửi tin nhắn văn bản
  async sendTextMessage(userId, conversationId, content) {
    if (!content.trim()) {
      throw new Error("Message content cannot be empty");
    }

    // Kiểm tra xem cuộc trò chuyện có tồn tại không
    const conversation = await Conversation.findById(conversationId);
    if (!conversation) {
      throw new Error("Conversation not found");
    }

    // Kiểm tra xem user có thuộc cuộc trò chuyện không
    if (!conversation.members.includes(userId)) {
      throw new Error("You are not a member of this conversation");
    }

    // Tạo tin nhắn mới
    const message = new Message({
      userId,
      conversationId,
      content,
      type: "TEXT",
    });

    await message.save();

    // Cập nhật tin nhắn cuối cùng trong cuộc trò chuyện
    conversation.lastMessageId = message._id;
    await conversation.save();

    return message;
  }

  // Lấy danh sách tin nhắn theo hội thoại
  async getMessagesByConversationId(conversationId) {
    return await Message.find({ conversationId })
      .sort({ createdAt: -1 })
      .lean();
  }

  // Lấy tin nhắn theo ID
  async getMessageById(messageId) {
    return await Message.getById(messageId);
  }

  // Đếm tin nhắn chưa đọc
  async countUnreadMessages(time, conversationId) {
    return await Message.countUnread(time, conversationId);
  }
}

module.exports = new MessageService();
