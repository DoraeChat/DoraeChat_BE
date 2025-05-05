const express = require("express");
const router = express.Router();
const MemberController = require("../controllers/MemberController");

const MemberRouter = (socketHandler) => {
  const memberController = new MemberController(socketHandler);

  router.get("/is-member", memberController.isMember);
  router.get("/member/:memberId", memberController.getByMemberId);
  router.get("/:conversationId", memberController.getByConversationId);
  router.get(
    "/:conversationId/:userId",
    memberController.getByConversationIdAndUserId
  );
  router.patch("/:conversationId/:memberId", memberController.updateMemberName);

  return router;
};

module.exports = MemberRouter;
