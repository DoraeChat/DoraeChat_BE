const express = require("express");
const router = express.Router();
const ConversationController = require("../controllers/ConversationController");

// Routes cho hội thoại
const ConVersationRouter = (io) => {
  const conversationController = new ConversationController(io);
  router.get("/", conversationController.getListByUserId);
  router.post(
    "/individuals/:userId",
    conversationController.createOrGetIndividualConversation
  );
  router.post("/groups", conversationController.createGroupConversation);
  router.patch("/:id/name", conversationController.updateGroupName);
  router.get("/conversations/:id", conversationController.getConversationById);
  router.patch("/:id/avatar", conversationController.updateAvatar);
  router.delete("/:id", conversationController.hideConversationBeforeTime);
  return router;
};

module.exports = ConVersationRouter;
