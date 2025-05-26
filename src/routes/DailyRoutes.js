// routes/daily.js
const express = require("express");
const router = express.Router();
const { getOrCreateRoom } = require("../services/DailyService");

router.post("/create-room", async (req, res) => {
  try {
    const { conversationId } = req.body;
    const room = await getOrCreateRoom(conversationId);
    res.json({ url: room.url });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
