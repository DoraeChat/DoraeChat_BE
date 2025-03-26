const PinMessageService = require("../services/PinMessageService")

const PinMessageController = {
    async getAllByConversationId(req, res, next) {
        try {
            const { conversationId } = req.params;
            const pinMessages = await PinMessageService.getAllByConversationId(conversationId);
            res.json(pinMessages);
        } catch (error) {
            next(error);
        }
    },

    async addPinMessage(req, res, next) {
        try {
            const pinMessage = req.body;
            const newPinMessage = await PinMessageService.addPinMessage(pinMessage);
            res.status(201).json(newPinMessage);
        } catch (error) {
            next(error);
        }
    },

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