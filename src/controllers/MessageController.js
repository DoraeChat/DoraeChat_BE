const SOCKET_EVENTS = require("../constants/socketEvents");
const MessageService = require("../services/MessageService");

class MessageController {
  constructor(socketHandler) {
    this.socketHandler = socketHandler;
    this.sendTextMessage = this.sendTextMessage.bind(this);
    this.recallMessage = this.recallMessage.bind(this);
    this.sendImageMessage = this.sendImageMessage.bind(this);
    this.sendFileMessage = this.sendFileMessage.bind(this);
    this.sendVideoMessage = this.sendVideoMessage.bind(this);
    this.deleteMessageForMe = this.deleteMessageForMe.bind(this);
    this.sendReplyMessage = this.sendReplyMessage.bind(this);
  }
  // [POST] /api/message/text - Gửi tin nhắn văn bản
  async sendTextMessage(req, res) {
    try {
      const { conversationId, content, channelId, type } = req.body;
      const userId = req._id;

      if (!conversationId || !content) {
        return res
          .status(400)
          .json({ message: "Conversation ID and content are required" });
      }

      const message = await MessageService.sendTextMessage(
        userId,
        conversationId,
        content,
        channelId, // Truyền channelId (có thể là null)
        type
      );

      // Phát sự kiện socket đến conversationId (và channelId nếu có)
      this.socketHandler.emitToConversation(
        conversationId,
        SOCKET_EVENTS.RECEIVE_MESSAGE,
        message
      );

      res.status(201).json(message);
    } catch (error) {
      res.status(400).json({ message: error.message });
    }
  }
  // [POST] /api/message/reply - Gửi tin nhắn trả lời
  async sendReplyMessage(req, res) {
    try {
      const { conversationId, content, replyMessageId, channelId, type } =
        req.body;
      const userId = req._id;

      if (!conversationId || !content || !replyMessageId) {
        return res.status(400).json({
          message: "Conversation ID, content, and replyMessageId are required",
        });
      }

      const message = await MessageService.sendReplyMessage(
        userId,
        conversationId,
        content,
        replyMessageId,
        channelId,
        type
      );

      this.socketHandler.emitToConversation(
        conversationId,
        SOCKET_EVENTS.RECEIVE_MESSAGE,
        message
      );

      res.status(201).json(message);
    } catch (error) {
      res.status(400).json({ message: error.message });
    }
  }

  // [GET] /api/messages/:conversationId - Lấy danh sách tin nhắn theo conversationId 1-1
  async getMessagesByConversation(req, res) {
    try {
      const { conversationId } = req.params;
      const userId = req._id; //userId được lấy từ middleware xác thực

      if (!conversationId) {
        return res.status(400).json({ message: "Conversation ID is required" });
      }

      // Gọi phương thức từ MessageService để lấy danh sách tin nhắn
      const messages = await MessageService.getMessagesByConversationId(
        conversationId,
        userId
      );
      res.status(200).json(messages);
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  }
  // [GET] /api/message/channel/:channelId - Lấy danh sách tin nhắn theo channelId - group
  async getMessagesByChannelId(req, res) {
    try {
      const { channelId } = req.params;
      const userId = req._id; //userId được lấy từ middleware xác thực
      const { skip = 0, limit = 20 } = req.query; // Phân trang mặc định

      if (!channelId) {
        return res.status(400).json({ message: "Channel ID is required" });
      }

      // Gọi MessageService để lấy danh sách tin nhắn
      const messages = await MessageService.getMessagesByChannelId(
        channelId,
        userId,
        parseInt(skip),
        parseInt(limit)
      );
      res.status(200).json(messages);
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  } // [DELETE] /api/message/:id/conversation/:conversationId- Thu hồi tin nhắn
  async recallMessage(req, res) {
    try {
      const { id: messageId, conversationId } = req.params;
      const userId = req._id;

      if (!conversationId || !messageId) {
        return res
          .status(400)
          .json({ message: "Conversation ID and Message ID are required" });
      }

      const recalledMessage = await MessageService.recallMessage(
        conversationId,
        userId,
        messageId
      );

      // Gửi sự kiện real-time đến tất cả user trong phòng chat
      this.socketHandler.emitToConversation(
        conversationId,
        SOCKET_EVENTS.MESSAGE_RECALLED,
        recalledMessage
      );

      res.status(200).json(recalledMessage);
    } catch (error) {
      res.status(400).json({ message: error.message });
    }
  }

  async sendImageMessage(req, res) {
    try {
      const { conversationId, channelId } = req.body;
      const userId = req._id;

      if (!conversationId || !req.files || req.files.length === 0)
        return res.status(400).json({ message: "Invalid image message" });
      console.log(channelId);
      const messages = await MessageService.sendImageMessage(
        userId,
        conversationId,
        req.files,
        channelId
      );

      // Emit từng ảnh
      if (this.socketHandler) {
        for (const message of messages) {
          this.socketHandler.emitToConversation(
            conversationId,
            SOCKET_EVENTS.RECEIVE_MESSAGE,
            message
          );
        }
      }

      res.status(201).json(messages);
    } catch (error) {
      res.status(400).json({ message: error.message });
    }
  }

  async sendVideoMessage(req, res) {
    try {
      const { conversationId, channelId } = req.body;
      const userId = req._id;

      if (!conversationId || !req.file)
        return res.status(400).json({ message: "Invalid video message" });

      const message = await MessageService.sendVideoMessage(
        userId,
        conversationId,
        req.file,
        channelId
      );

      this.socketHandler.emitToConversation(
        conversationId,
        SOCKET_EVENTS.RECEIVE_MESSAGE,
        message
      );

      res.status(201).json(message);
    } catch (error) {
      res.status(400).json({ message: error.message });
    }
  }

  async sendFileMessage(req, res) {
    try {
      const { conversationId, channelId } = req.body;
      const userId = req._id;

      if (!conversationId || !req.file)
        return res.status(400).json({ message: "Invalid file message" });

      const message = await MessageService.sendFileMessage(
        userId,
        conversationId,
        req.file,
        channelId
      );

      this.socketHandler.emitToConversation(
        conversationId,
        SOCKET_EVENTS.RECEIVE_MESSAGE,
        message
      );

      res.status(201).json(message);
    } catch (error) {
      res.status(400).json({ message: error.message });
    }
  }
  // [DELETE] /api/message/:id/only - Xóa tin nhắn chỉ phía người dùng hiện tại
  async deleteMessageForMe(req, res) {
    try {
      const { id: messageId } = req.params;
      const { conversationId } = req.body; // Nhận conversationId từ body
      const userId = req._id;

      if (!conversationId || !messageId) {
        return res
          .status(400)
          .json({ message: "Conversation ID and Message ID are required" });
      }

      const { deletedMessage, newLastMessage } =
        await MessageService.deleteMessageForMe(
          conversationId,
          userId,
          messageId
        );

      // Gửi sự kiện socket đến chính người dùng
      if (this.socketHandler) {
        this.socketHandler.emitToUser(
          userId,
          SOCKET_EVENTS.MESSAGE_DELETED_FOR_ME,
          {
            deletedMessage,
            newLastMessage,
          }
        );
      }

      res.status(200).json({
        deletedMessage,
        newLastMessage,
      });
    } catch (error) {
      res.status(400).json({ message: error.message });
    }
  }
}

module.exports = MessageController;
