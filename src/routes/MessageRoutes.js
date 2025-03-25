const express = require("express");
const router = express.Router();
const MessageController = require("../controllers/MessageController");

const MessageRouter = (io) => {
  const messageController = new MessageController(io);

  router.post("/text", messageController.sendTextMessage);

  return router;
};

module.exports = MessageRouter;
