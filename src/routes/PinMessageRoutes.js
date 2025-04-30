const express = require("express");
const router = express.Router();
const PinMessageController = require("../controllers/PinMessageController");

const PinMessageRouter = (socketHandler) => {
  const pinMessageController = new PinMessageController(socketHandler);

  router.get("/:conversationId", pinMessageController.getAllByConversationId);
  router.post("/", pinMessageController.addPinMessage);
  router.delete("/:messageId", pinMessageController.deletePinMessage);

  return router;
};

module.exports = PinMessageRouter;
