const SOCKET_EVENTS = require("../constants/socketEvents");
const redisDb = require("../config/redis");
const lastViewService = require("../services/LastViewService");
const { validateCallPermission } = require("../validates/callValidate");
const Member = require("../models/Member");
const Conversation = require("../models/Conversation");

const REDIS_TTL = 86400;

class SocketHandler {
  constructor(io) {
    this.io = io;
    this.setupSocketEvents();
  }

  /**
   * Xử lý khi người dùng rời đi
   * @param {string} userId - ID của người dùng
   * @returns {Promise<void>}
   */
  async handleLeave(userId) {
    try {
      const cachedUser = await redisDb.get(userId);
      if (cachedUser) {
        await redisDb.set(
          userId,
          {
            ...cachedUser,
            isOnline: false,
            lastLogin: new Date(),
          },
          REDIS_TTL
        );
        console.log(`User ${userId} went offline`);
      }
    } catch (error) {
      console.error(`Error in handleLeave for user ${userId}:`, error);
    }
  }

  /**
   * Xử lý khi người dùng tham gia
   * @param {string} userId - ID của người dùng
   * @returns {Promise<void>}
   */
  async handleJoin(userId) {
    try {
      const cachedUser = await redisDb.get(userId);
      if (cachedUser) {
        await redisDb.set(
          userId,
          {
            ...cachedUser,
            isOnline: true,
            lastLogin: null,
          },
          REDIS_TTL
        );
        console.log(`User ${userId} came online`);
      }
    } catch (error) {
      console.error(`Error in handleJoin for user ${userId}:`, error);
    }
  }

  /**
   * Lấy trạng thái online của người dùng
   * @param {string} userId - ID của người dùng
   * @param {Function} cb - Callback function
   * @returns {Promise<void>}
   */
  async getUserOnline(userId, cb) {
    try {
      const cachedUser = await redisDb.get(userId);
      if (cachedUser) {
        const { isOnline, lastLogin } = cachedUser;
        cb({ isOnline, lastLogin });
      } else {
        cb({ isOnline: false, lastLogin: null });
      }
    } catch (error) {
      console.error(`Error in getUserOnline for user ${userId}:`, error);
      cb({ isOnline: false, lastLogin: null, error: true });
    }
  }

  /**
   * Cập nhật last view cho cuộc trò chuyện hoặc kênh
   * @param {string} conversationId - ID cuộc trò chuyện
   * @param {string|null} channelId - ID kênh (nếu có)
   * @param {string} userId - ID người dùng
   * @param {Object} socket - Socket object
   * @returns {Promise<void>}
   */
  async updateLastView(conversationId, channelId, userId, socket) {
    try {
      const updatePromise = channelId
        ? lastViewService.updateLastViewOfChannel(
          conversationId,
          channelId,
          userId
        )
        : lastViewService.updateLastViewOfConversation(conversationId, userId);

      await updatePromise;

      const lastViewData = {
        conversationId,
        userId,
        lastView: new Date(),
      };

      if (channelId) {
        lastViewData.channelId = channelId;
      }

      socket
        .to(`${conversationId}`)
        .emit(SOCKET_EVENTS.USER_LAST_VIEW, lastViewData);
    } catch (error) {
      console.error(
        `Error updating last view for conversation ${conversationId}, user ${userId}:`,
        error
      );
    }
  }

  setupSocketEvents() {
    this.io.on("connect", (socket) => {
      console.log(`Socket connected: ${socket.id}`);

      // Cleanup khi disconnect
      socket.on(SOCKET_EVENTS.DISCONNECT, () => {
        const { userId } = socket;
        if (userId) {
          this.handleLeave(userId);
          console.log(`Socket disconnected: ${socket.id}, User: ${userId}`);
        }
      });

      // Người dùng tham gia
      socket.on(SOCKET_EVENTS.JOIN, (userId) => {
        if (!userId) return;

        socket.userId = userId;
        socket.join(userId);
        this.handleJoin(userId);
        console.log(`User ${userId} joined`);
      });

      // Tham gia nhiều cuộc trò chuyện
      socket.on(SOCKET_EVENTS.JOIN_CONVERSATIONS, (conversationIds) => {
        if (!Array.isArray(conversationIds)) return;

        conversationIds.forEach((id) => {
          if (id) socket.join(id);
        });
        console.log(
          `User ${socket.userId} joined conversations: ${conversationIds.join(
            ", "
          )}`
        );
      });

      // Tham gia một cuộc trò chuyện
      socket.on(SOCKET_EVENTS.JOIN_CONVERSATION, (conversationId) => {
        if (!conversationId) return;

        socket.join(conversationId);
        console.log(
          `User ${socket.userId} joined conversation: ${conversationId}`
        );
      });

      // Rời khỏi cuộc trò chuyện
      socket.on(SOCKET_EVENTS.LEAVE_CONVERSATION, (conversationId) => {
        if (!conversationId) return;

        socket.leave(conversationId);
        console.log(
          `User ${socket.userId} left conversation: ${conversationId}`
        );
      });

      // Đang nhập
      socket.on(SOCKET_EVENTS.TYPING, ({ conversationId, userId }) => {
        if (!conversationId) return;

        socket.broadcast
          .to(conversationId)
          .emit(SOCKET_EVENTS.TYPING, { conversationId, userId });
      });

      // Không còn đang nhập
      socket.on(SOCKET_EVENTS.NOT_TYPING, ({ conversationId, userId }) => {
        if (!conversationId) return;

        socket.broadcast
          .to(conversationId)
          .emit(SOCKET_EVENTS.NOT_TYPING, { conversationId, userId });
      });

      // Kiểm tra trạng thái online
      socket.on(SOCKET_EVENTS.GET_USER_ONLINE, (userId, cb) => {
        if (!userId || typeof cb !== "function") return;

        this.getUserOnline(userId, cb);
      });

      // --- SIMPLE PEER ---
      socket.on(
        SOCKET_EVENTS.CALL_USER,
        async ({ from, signal, conversationId }) => {
          console.log(`📥 Backend nhận CALL_USER từ ${from} → conv: ${conversationId}`);
          console.log("CALL_USER payload:", { from, signal, conversationId });

          // Lấy thành viên phòng gọi
          socket.broadcast.to(conversationId).emit(SOCKET_EVENTS.RECEIVE_SIGNAL, {
            from,
            signal,
            conversationId,
          });
        }
      );

      socket.on(
        SOCKET_EVENTS.CALL_USER,
        async ({ from, signal, conversationId }) => {
          console.log(`📥 Backend nhận CALL_USER từ ${from} → conv: ${conversationId}`);
          console.log("CALL_USER payload:", { from, signal, conversationId });

          socket.broadcast.to(conversationId).emit(SOCKET_EVENTS.RECEIVE_SIGNAL, {
            from,
            signal,
            conversationId,
          });
        }
      );


      socket.on(
        SOCKET_EVENTS.RECEIVE_SIGNAL,
        ({ to, from, signal, conversationId }) => {
          console.log(
            `📥 Backend nhận ICE/CANDIDATE từ ${from} → gửi tới ${to} (conv: ${conversationId})`
          );
          this.io.to(to).emit(SOCKET_EVENTS.RECEIVE_SIGNAL, { from, signal, conversationId });
        }
      );

      // ở SocketHandler, trong SUBSCRIBE_CALL_AUDIO / SUBSCRIBE_CALL_VIDEO
      socket.on(SOCKET_EVENTS.SUBSCRIBE_CALL_AUDIO, ({ conversationId, userId, peerId }) => {
        const room = `call:${conversationId}`;
        socket.join(room);
        // sender (initiator) tự nhận initiator=true, broadcast ra others với initiator=false
        socket.emit(SOCKET_EVENTS.NEW_USER_CALL, { conversationId, userId, peerId, type: 'audio', startedAt: Date.now(), initiator: true });
        socket.broadcast.to(room).emit(SOCKET_EVENTS.NEW_USER_CALL, { conversationId, userId, peerId, type: 'audio', startedAt: Date.now(), initiator: false });
      });


      socket.on(SOCKET_EVENTS.SUBSCRIBE_CALL_VIDEO, ({ conversationId, userId, peerId }) => {
        const room = `call:${conversationId}`;
        socket.join(room);
        socket.broadcast.to(room).emit(SOCKET_EVENTS.NEW_USER_CALL, { conversationId, userId, peerId, type: 'video', startedAt: Date.now(), initiator: true });
      });

      socket.on(SOCKET_EVENTS.REJECT_CALL, ({ conversationId, userId }) => {
        const room = `call:${conversationId}`;
        socket.broadcast.to(room).emit(SOCKET_EVENTS.CALL_REJECTED, { userId });
      });

      socket.on(SOCKET_EVENTS.END_CALL, ({ conversationId, userId }) => {
        const room = `call:${conversationId}`;
        socket.broadcast.to(room).emit(SOCKET_EVENTS.CALL_ENDED, { userId });
      });


      // Cập nhật last view
      socket.on(
        SOCKET_EVENTS.CONVERSATION_LAST_VIEW,
        ({ conversationId, channelId }) => {
          if (!conversationId || !socket.userId) return;

          this.updateLastView(conversationId, channelId, socket.userId, socket);
        }
      );

      // Friend system events
      socket.on(SOCKET_EVENTS.ACCEPT_FRIEND, (data) => {
        if (!data || !data.userId) return;
        socket.to(data.userId).emit(SOCKET_EVENTS.ACCEPT_FRIEND, data);
      });

      socket.on(SOCKET_EVENTS.SEND_FRIEND_INVITE, (data) => {
        if (!data || !data.userId) return;
        socket.to(data.userId).emit(SOCKET_EVENTS.SEND_FRIEND_INVITE, data);
      });

      socket.on(SOCKET_EVENTS.DELETED_FRIEND_INVITE, (data) => {
        if (!data || !data.userId) return;
        socket.to(data.userId).emit(SOCKET_EVENTS.DELETED_FRIEND_INVITE, data);
      });

      socket.on(SOCKET_EVENTS.DELETED_INVITE_WAS_SEND, (data) => {
        if (!data || !data.userId) return;
        socket
          .to(data.userId)
          .emit(SOCKET_EVENTS.DELETED_INVITE_WAS_SEND, data);
      });

      socket.on(SOCKET_EVENTS.DELETED_FRIEND, (data) => {
        if (!data || !data.userId) return;
        socket.to(data.userId).emit(SOCKET_EVENTS.DELETED_FRIEND, data);
      });
    });
  }

  // Helper methods for emitting events from controllers
  emitToUser(userId, event, data) {
    console.log(`Emitting to user ${userId}: ${event}`, data);
    this.io.to(userId).emit(event, data);
  }

  emitToConversation(conversationId, event, data) {
    console.log(`Emitting to conversation ${conversationId}: ${event}`, data);
    this.io.to(conversationId).emit(event, data);
  }

  emitToAll(event, data) {
    this.io.emit(event, data);
  }
}

module.exports = SocketHandler;
