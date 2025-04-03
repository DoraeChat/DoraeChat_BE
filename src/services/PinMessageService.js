const PinMessage = require("../models/PinMessage");
const Message = require("../models/Message");
const Conversation = require("../models/Conversation");
const Member = require("../models/Member");

const PinMessageService = {
    async getAllByConversationId(conversationId) {
        return await PinMessage.getAllByConversationId(conversationId);
    },

    async addPinMessage(pinMessage) {
        const { messageId, conversationId, pinnedBy } = pinMessage;
        if (!messageId) throw new Error("messageId is required");
        if (!conversationId) throw new Error("conversationId is required");
        if (!pinnedBy) throw new Error("pinnedBy is required");

        const message = await Message.findById(messageId).lean();
        if (!message) throw new Error("Message not found");

        const conversation = await Conversation.findById(conversationId).lean();
        if (!conversation) throw new Error("Conversation not found");

        const member = await Member.findOne({ conversationId, userId: pinnedBy }).lean();
        if (conversation.type && (!conversation.members.includes(member._id))) throw new Error("Member is not in conversation");
        
        // check message is in conversation
        const isMessageInConversation = await Message.findOne({ _id: messageId, conversationId }).lean();
        if (!isMessageInConversation) throw new Error("Message not in conversation");

        // message pinned 
        const existingPinMessage = await PinMessage.findOne({ messageId, conversationId }).lean();
        if (existingPinMessage) throw new Error("Message already pinned in this conversation");

        return await PinMessage.addPinMessage(pinMessage);
    },

    async deletePinMessage(messageId, pinnedBy) {
        if (!messageId) throw new Error("messageId is required");
        if (!pinnedBy) throw new Error("pinnedBy is required");

        const pinMessage = await PinMessage.findOne({ messageId }).lean();
        if (!pinMessage) throw new Error("Pin message not found");

        const member = await Member.findOne({ conversationId: pinMessage.conversationId, userId: pinnedBy }).lean();
        const conversation = await Conversation.findById(pinMessage.conversationId).lean();
        if (conversation.type && (!conversation.members.includes(member._id))) throw new Error("Member is not in conversation");

        return await PinMessage.deletePinMessage(messageId, pinnedBy);
    }
}

module.exports = PinMessageService;