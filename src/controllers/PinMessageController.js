const PinMessageService = require("../services/PinMessageService")

class PinMessageController {
    constructor(socketHandler) {
        this.socketHandler = socketHandler;
        this.addPinMessage = this.addPinMessage.bind(this);
        this.deletePinMessage = this.deletePinMessage.bind(this);
    }

    // [GET] /api/pin-messages/:conversationId
    async getAllByConversationId(req, res, next) {
        try {
            const { conversationId } = req.params;
            const pinMessages = await PinMessageService.getAllByConversationId(conversationId);
            res.json(pinMessages);
        } catch (error) {
            next(error);
        }
    }

    // [POST] /api/pin-messages
    async addPinMessage(req, res, next) {
        try {
            const pinMessage = req.body;
            const newPinMessage = await PinMessageService.addPinMessage(pinMessage);
            res.status(201).json(newPinMessage);
        } catch (error) {
            next(error);
        }
    }

    // [DELETE] /api/pin-messages/:messageId
    async deletePinMessage(req, res, next) {
        try {
            const { messageId } = req.params;
            const { pinnedBy } = req.body;
            const pinMessage = await PinMessageService.deletePinMessage(messageId, pinnedBy);
            res.json(pinMessage);
        } catch (error) {
            next(error);
        }
    }

};

module.exports = PinMessageController;