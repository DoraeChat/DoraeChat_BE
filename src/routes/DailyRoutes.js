// routes/daily.js
const express = require("express");
const router = express.Router();
const { createDailyRoom } = require("../controllers/DailyController");

router.post("/create-room", createDailyRoom);


module.exports = router;
