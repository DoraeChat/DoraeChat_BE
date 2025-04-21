const SOCKET_EVENTS = require("../constants/socketEvents");
const redisDb = require("../config/redis");
const lastViewService = require("../services/LastViewService");
const Member = require("../models/Member");
const User = require("../models/User");
const Conversation = require("../models/Conversation");
const { validateCallPermission } = require("../validates/callValidate");

const REDIS_TTL = 86400;

class SocketHandler {
  constructor(io) {
    this.io = io;
    this.setupSocketEvents();
  }

  async handleLeave(userId) {
    try {
      const cachedUser = await redisDb.get(userId);
      if (cachedUser) {
        await redisDb.set(
          userId,
          { ...cachedUser, isOnline: false, lastLogin: new Date() },
          REDIS_TTL
        );
        console.log(`User ${userId} went offline`);
      }
    } catch (error) {
      console.error(`Error in handleLeave for ${userId}:`, error);
    }
  }

  async handleJoin(userId) {
    try {
      const cachedUser = await redisDb.get(userId);
      if (cachedUser) {
        await redisDb.set(
          userId,
          { ...cachedUser, isOnline: true, lastLogin: null },
          REDIS_TTL
        );
        console.log(`User ${userId} came online`);
      }
    } catch (error) {
      console.error(`Error in handleJoin for ${userId}:`, error);
    }
  }

  async updateLastView(conversationId, channelId, userId, socket) {
    try {
      const updatePromise = channelId
        ? lastViewService.updateLastViewOfChannel(conversationId, channelId, userId)
        : lastViewService.updateLastViewOfConversation(conversationId, userId);

      await updatePromise;
      const payload = { conversationId, userId, lastView: new Date() };
      if (channelId) payload.channelId = channelId;
      socket.to(conversationId).emit(SOCKET_EVENTS.USER_LAST_VIEW, payload);
    } catch (e) {
      console.error(`Error updating last view:`, e);
    }
  }

  setupSocketEvents() {
    this.io.on("connect", (socket) => {
      console.log(`Socket connected: ${socket.id}`);

      socket.on(SOCKET_EVENTS.DISCONNECT, () => {
        const { userId } = socket;
        if (userId) this.handleLeave(userId);
      });

      socket.on(SOCKET_EVENTS.JOIN, (userId) => {
        if (!userId) return;
        socket.userId = userId;
        socket.join(userId);
        this.handleJoin(userId);
      });

      socket.on(SOCKET_EVENTS.JOIN_CONVERSATIONS, (ids) => {
        if (!Array.isArray(ids)) return;
        ids.forEach(id => id && socket.join(id));
      });
      socket.on(SOCKET_EVENTS.JOIN_CONVERSATION, id => id && socket.join(id));
      socket.on(SOCKET_EVENTS.LEAVE_CONVERSATION, id => id && socket.leave(id));

      socket.on(SOCKET_EVENTS.TYPING, ({ conversationId, userId }) => {
        if (conversationId) socket.broadcast.to(conversationId).emit(SOCKET_EVENTS.TYPING, { conversationId, userId });
      });
      socket.on(SOCKET_EVENTS.NOT_TYPING, ({ conversationId, userId }) => {
        if (conversationId) socket.broadcast.to(conversationId).emit(SOCKET_EVENTS.NOT_TYPING, { conversationId, userId });
      });

      socket.on(SOCKET_EVENTS.GET_USER_ONLINE, (userId, cb) => {
        if (!userId || typeof cb !== 'function') return;
        this.getUserOnline(userId, cb);
      });

      // --- Call subscription (audio & video) ---
      socket.on(SOCKET_EVENTS.SUBSCRIBE_CALL_AUDIO, payload =>
        this.handleSubscribeCall(payload, "audio", socket)
      );
      socket.on(SOCKET_EVENTS.SUBSCRIBE_CALL_VIDEO, payload =>
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
      socket.on(SOCKET_EVENTS.LEAVE_CALL, (conversationId) =>
        socket.leave(`call:${conversationId}`)
      );

      socket.on(SOCKET_EVENTS.REJECT_CALL, ({ conversationId, userId, reason }) => {
        const room = `call:${conversationId}`;
        console.log(`User ${userId} từ chối cuộc gọi (reason: ${reason || "manual"})`);
        socket.broadcast.to(room).emit(SOCKET_EVENTS.CALL_REJECTED, {
          userId,
          reason,
          conversationId
        });

        try {
          const conv = Conversation.findById(conversationId).populate("members");
          const caller = conv.members.find(m => m.userId.toString() !== userId);
          if (caller) {
            this.io.to(caller.userId.toString()).emit(SOCKET_EVENTS.CALL_REJECTED, {
              userId,
              reason,
              conversationId,
            });
          }
        } catch (err) {
          console.error("❌ Error while emitting reject directly:", err);
        }
      });

    });
  }

  // --- Subscription for both audio/video ---
  async handleSubscribeCall({ conversationId, peerId }, type, socket) {
    const userId = socket.userId;
    console.log(`User ${userId} is subscribing to call in conversation ${conversationId}`);
    const hasPermission = await validateCallPermission(conversationId, userId, null);
    console.log(`Permission check passed for user ${userId} in conversation ${conversationId}: ${hasPermission}`);
    if (!hasPermission) {
      console.warn(`❌ User ${userId} không có quyền gọi trong cuộc trò chuyện ${conversationId}`);

      socket.emit(SOCKET_EVENTS.CALL_REJECTED, {
        conversationId,
        userId,
        reason: "permission_denied",
      });
      return;
    }
    console.log(`User ${userId} joined call room: ${conversationId}`);

    const room = `call:${conversationId}`;
    socket.join(room);

    // 1) NEW_USER_CALL broadcast
    socket.emit(SOCKET_EVENTS.NEW_USER_CALL, {
      conversationId, peerId, userId, type, initiator: true
    });
    socket.broadcast.to(room).emit(SOCKET_EVENTS.NEW_USER_CALL, {
      conversationId, peerId, userId, type, initiator: false
    });

    // 2) CALL_USER direct to all other members
    try {
      const conv = await Conversation.findById(conversationId).populate("members");
      if (!conv) return;
      const receivers = conv.members
        .map(m => m.userId.toString())
        .filter(id => id !== userId);
      const fromName = (await User.findById(userId))?.name || "";
      for (const rid of receivers) {
        this.io.to(rid).emit(SOCKET_EVENTS.CALL_USER, {
          from: userId,
          conversationId,
          peerId,
          type,
          fromName,
        });
      }
    } catch (e) {
      console.error("Error in handleSubscribeCall:", e);
    }
  }

  // --- Signaling: broadcast offer/answer into proper room ---
  handleSignal(socket, signal, conversationId) {
    const from = socket.userId;
    const room = `call:${conversationId}`;
    socket.broadcast.to(room)
      .emit(SOCKET_EVENTS.RECEIVE_SIGNAL, { from, signal, conversationId });
  }

  // --- End call: notify & cleanup room ---
  handleEndCall(socket, conversationId) {
    const room = `call:${conversationId}`;
    console.log(`User ${socket.userId} ended call in ${room}`);
    socket.broadcast.to(room).emit(SOCKET_EVENTS.CALL_ENDED, {
      userId: socket.userId,
    });
  }

  async getUserOnline(userId, cb) {
    try {
      const cu = await redisDb.get(userId);
      cb(cu ? { isOnline: cu.isOnline, lastLogin: cu.lastLogin } : { isOnline: false, lastLogin: null });
    } catch (e) {
      cb({ isOnline: false, lastLogin: null, error: true });
    }
  }
}

module.exports = SocketHandler;
