const Message = require("../models/Message");

class ChatService {
  async sendMessage(senderId, receiverId, message) {
    const newMessage = new Message({ senderId, receiverId, message });
    return await newMessage.save();
  }

  async getMessages(senderId, receiverId) {
    return await Message.find({
      $or: [
        { senderId, receiverId },
        { senderId: receiverId, receiverId: senderId },
      ],
    }).sort({ createdAt: 1 });
  }
}

module.exports = new ChatService();
