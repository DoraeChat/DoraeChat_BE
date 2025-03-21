const express = require("express");
const router = express.Router();
const ConversationController = require("../controllers/ConversationController");

// Routes cho hội thoại
router.get("/", ConversationController.getListByUserId);
router.post(
  "/individuals/:userId",
  ConversationController.createOrGetIndividualConversation
);
router.post("/groups", ConversationController.createGroupConversation);
router.patch("/:id/name", ConversationController.updateGroupName);
router.get("/conversations/:id", ConversationController.getConversationById);

module.exports = router;
