const express = require("express");
const router = express.Router();
const ConversationController = require("../controllers/ConversationController");

// Routes cho hội thoại
const ConVersationRouter = (socketHandler) => {
  const conversationController = new ConversationController(socketHandler);
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
  router.get("/:id/members", conversationController.getMembersByConversationId);
  router.post("/:id/members", conversationController.addMembersToConversation);
  router.delete(
    "/:id/members/:memberId",
    conversationController.removeMemberFromConversation
  );
  router.post(
    "/:id/managers",
    conversationController.addManagersToConversation
  );
  return router;
};

module.exports = ConVersationRouter;
