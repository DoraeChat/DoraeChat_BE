const SOCKET_EVENTS = require("../constants/socketEvents");
const redisDb = require("../config/redis");
const lastViewService = require("../services/LastViewService");
const Member = require("../models/Member");
const User = require("../models/User");
const Conversation = require("../models/Conversation");

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

      socket.on(SOCKET_EVENTS.SUBSCRIBE_CALL_AUDIO, async ({ conversationId, peerId }) => {
        const userId = socket.userId;            // lấy từ socket
        const room = `call:${conversationId}`;
        socket.join(room);

        // Notify caller chính nó và broadcast cho những ai trong room
        socket.emit(SOCKET_EVENTS.NEW_USER_CALL, {
          conversationId,
          peerId,
          userId,
          type: 'audio',
          initiator: true
        });
        socket.broadcast.to(room).emit(SOCKET_EVENTS.NEW_USER_CALL, {
          conversationId,
          peerId,
          userId,
          type: 'audio',
          initiator: false
        });

        // Gửi CALL_USER trực tiếp tới từng callee (ko cần join room yet)
        try {
          const conv = await Conversation.findById(conversationId).populate('members');
          if (!conv) return;
          const receivers = conv.members
            .map(m => m.userId.toString())
            .filter(id => id !== userId);
          const fromName = (await User.findById(userId))?.name || '';
          for (const rid of receivers) {
            this.io.to(rid).emit(SOCKET_EVENTS.CALL_USER, {
              from: userId,
              peerId,
              type: 'audio',
              fromName,
              conversationId
            });
          }
        } catch (e) {
          console.error('Error in SUBSCRIBE_CALL_AUDIO:', e);
        }
      });

      // 3) Callee ACCEPT → chỉ notify room (optional)
      socket.on(SOCKET_EVENTS.ACCEPT_CALL, ({ conversationId }) => {
        const room = `call:${conversationId}`;
        socket.broadcast.to(room).emit(SOCKET_EVENTS.CALL_ACCEPTED, {
          conversationId,
          userId: socket.userId
        });
      });

      // 4) WebRTC signaling: chỉ broadcast vào room call:…
      socket.on(SOCKET_EVENTS.CALL_USER, ({ signal, conversationId }) => {
        const from = socket.userId;
        const room = `call:${conversationId}`;
        socket.broadcast.to(room)
          .emit(SOCKET_EVENTS.RECEIVE_SIGNAL, { from, signal, conversationId });
      });

      // Không cần listener thứ hai cho RECEIVE_SIGNAL ở server

      // 5) END_CALL
      socket.on(SOCKET_EVENTS.END_CALL, ({ conversationId }) => {
        const room = `call:${conversationId}`;
        console.log(`User ${socket.userId} ended call in room ${room}`);
        socket.broadcast.to(room).emit(SOCKET_EVENTS.CALL_ENDED, {
          userId: socket.userId
        });
      });
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
