const Message = require("../models/Message");

class MessageService {
  // Gửi tin nhắn mới
  async sendMessage(userId, conversationId, content, type) {
    const message = new Message({
      userId,
      conversationId,
      content,
      type,
    });
    await message.save();
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
