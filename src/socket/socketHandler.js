const SOCKET_EVENTS = require("../constants/socketEvents");
const redisDb = require("../config/redis");
const lastViewService = require("../services/LastViewService");
const Member = require("../models/Member");
const User = require("../models/User");
const Conversation = require("../models/Conversation");
const { validateCallPermission } = require("../validates/callValidate");
const mongoose = require("mongoose");

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
  // thong báo cuộc trò chuyện đã bị giai tan
  async notifyConversationDisbanded(conversationId, userIds) {
    userIds.forEach((userId) => {
      this.io
        .to(userId)
        .emit(SOCKET_EVENTS.DISBANDED_CONVERSATION, { conversationId });
    });
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

      socket.on("JOINED_CONVERSATION", (data) => {
        if (!data || !data.conversationId) return;
        socket.join(data.conversationId);
        console.log(
          `User ${socket.userId} joined conversation: ${data.conversationId}`
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

      // Gọi video
      socket.on(
        SOCKET_EVENTS.SUBSCRIBE_CALL_VIDEO,
        ({ conversationId, userId, peerId }) => {
          if (!conversationId || !userId || !peerId) return;

          const roomId = `call:${conversationId}`;
          socket.join(roomId);

          console.log(
            `Video call subscription: Room=${roomId}, User=${userId}, PeerId=${peerId}`
          );

          socket.broadcast.to(roomId).emit(SOCKET_EVENTS.NEW_USER_CALL, {
            conversationId,
            userId,
            peerId,
          });
        }
      );

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

      // --- Call subscription (audio & video) ---
      socket.on(SOCKET_EVENTS.SUBSCRIBE_CALL_AUDIO, (payload) =>
        this.handleSubscribeCall(payload, "audio", socket)
      );
      socket.on(SOCKET_EVENTS.SUBSCRIBE_CALL_VIDEO, (payload) =>
        this.handleSubscribeCall(payload, "video", socket)
      );

      // --- Callee accepts ---
      socket.on(SOCKET_EVENTS.ACCEPT_CALL, ({ conversationId }) => {
        const room = `call:${conversationId}`;
        socket.broadcast.to(room).emit(SOCKET_EVENTS.CALL_ACCEPTED, {
          conversationId,
          userId: socket.userId,
        });
      });

      // --- WebRTC signaling ---
      socket.on(SOCKET_EVENTS.CALL_USER, ({ signal, conversationId }) =>
        this.handleSignal(socket, signal, conversationId)
      );

      // --- End & leave ---
      socket.on(SOCKET_EVENTS.END_CALL, ({ conversationId }) =>
        this.handleEndCall(socket, conversationId)
      );

      socket.on(SOCKET_EVENTS.LEAVE_CALL, async (conversationId) => {
        const room = `call:${conversationId}`;
        socket.leave(room);
        await redisDb.clearCurrentCall(socket.userId);
        console.log(`User ${socket.userId} left room ${room} and cleared currentCall`);
      });

      socket.on(
        SOCKET_EVENTS.REJECT_CALL, async ({ conversationId, userId, reason }) => {
          const room = `call:${conversationId}`;
          console.log(
            `User ${userId} từ chối cuộc gọi (reason: ${reason || "manual"})`
          );
          socket.broadcast.to(room).emit(SOCKET_EVENTS.CALL_REJECTED, {
            userId,
            reason,
            conversationId,
          });

          try {
            const conv = await Conversation.findById(conversationId).populate("members");
            const caller = conv.members.find(
              (m) => m.userId.toString() !== userId
            );
            if (caller) {
              this.io
                .to(caller.userId.toString())
                .emit(SOCKET_EVENTS.CALL_REJECTED, {
                  userId,
                  reason,
                  conversationId,
                });
            }
          } catch (err) {
            console.error("❌ Error while emitting reject directly:", err);
          }
        }
      );

      socket.on(SOCKET_EVENTS.HIDE_CONVERSATION, async ({ conversationId }) => {
        const socketsInRoom = await this.io.in(conversationId).fetchSockets();

        socketsInRoom.forEach((socket) => {
          socket.leave(conversationId);
          console.log(`Socket ${socket.id} left room ${conversationId}`);
        });
      });

      socket.on(SOCKET_EVENTS.GROUP_CALL_USER, async ({ conversationId, channelId, roomUrl }) => {
        try {
          const conv = await Conversation.findById(conversationId).populate("members");
          if (!conv) return;

          const receivers = conv.members
            .map(m => m.userId.toString())
            .filter(id => id !== socket.userId);

          receivers.forEach(rid => {
            this.io.to(rid).emit(SOCKET_EVENTS.GROUP_CALL_USER, {
              conversationId,
              channelId,
              roomUrl
            });
          });


        } catch (err) {
          console.error("Error handling GROUP_CALL_USER:", err);
        }
      });

      socket.on(SOCKET_EVENTS.GROUP_CALL_ENDED, async ({ conversationId }) => {
        try {
          this.io.to(conversationId).emit(SOCKET_EVENTS.GROUP_CALL_ENDED, {
            conversationId
          });

          // await Conversation.findByIdAndUpdate(conversationId, { $unset: { roomUrl: "" } });
        } catch (err) {
          console.error("Error handling GROUP_CALL_ENDED:", err);
        }
      });

      socket.on(SOCKET_EVENTS.GET_CURRENT_CALL, async (cb) => {
        if (!socket.userId || typeof cb !== "function") return;
        try {
          const currentCall = await redisDb.getCurrentCall(socket.userId);
          cb({ currentCall });
        } catch (err) {
          console.error("Error fetching current call via socket:", err);
          cb({ error: "Internal Server Error" });
        }
      });
    });


  }

  // Helper methods for emitting events from controllers
  emitToUser(userId, event, data) {
    console.log(`Emitting to user ${userId}: ${event}`, data);
    this.io.to(userId).emit(event, data);
  }

  emitToUsers(userIds, event, data) {
    console.log(`Emitting to users ${userIds.join(", ")}: ${event}`, data);
    userIds.forEach((userId) => {
      this.io.to(userId).emit(event, data);
    });
  }

  async emitToConversation(conversationId, event, data) {
    console.log(`Emitting to conversation ${conversationId}: ${event}`, data);
    try {
      const conv = await Conversation.findById(conversationId).populate("members");
      if (!conv) return;

      const receivers = conv.members
        .map(m => m.userId.toString())
        .filter(id => id !== data.memberId.userId);

      for (const rid of receivers) {
        const userID = new mongoose.Types.ObjectId(rid);
        const member = await Member.getByConversationIdAndUserId(data.conversationId, userID);
        console.log(member);
        if (member && member.active) {
          this.io.to(rid).emit(event, data);
        } else {
          console.log(`User ${rid} is not active in conversation ${conversationId}`);
        }
      }
    } catch (err) {
      console.error(`Failed to emit to conversation ${conversationId}:`, err.message);
    }
  }

  emitToAll(event, data) {
    this.io.emit(event, data);
  }

  // --- Subscription for both audio/video ---
  async handleSubscribeCall({ conversationId, peerId }, type, socket) {
    const userId = socket.userId;
    console.log(`User ${userId} is subscribing to call in conversation ${conversationId}`);

    // --- Check currentCall của chính user ---
    const currentCall = await redisDb.getCurrentCall(userId);
    if (currentCall) {
      console.warn(`❌ User ${userId} already in another call: ${currentCall}`);
      socket.emit(SOCKET_EVENTS.CALL_REJECTED, {
        conversationId,
        userId,
        reason: "already_in_call",
      });
      return;
    }

    const hasPermission = await validateCallPermission(conversationId, userId, null);
    if (!hasPermission) {
      console.warn(
        `❌ User ${userId} has no permissions in the conversation ${conversationId}`
      );

      socket.emit(SOCKET_EVENTS.CALL_REJECTED, {
        conversationId,
        userId,
        reason: "permission_denied",
      });
      return;
    }

    const room = `call:${conversationId}`;
    socket.join(room);

    // Lưu trạng thái current call
    await redisDb.setCurrentCall(userId, room);

    // 1) Emit cho chính user
    socket.emit(SOCKET_EVENTS.NEW_USER_CALL, {
      conversationId,
      peerId,
      userId,
      type,
      initiator: true,
    });

    // 2) Gửi NEW_USER_CALL tới những người khác trong phòng nhưng chỉ nếu họ không ở call khác
    try {
      const conv = await Conversation.findById(conversationId).populate("members");
      if (!conv) return;

      const receivers = conv.members
        .map((m) => m.userId.toString())
        .filter((id) => id !== userId);

      const fromName = (await User.findById(userId))?.name || "";

      for (const rid of receivers) {
        const currentCallOfReceiver = await redisDb.getCurrentCall(rid);
        if (currentCallOfReceiver && currentCallOfReceiver !== room) {
          console.log(`🚫 Không gửi NEW_USER_CALL tới ${rid} vì đang ở call khác: ${currentCallOfReceiver}`);
          socket.emit(SOCKET_EVENTS.CALL_REJECTED, {
            conversationId,
            userId,
            reason: "already_in_call",
          });
          continue;
        }

        this.io.to(rid).emit(SOCKET_EVENTS.CALL_USER, {
          from: userId,
          conversationId,
          peerId,
          type,
          fromName,
        });

        socket.broadcast.to(room).emit(SOCKET_EVENTS.NEW_USER_CALL, {
          conversationId,
          peerId,
          userId,
          type,
          initiator: false,
        });
      }
    } catch (err) {
      console.error("Error in handleSubscribeCall:", err);
    }
  }


  // --- Signaling: broadcast offer/answer into proper room ---
  handleSignal(socket, signal, conversationId) {
    const from = socket.userId;
    const room = `call:${conversationId}`;
    socket.broadcast
      .to(room)
      .emit(SOCKET_EVENTS.RECEIVE_SIGNAL, { from, signal, conversationId });
  }

  // --- End call: notify & cleanup room ---
  async handleEndCall(socket, conversationId) {
    const room = `call:${conversationId}`;
    console.log(`User ${socket.userId} ended call in ${room}`);
    socket.broadcast.to(room).emit(SOCKET_EVENTS.CALL_ENDED, {
      userId: socket.userId,
    });

    // 🟩 Xoá trạng thái current call
    await redisDb.clearCurrentCall(socket.userId);
  }
}

module.exports = SocketHandler;
