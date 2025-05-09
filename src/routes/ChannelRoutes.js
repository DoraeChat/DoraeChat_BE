const express = require("express");
const router = express.Router();
const ChannelController = require("../controllers/ChannelController");

const MessageRouter = (socketHandler) => {
  const channelController = new ChannelController(socketHandler);
  router.get(
    "/:conversationId",
    channelController.getAllChannelByConversationId
  );
  router.post("/", channelController.addChannel);
  router.put("/:channelId", channelController.updateChannel);
  router.delete("/:channelId", channelController.deleteChannel);

  return router;
};

module.exports = MessageRouter;
