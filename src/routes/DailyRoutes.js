const express = require("express");
const router = express.Router();
const { createDailyRoom, leaveDailyRoom } = require("../controllers/DailyController");

// Tạo room
router.post("/create-room", createDailyRoom);

// Rời room
router.post("/leave-room", leaveDailyRoom);

module.exports = router;
