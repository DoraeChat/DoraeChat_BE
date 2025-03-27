// const redisDb = require("./redis");
// const lastViewService = require("../services/LastViewService");

// const REDIS_TTL = 86400;
// /**
//  * Xử lý khi người dùng rời đi
//  * @param {string} userId - ID của người dùng
//  * @returns {Promise<void>}
//  */
// const handleLeave = async (userId) => {
//   try {
//     const cachedUser = await redisDb.get(userId);
//     if (cachedUser) {
//       await redisDb.set(
//         userId,
//         {
//           ...cachedUser,
//           isOnline: false,
//           lastLogin: new Date(),
//         },
//         REDIS_TTL
//       );
//       console.log(`User ${userId} went offline`);
//     }
//   } catch (error) {
//     console.error(`Error in handleLeave for user ${userId}:`, error);
//   }
// };

// /**
//  * Xử lý khi người dùng tham gia
//  * @param {string} userId - ID của người dùng
//  * @returns {Promise<void>}
//  */
// const handleJoin = async (userId) => {
//   try {
//     const cachedUser = await redisDb.get(userId);
//     if (cachedUser) {
//       await redisDb.set(
//         userId,
//         {
//           ...cachedUser,
//           isOnline: true,
//           lastLogin: null,
//         },
//         REDIS_TTL
//       );
//       console.log(`User ${userId} came online`);
//     }
//   } catch (error) {
//     console.error(`Error in handleJoin for user ${userId}:`, error);
//   }
// };

// /**
//  * Lấy trạng thái online của người dùng
//  * @param {string} userId - ID của người dùng
//  * @param {Function} cb - Callback function
//  * @returns {Promise<void>}
//  */
// const getUserOnline = async (userId, cb) => {
//   try {
//     const cachedUser = await redisDb.get(userId);
//     if (cachedUser) {
//       const { isOnline, lastLogin } = cachedUser;
//       cb({ isOnline, lastLogin });
//     } else {
//       cb({ isOnline: false, lastLogin: null });
//     }
//   } catch (error) {
//     console.error(`Error in getUserOnline for user ${userId}:`, error);
//     cb({ isOnline: false, lastLogin: null, error: true });
//   }
// };

// /**
//  * Cập nhật last view cho cuộc trò chuyện hoặc kênh
//  * @param {string} conversationId - ID cuộc trò chuyện
//  * @param {string|null} channelId - ID kênh (nếu có)
//  * @param {string} userId - ID người dùng
//  * @param {Object} socket - Socket object
//  * @returns {Promise<void>}
//  */
// const updateLastView = async (conversationId, channelId, userId, socket) => {
//   try {
//     const updatePromise = channelId
//       ? lastViewService.updateLastViewOfChannel(
//           conversationId,
//           channelId,
//           userId
//         )
//       : lastViewService.updateLastViewOfConversation(conversationId, userId);

//     await updatePromise;

//     const lastViewData = {
//       conversationId,
//       userId,
//       lastView: new Date(),
//     };

//     if (channelId) {
//       lastViewData.channelId = channelId;
//     }

//     socket.to(`${conversationId}`).emit("user-last-view", lastViewData);
//   } catch (error) {
//     console.error(
//       `Error updating last view for conversation ${conversationId}, user ${userId}:`,
//       error
//     );
//   }
// };

// /**
//  * Thiết lập Socket.IO
//  * @param {Object} io - Socket.IO instance
//  */
// const socket = (io) => {
//   io.on("connect", (socket) => {
//     console.log(`Socket connected: ${socket.id}`);

//     // Cleanup khi disconnect
//     socket.on("disconnect", () => {
//       const { userId } = socket;
//       if (userId) {
//         handleLeave(userId);
//         console.log(`Socket disconnected: ${socket.id}, User: ${userId}`);
//       }
//     });

//     // Người dùng tham gia
//     socket.on("join", (userId) => {
//       if (!userId) return;

//       socket.userId = userId;
//       socket.join(userId);
//       handleJoin(userId);
//       console.log(`User ${userId} joined`);
//     });

//     // Tham gia nhiều cuộc trò chuyện
//     socket.on("join-conversations", (conversationIds) => {
//       if (!Array.isArray(conversationIds)) return;

//       conversationIds.forEach((id) => {
//         if (id) socket.join(id);
//       });
//       console.log(
//         `User ${socket.userId} joined conversations: ${conversationIds.join(
//           ", "
//         )}`
//       );
//     });

//     // Tham gia một cuộc trò chuyện
//     socket.on("join-conversation", (conversationId) => {
//       if (!conversationId) return;

//       socket.join(conversationId);
//       console.log(
//         `User ${socket.userId} joined conversation: ${conversationId}`
//       );
//     });

//     // Rời khỏi cuộc trò chuyện
//     socket.on("leave-conversation", (conversationId) => {
//       if (!conversationId) return;

//       socket.leave(conversationId);
//       console.log(`User ${socket.userId} left conversation: ${conversationId}`);
//     });

//     // Đang nhập
//     socket.on("typing", (conversationId, me) => {
//       if (!conversationId) return;

//       socket.broadcast.to(conversationId).emit("typing", conversationId, me);
//     });

//     // Không còn đang nhập
//     socket.on("not-typing", (conversationId, me) => {
//       if (!conversationId) return;

//       socket.broadcast
//         .to(conversationId)
//         .emit("not-typing", conversationId, me);
//     });

//     // Kiểm tra trạng thái online
//     socket.on("get-user-online", (userId, cb) => {
//       if (!userId || typeof cb !== "function") return;

//       getUserOnline(userId, cb);
//     });

//     // Gọi video
//     socket.on(
//       "subscribe-call-video",
//       ({ conversationId, newUserId, peerId }) => {
//         if (!conversationId || !newUserId || !peerId) return;

//         const roomId = `${conversationId}call`;
//         socket.join(roomId);

//         console.log(
//           `Video call subscription: Room=${roomId}, User=${newUserId}, PeerId=${peerId}`
//         );

//         socket.broadcast.to(roomId).emit("new-user-call", {
//           conversationId,
//           newUserId,
//           peerId,
//         });
//       }
//     );

//     // Cập nhật last view
//     socket.on("conversation-last-view", (conversationId, channelId) => {
//       if (!conversationId || !socket.userId) return;

//       updateLastView(conversationId, channelId, socket.userId, socket);
//     });
//   });
// };

// module.exports = socket;
