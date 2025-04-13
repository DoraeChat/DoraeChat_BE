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
  router.delete("/:id/managers", conversationController.removeManager);
  router.patch(
    "/:id/acceptGroupRequest/:isStatus",
    conversationController.toggleJoinApproval.bind(conversationController)
  );
  router.post(
    "/:id/groupRequest/accept/:userId",
    conversationController.acceptJoinRequest.bind(conversationController)
  );
  router.delete(
    "/:id/groupRequest/reject/:userId",
    conversationController.rejectJoinRequest.bind(conversationController)
  );
  router.post(
    "/:id/groupRequest/accept",
    conversationController.acceptAllJoinRequests.bind(conversationController)
  );
  router.delete(
    "/:id/groupRequest/reject",
    conversationController.rejectAllJoinRequests.bind(conversationController)
  );
  router.get(
    "/:id/groupRequest",
    conversationController.getJoinRequests.bind(conversationController)
  );
  router.post(
    "/:id/invite",
    conversationController.inviteUserToGroup.bind(conversationController)
  );
  router.post(
    "/:id/invite/link",
    conversationController.createInviteLink.bind(conversationController)
  );
  router.post(
    "/join/:token",
    conversationController.acceptInvite.bind(conversationController)
  );
  return router;
};

module.exports = ConVersationRouter;
