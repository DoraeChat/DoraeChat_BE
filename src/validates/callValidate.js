// callValidate.js
const mongoose = require("mongoose");
const Member = require("../models/Member");
const Conversation = require("../models/Conversation");
const Channel = require("../models/Channel");


async function validateCallPermission(conversationId, userId, channelId = null) {
    try {
        const member = await Member.getByConversationIdAndUserId(
            conversationId,
            userId
        );
        if (!member) {
            console.warn(`[CALL][NO_MEMBER] User ${userId} is not a member of conversation ${conversationId}`);
            return false;
        }

        if (!member.active) {
            console.warn(`[CALL][MEMBER_INACTIVE] User ${userId} is inactive in conversation ${conversationId}`);
            return false;
        }

        const conversation = await Conversation.findById(conversationId);
        if (!conversation) {
            console.warn(`[CALL][CONVERSATION_NOT_FOUND] Conversation ${conversationId} not found`);
            return false;
        }


        if (conversation.type && !channelId) {
            console.warn(`[CALL][CHANNEL_ID_REQUIRED] Channel ID is required for group conversations`);
            return false;

        }
        if (!conversation.type && channelId) {
            console.warn(`[CALL][CHANNEL_ID_NOT_REQUIRED] Channel ID is not required for one-on-one conversations`);
            return false;
        }

        // Nếu là group, kiểm tra channel
        let validChannelId = null;
        if (conversation.type) {
            const channel = await Channel.findById(channelId);
            if (
                !channel ||
                channel.conversationId.toString() !== conversationId.toString()
            ) {
                console.warn(`[CALL][CHANNEL_NOT_FOUND] Channel ${channelId} not found or does not belong to conversation ${conversationId}`);
                return false;
            }
            validChannelId = channel._id;
        }

        return true;
    } catch (error) {
        console.error("[CALL][ERROR] Failed to validate call permission:", error);
        return false;
    }
}

module.exports = {
    validateCallPermission,
};
