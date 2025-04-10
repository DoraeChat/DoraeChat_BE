const express = require("express");
const router = express.Router();
const MessageController = require("../controllers/MessageController");

const MessageRouter = (socketHandler) => {
  const messageController = new MessageController(socketHandler);

  router.post("/text", messageController.sendTextMessage);
  router.get("/:conversationId", messageController.getMessagesByConversation);
  router.get("/channel/:channelId", messageController.getMessagesByChannelId);
  router.delete(
    "/:id/conversation/:conversationId",
    messageController.recallMessage
  );
  return router;
};

module.exports = MessageRouter;
