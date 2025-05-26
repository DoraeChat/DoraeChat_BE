const DailyService = require("../services/DailyService");
const {
  setCurrentCall,
  getCurrentCall,
  clearCurrentCall
} = require("../config/redis");

exports.createDailyRoom = async (req, res) => {
  try {
    const { conversationId } = req.body;
    const userId = req._id;
    console.log(userId);
    const existingRoomId = await getCurrentCall(userId);
    console.log("existingRoomId: ", existingRoomId);
    if (existingRoomId) {
      return res.status(409).json({
        error: "User is already in another call",
        roomId: existingRoomId,
      });
    }

    const data = await DailyService.getOrCreateRoom(conversationId);

    await setCurrentCall(userId, data.name);

    res.json(data);
  } catch (e) {
    console.error("createDailyRoom error:", e);
    res.status(500).json({ error: e.message });
  }
};

exports.leaveDailyRoom = async (req, res) => {
  try {
    const userId = req._id;
    await clearCurrentCall(userId);
    res.json({ message: "Left the call" });
  } catch (e) {
    console.error("leaveDailyRoom error:", e);
    res.status(500).json({ error: e.message });
  }
};
