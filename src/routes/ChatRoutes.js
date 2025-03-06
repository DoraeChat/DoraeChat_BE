const express = require("express");
const router = express.Router();
const ChatController = require("../controllers/ChatController");
const auth = require("../middleware/auth");

router.post("/send", auth, ChatController.sendMessage);
router.get("/:userId", auth, ChatController.getMessages);

module.exports = router;
