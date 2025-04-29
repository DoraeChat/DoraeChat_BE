const meteredService = require("../services/meteredService");

async function createMeetingRoom(req, res) {
    try {
        const { roomName } = req.query;
        const meetingRoom = await meteredService.createMeetingRoom(roomName);
        res.send({
            success: true,
            ...meetingRoom,
        });
    } catch (error) {
        console.error("Error creating meeting room:", error);
        res.status(500).send({ success: false, error: error.message });
    }
}

async function validateMeetingRoom(req, res) {
    try {
        const { meetingId } = req.query;
        const result = await meteredService.validateMeetingRoom(meetingId);

        res.send({
            success: true,
            exists: result.exists,
            room: result.room || null,
        });
    } catch (error) {
        console.error("Error validating meeting room:", error);
        res.status(500).send({
            success: false,
            message: "Internal Server Error",
        });
    }
}

function getMeteredDomain(req, res) {
    const domain = meteredService.getMeteredDomain();
    res.send({
        domain,
    });
}

async function endMeeting(req, res) {
    try {
        const { conversationId } = req.params;

        // Lấy conversation
        const conversation = await Conversation.findById(conversationId);
        if (!conversation) {
            return res.status(404).send({ success: false, message: "Conversation not found" });
        }

        // Nếu có roomUrl => xóa bên Metered
        if (conversation.roomUrl) {
            const urlParts = conversation.roomUrl.split("/");
            const meetingId = urlParts[urlParts.length - 1]; // lấy roomName từ URL

            await meteredService.deleteMeetingRoom(meetingId);
        }

        // Xóa field roomUrl
        conversation.roomUrl = undefined;
        await conversation.save();

        res.send({ success: true });
    } catch (error) {
        console.error("Error ending meeting:", error);
        res.status(500).send({ success: false, error: error.message });
    }
}


module.exports = {
    createMeetingRoom,
    validateMeetingRoom,
    getMeteredDomain,
    endMeeting,
};
