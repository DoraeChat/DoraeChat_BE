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

      // Caller subscribes to call room
      socket.on(SOCKET_EVENTS.SUBSCRIBE_CALL_AUDIO, async ({ conversationId, userId, peerId }) => {
        const room = `call:${conversationId}`;
        socket.join(room);

        // Notify both caller and callee
        socket.emit(SOCKET_EVENTS.NEW_USER_CALL, { conversationId, userId, peerId, type: 'audio', initiator: true });
        socket.broadcast.to(room).emit(SOCKET_EVENTS.NEW_USER_CALL, { conversationId, userId, peerId, type: 'audio', initiator: false });

        try {
          const conv = await Conversation.findById(conversationId).populate('members');
          if (!conv) return;
          const receivers = conv.members.filter(m => m.userId.toString() !== userId).map(m => m.userId.toString());
          const userDoc = await User.findById(userId);
          const fromName = userDoc?.name || '';
          for (const rid of receivers) {
            this.io.to(rid).emit(SOCKET_EVENTS.CALL_USER, { from: userId, fromName, conversationId });
          }
        } catch (e) {
          console.error('Error in SUBSCRIBE_CALL_AUDIO:', e);
        }
      });

      // Callee accepts the call
      socket.on(SOCKET_EVENTS.ACCEPT_CALL, ({ conversationId, userId }) => {
        const room = `call:${conversationId}`;
        console.log(`✅ ${userId} accepted call, notifying others in ${room}`);
        socket.broadcast.to(room).emit(SOCKET_EVENTS.CALL_ACCEPTED, { conversationId, userId });
      });


      // WebRTC signaling
      socket.on(SOCKET_EVENTS.CALL_USER, ({ from, signal, conversationId }) => {
        socket.broadcast.to(conversationId).emit(SOCKET_EVENTS.RECEIVE_SIGNAL, { from, signal, conversationId });
      });
      socket.on(SOCKET_EVENTS.RECEIVE_SIGNAL, ({ to, from, signal, conversationId }) => {
        this.io.to(to).emit(SOCKET_EVENTS.RECEIVE_SIGNAL, { from, signal, conversationId });
      });

      socket.on(SOCKET_EVENTS.END_CALL, ({ conversationId, userId }) => {
        socket.broadcast.to(`call:${conversationId}`).emit(SOCKET_EVENTS.CALL_ENDED, { userId });
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
