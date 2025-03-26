const PinMessage = require("../models/PinMessage");

const PinMessageService = {
    async getAllByConversationId(conversationId) {
        return await PinMessage.getAllByConversationId(conversationId);
    },

    async addPinMessage(pinMessage) {
        return await PinMessage.addPinMessage(pinMessage);
    },

    async deletePinMessage(messageId, pinnedBy) {
        return await PinMessage.deletePinMessage(messageId, pinnedBy);
    }
}

module.exports = PinMessageService;