const express = require("express");
const router = express.Router();
const MessageController = require("../controllers/MessageController");
const auth = require("../middleware/auth");

router.post("/messages", MessageController.sendMessage);
router.get("/messages/:conversationId", MessageController.getMessages);

module.exports = router;
