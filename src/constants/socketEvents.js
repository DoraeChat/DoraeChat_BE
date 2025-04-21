const SOCKET_EVENTS = {
  // Friend system
  ACCEPT_FRIEND: "accept-friend",
  SEND_FRIEND_INVITE: "send-friend-invite",
  DELETED_FRIEND_INVITE: "deleted-friend-invite",
  DELETED_INVITE_WAS_SEND: "deleted-invite-was-send",
  DELETED_FRIEND: "deleted-friend",
  REVOKE_TOKEN: "revoke-token",

  // User presences
  JOIN: "join",
  DISCONNECT: "disconnect",

  // Conversations
  JOIN_CONVERSATIONS: "join-conversations",
  JOIN_CONVERSATION: "join-conversation",
  LEAVE_CONVERSATION: "leave-conversation",
  NEW_GROUP_CONVERSATION: "new-group-conversation",

  //Messages
  RECEIVE_MESSAGE: "receive-message",
  MESSAGE_RECALLED: "message-recalled",
  MESSAGE_DELETED_FOR_ME: "message_deleted_for_me",

  // Typing indicators
  TYPING: "typing",
  NOT_TYPING: "not-typing",

  // Online status
  GET_USER_ONLINE: "get-user-online",

  // Video call
  SUBSCRIBE_CALL_VIDEO: "subscribe-call-video",
  NEW_USER_CALL: "new-user-call",

  // Last view tracking
  CONVERSATION_LAST_VIEW: "conversation-last-view",
  USER_LAST_VIEW: "user-last-view",
};

module.exports = SOCKET_EVENTS;
