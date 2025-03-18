const express = require("express");
const router = express.Router();
const ConversationController = require("../controllers/ConversationController");

// Routes cho hội thoại
router.get("/conversations", ConversationController.getListByUserId);
router.post("/conversations", ConversationController.createConversation);
router.get("/conversations/:id", ConversationController.getConversationById);

module.exports = router;
