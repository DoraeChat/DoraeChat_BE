const Message = require("../models/Message");
const Conversation = require("../models/Conversation");
const Member = require("../models/Member");
const Channel = require("../models/Channel");
const redisClient = require("../config/redis");

class MessageService {
  // 🔹 Gửi tin nhắn văn bản
  async sendTextMessage(userId, conversationId, content) {
    if (!content.trim()) {
      throw new Error("Message content cannot be empty");
    }
    const member = await Member.findOne({
      conversationId,
      userId,
    });
    if (!member) {
      throw new Error("You are not a member of this conversation");
    }
    // Kiểm tra xem cuộc trò chuyện có tồn tại không
    const conversation = await Conversation.findById(conversationId);
    if (!conversation) {
      throw new Error("Conversation not found");
    }
    // // Kiểm tra xem user có thuộc cuộc trò chuyện không
    // if (!conversation.members.includes(member._id)) {
    //   throw new Error("You are not a member of this conversation");
    // }

    // Tạo tin nhắn mới
    const message = new Message({
      memberId: member._id,
      conversationId,
      content,
      type: "TEXT",
    });

    const newMessage = await message.save();

    // Cập nhật cache
    await syncMessageCache(conversationId, [newMessage]);

    // Cập nhật tin nhắn cuối cùng trong cuộc trò chuyện
    conversation.lastMessageId = message._id;

    await conversation.save();

    return message;
  }

  // Lấy danh sách tin nhắn theo hội thoại giới hạn 20 tin nhắn
  async getMessagesByConversationId(
    conversationId,
    userId,
    { skip = 0, limit = 20, beforeTimestamp = null } = {}
  ) {
    // 1. Validate conversation
    const conversation = await Conversation.findById(conversationId);
    if (!conversation) {
      throw new Error("Conversation not found");
    }
    const member = await Member.findOne({
      conversationId,
      userId,
    });
    if (!member) {
      throw new Error("You are not a member of this conversation");
    }
    // if (!conversation.members.includes(userId)) {
    //   throw new Error("You are not a member of this conversation");
    // }

    // 2. Xác định cache key
    const cacheKey = beforeTimestamp
      ? `messages:${conversationId}:cursor:${beforeTimestamp}`
      : `messages:${conversationId}:page:${skip}:${limit}`;

    // 3. Thử lấy từ cache trước
    const cachedMessages = await redisClient.get(cacheKey);
    if (cachedMessages) {
      return JSON.parse(cachedMessages);
    }

    // 4. Build query nếu không có cache
    const query = {
      conversationId,
      deletedUserIds: { $nin: [userId] },
    };
    if (beforeTimestamp) {
      query.createdAt = { $lt: new Date(beforeTimestamp) };
    }
    const messages = await Message.find(query)
      .sort({ createdAt: -1 }) // Sắp xếp theo thời gian giảm dần
      .skip(skip) // Bỏ qua số lượng tin nhắn đã chỉ định
      .limit(limit) // Giới hạn số lượng tin nhắn trả về
      .lean(); // Chuyển đổi sang đối tượng JavaScript thuần túy

    // 6. Lưu vào cache với TTL
    if (messages && messages.length > 0) {
      await redisClient.set(cacheKey, JSON.stringify(messages), 300);
      await this.syncMessageCache(conversationId, messages);
    }
    return messages;
  }
  // Lấy danh sách tin nhắn theo channelId
  async getMessagesByChannelId(channelId, userId, skip, limit) {
    try {
      // Kiểm tra xem channelId có hợp lệ không
      const channel = await Channel.getById(channelId);
      if (!channel) {
        throw new Error("Channel not found");
      }
      // Kiểm tra xem userId có phải là thành viên của channel không
      try {
        await Conversation.getByIdAndUserId(channel.conversationId, userId);
      } catch (error) {
        throw new Error("You are not a member of this channel");
      }
      // Gọi phương thức tĩnh từ MessageSchema
      const messages = await Message.getListByChannelIdAndUserId(
        channelId,
        userId,
        skip,
        limit
      );
      return messages;
    } catch (error) {
      throw new Error(`Error fetching messages: ${error.message}`);
    }
  }

  /**
   * Đồng bộ cache tin nhắn theo 3 lớp:
   * 1. Cache từng tin nhắn riêng lẻ (cho truy vấn nhanh qua messageId)
   * 2. Sorted Set lưu trật tự tin nhắn trong conversation (theo thời gian)
   * 3. Cache phân trang theo cursor/offset (hỗ trợ infinite scroll)
   */
  async syncMessageCache(conversationId, messages) {
    if (!messages || messages.length === 0) return;

    // 1. Cache từng tin nhắn riêng lẻ với TTL dài hơn
    const individualCachePromises = messages.map((msg) => {
      const messageKey = `message:${msg._id}`;
      return redisClient.set(
        messageKey,
        JSON.stringify(msg),
        3600 * 24 // TTL 24 giờ cho tin nhắn riêng lẻ
      );
    });

    // 2. Cập nhật Sorted Set của conversation (ZSET)
    // - Score: timestamp của tin nhắn (để sắp xếp)
    // - Member: messageId
    const zsetKey = `conversation:${conversationId}:messages`;
    const zsetUpdates = messages.flatMap((msg) => [
      new Date(msg.createdAt).getTime(), // Score
      msg._id.toString(), // Member
    ]);

    // 3. Cache phụ trợ cho infinite scroll:
    // - Lưu theo cursor (timestamp của tin nhắn cũ nhất)
    const cursorCachePromises = messages.map((msg) => {
      const cursorKey = `messages:${conversationId}:cursor:${new Date(
        msg.createdAt
      ).getTime()}`;
      return redisClient.set(
        cursorKey,
        JSON.stringify([msg]), // Lưu mảng 1 phần tử để tái sử dụng code
        300 // TTL 5 phút
      );
    });

    // Thực thi đồng thời tất cả cập nhật cache
    await Promise.all([
      ...individualCachePromises,
      redisClient.zadd(zsetKey, ...zsetUpdates),
      ...cursorCachePromises,
    ]);

    // 4. Giới hạn kích thước Sorted Set (tránh memory leak)
    const maxMessagesInCache = 1000;
    await redisClient.zremrangebyrank(zsetKey, 0, -maxMessagesInCache - 1);

    // 5. Cập nhật TTL cho Sorted Set
    await redisClient.expire(zsetKey, 3600 * 24 * 7); // TTL 1 tuần
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
