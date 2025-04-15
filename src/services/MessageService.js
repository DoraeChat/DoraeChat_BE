const Message = require("../models/Message");
const Conversation = require("../models/Conversation");
const Member = require("../models/Member");
const Channel = require("../models/Channel");
const redisClient = require("../config/redis");
const CustomError = require("../exceptions/CustomError");
const NotFoundError = require("../exceptions/NotFoundError");
const CloudinaryService = require("./CloudinaryService");
const emoji = require('node-emoji');

class MessageService {
  // 🔹 Gửi tin nhắn văn bản
  async sendTextMessage(userId, conversationId, content, channelId = null) {
    if (!content.trim()) {
      throw new Error("Message content cannot be empty");
    }
    content = emoji.emojify(content); 

    // Kiểm tra member
    const member = await Member.getByConversationIdAndUserId(
      conversationId,
      userId
    );
    if (!member) {
      throw new Error("You are not a member of this conversation");
    }
    if (!member.active) {
      throw new Error(
        "You are no longer an active member of this conversation"
      );
    }

    // Kiểm tra conversation
    const conversation = await Conversation.findById(conversationId);
    if (!conversation) {
      throw new Error("Conversation not found");
    }

    // Kiểm tra loại conversation và channelId
    if (conversation.type && !channelId) {
      throw new Error("Channel ID is required for group conversations");
    }
    if (!conversation.type && channelId) {
      throw new Error(
        "Channel ID is not applicable for individual conversations"
      );
    }

    // Nếu là group, kiểm tra channel
    let validChannelId = null;
    if (conversation.type) {
      const channel = await Channel.findById(channelId);
      if (
        !channel ||
        channel.conversationId.toString() !== conversationId.toString()
      ) {
        throw new Error(
          "Invalid or non-existent channel for this conversation"
        );
      }
      validChannelId = channel._id;
    }

    // Tạo tin nhắn mới
    const newMessage = await Message.create({
      memberId: member._id,
      content,
      type: "TEXT",
      conversationId,
      ...(validChannelId && { channelId: validChannelId }), // Chỉ thêm channelId nếu có
    });

    const populatedMessage = await Message.findById(newMessage._id)
      .populate({
        path: "memberId",
        select: "userId",
      })
      .lean();

    // Cập nhật cache (nếu dùng)
    // await this.syncMessageCache(conversationId, [newMessage]);

    // Cập nhật tin nhắn cuối cùng trong cuộc trò chuyện
    conversation.lastMessageId = newMessage._id;
    await conversation.save();

    return populatedMessage;
  }

  // Lấy danh sách tin nhắn theo hội thoại giới hạn 20 tin nhắn
  async getMessagesByConversationId(
    conversationId,
    userId,
    { skip = 0, limit = 100, beforeTimestamp = null } = {}
  ) {
    // 1. Validate conversation
    const conversation = await Conversation.findById(conversationId);
    if (!conversation) {
      throw new Error("Conversation not found");
    }
    const member = await Member.getByConversationIdAndUserId(
      conversationId,
      userId
    );
    if (!member) {
      throw new Error("You are not a member of this conversation");
    }
    // 2. Xác định cache key
    // const cacheKey = beforeTimestamp
    //   ? `messages:${conversationId}:cursor:${beforeTimestamp}`
    //   : `messages:${conversationId}:page:${skip}:${limit}`;

    // 3. Thử lấy từ cache trước
    // const cachedMessages = await redisClient.get(cacheKey);
    // if (cachedMessages) {
    //   return JSON.parse(cachedMessages); // bug
    // }

    // 4. Build query nếu không có cache
    const messages = await Message.getListForIndividualConversation(
      conversationId,
      member._id,
      {
        skip,
        limit,
        beforeTimestamp,
        hideBeforeTime: member.hideBeforeTime, // Truyền hideBeforeTime từ member
      }
    );
    // 6. Lưu vào cache với TTL
    // if (messages && messages.length > 0) {
    //   await redisClient.set(cacheKey, JSON.stringify(messages), 300);
    //   await this.syncMessageCache(conversationId, messages);
    // }
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
  // thu hồi tin nhắn
  async recallMessage(conversationId, userId, messageId) {
    // Kiểm tra cuộc trò chuyện
    const conversation = await Conversation.findById(conversationId);
    if (!conversation) {
      throw new Error("Conversation not found");
    }

    // Kiểm tra thành viên
    const member = await Member.getByConversationIdAndUserId(
      conversationId,
      userId
    );
    if (!member) {
      throw new Error("You are not a member of this conversation");
    }

    // Tìm tin nhắn
    const message = await Message.findOne({
      _id: messageId,
      conversationId,
    });
    if (!message) {
      throw new Error("Message not found in this conversation");
    }

    // Kiểm tra quyền thu hồi: chỉ người gửi được thu hồi
    if (message.memberId.toString() !== member._id.toString()) {
      throw new Error("You can only recall your own messages");
    }

    if (message.isDeleted) {
      throw new Error("Message has already been recalled");
    }

    // Các loại tin nhắn cần cập nhật content
    const recallableTypes = [
      "TEXT",
      "IMAGE",
      "STICKER",
      "VIDEO",
      "FILE",
      "AUDIO",
    ];

    if (recallableTypes.includes(message.type)) {
      message.content = "Tin nhắn đã được thu hồi";
    }

    // Đánh dấu tin nhắn là đã thu hồi
    message.isDeleted = true;
    await message.save();

    // Cập nhật cache nếu cần (tùy chọn)
    // await this.syncMessageCache(conversationId, [message]);

    return message;
  }
  // lấy tin nhắn theo id
  async getMessageById(messageId) {
    try {
      const message = await Message.getById(messageId);
      return message;
    } catch (error) {
      throw new Error("Message not found");
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

  async sendImageMessage(userId, conversationId, files, channelId = null) {
    const member = await Member.getByConversationIdAndUserId(conversationId, userId);
    if (!member || !member.active) throw new CustomError("Invalid member", 400);
  
    const conversation = await Conversation.findById(conversationId);
    if (!conversation) throw new NotFoundError("Conversation");
  
    let validChannelId = null;
    if (conversation.type) {
      if (!channelId) throw new CustomError("Channel ID required", 400);
      const channel = await Channel.findById(channelId);
      if (!channel || channel.conversationId.toString() !== conversationId.toString())
        throw new CustomError("Invalid channel", 400);
      validChannelId = channel._id;
    }
  
    const uploaded = await CloudinaryService.uploadImagesMessage(conversationId, files);
  
    const messages = await Promise.all(uploaded.map(async (img) => {
      const message = await Message.create({
        memberId: member._id,
        content: img.url,
        type: "IMAGE",
        conversationId,
        ...(validChannelId && { channelId: validChannelId }),
      });
      return Message.findById(message._id).populate("memberId", "userId").lean();
    }));
  
    // Cập nhật lastMessageId cho cuộc trò chuyện
    const last = messages[messages.length - 1];
    if (last) {
      conversation.lastMessageId = last._id;
      await conversation.save();
    }
  
    return messages;
  }

  async sendVideoMessage(userId, conversationId, file, channelId = null) {
    const member = await Member.getByConversationIdAndUserId(conversationId, userId);
    if (!member || !member.active) throw new CustomError("Invalid member", 400);
  
    const conversation = await Conversation.findById(conversationId);
    if (!conversation) throw new NotFoundError("Conversation");
  
    let validChannelId = null;
    if (conversation.type) {
      if (!channelId) throw new CustomError("Channel ID required", 400);
      const channel = await Channel.findById(channelId);
      if (!channel || channel.conversationId.toString() !== conversationId.toString())
        throw new CustomError("Invalid channel", 400);
      validChannelId = channel._id;
    }
  
    const uploaded = await CloudinaryService.uploadVideoMessage(conversationId, file);
  
    const message = await Message.create({
      memberId: member._id,
      content: uploaded.url,
      type: "VIDEO",
      conversationId,
      ...(validChannelId && { channelId: validChannelId }),
    });
  
    // Cập nhật lastMessageId cho cuộc trò chuyện
    conversation.lastMessageId = message._id;
    await conversation.save();
  
    return Message.findById(message._id).populate("memberId", "userId").lean();
  }

  async sendFileMessage(userId, conversationId, file, channelId = null) {
    const member = await Member.getByConversationIdAndUserId(conversationId, userId);
    if (!member || !member.active) throw new CustomError("Invalid member", 400);
  
    const conversation = await Conversation.findById(conversationId);
    if (!conversation) throw new NotFoundError("Conversation");
  
    let validChannelId = null;
    if (conversation.type) {
      if (!channelId) throw new CustomError("Channel ID required", 400);
      const channel = await Channel.findById(channelId);
      if (!channel || channel.conversationId.toString() !== conversationId.toString())
        throw new CustomError("Invalid channel", 400);
      validChannelId = channel._id;
    }
  
    const uploaded = await CloudinaryService.uploadFileMessage(conversationId, file);
  
    const message = await Message.create({
      memberId: member._id,
      content: uploaded.url,
      type: "FILE",
      conversationId,
      ...(validChannelId && { channelId: validChannelId }),
    });
  
    // Cập nhật lastMessageId cho cuộc trò chuyện
    conversation.lastMessageId = message._id;
    await conversation.save();
  
    return Message.findById(message._id).populate("memberId", "userId").lean();
  }
}

module.exports = new MessageService();
