const Message = require("../models/Message");
const Conversation = require("../models/Conversation");
const redisClient = require("../config/redis");

const BASE_KEY = `messages:${conversationId}`;
const CURSOR_KEY = `${BASE_KEY}:cursor:${beforeTimestamp || "latest"}`; // Cho infinite scroll
const PAGE_KEY = `${BASE_KEY}:page:${skip}:${limit}`; // Cho phân trang truyền thống

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
    if (!conversation.members.includes(userId)) {
      throw new Error("You are not a member of this conversation");
    }

    // 2. Xác định cache key
    const cacheKey = beforeTimestamp
      ? `messages:${conversationId}:cursor:${beforeTimestamp}`
      : `messages:${conversationId}:page:${skip}:${limit}`;

    // 3. Thử lấy từ cache trước
    const cachedMessages = await redis.get(cacheKey);
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

    // 5. Truy vấn
    const messages = await Message.find(query)
      .sort({ createdAt: -1 }) // sắp xếp mới -> cũ
      .skip(skip)
      .limit(limit)
      .lean();

    // 6. Lưu vào cache với TTL
    if (messages.length > 0) {
      await redisClient.set(cacheKey, JSON.stringify(messages), 300); // 5 phút

      // Đồng bộ cache phụ trợ
      await syncMessageCache(conversationId, messages);
    }

    return messages;
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
      return redis.set(
        cursorKey,
        JSON.stringify([msg]), // Lưu mảng 1 phần tử để tái sử dụng code
        "EX",
        300 // TTL 5 phút
      );
    });

    // Thực thi đồng thời tất cả cập nhật cache
    await Promise.all([
      ...individualCachePromises,
      redis.zadd(zsetKey, ...zsetUpdates),
      ...cursorCachePromises,
    ]);

    // 4. Giới hạn kích thước Sorted Set (tránh memory leak)
    const maxMessagesInCache = 1000;
    await redis.zremrangebyrank(zsetKey, 0, -maxMessagesInCache - 1);

    // 5. Cập nhật TTL cho Sorted Set
    await redis.expire(zsetKey, 3600 * 24 * 7); // TTL 1 tuần
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
