const DailyService = require("../services/DailyService");

exports.createDailyRoom = async (req, res) => {
  try {
    const { conversationId } = req.body;
    const data = await DailyService.createRoom(conversationId);
    res.json(data);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
};
