const PinMessage = require("../models/PinMessage");
const Message = require("../models/Message");
const Conversation = require("../models/Conversation");
const Member = require("../models/Member");
const CustomError = require("../exceptions/CustomError");
const NotFoundError = require("../exceptions/NotFoundError");
const User = require("../models/User");

const PinMessageService = {
  async getAllByConversationId(conversationId) {
    const pinMessages = await PinMessage.getAllByConversationId(conversationId);

    const mapped = await Promise.all(
      pinMessages.map(async (pinMessage) => {
        const message = await Message.findById(pinMessage.messageId).lean();
        if (!message) throw new NotFoundError("Message");

        const memberSend = await Member.findById({
          _id: message.memberId,
        }).lean();
        if (!memberSend) throw new NotFoundError("Member");

        const member = await Member.findById(pinMessage.pinnedBy).lean();
        if (!member) throw new NotFoundError("Member");

        const user = await User.findById(memberSend.userId).lean();
        if (!user) throw new NotFoundError("User");

        return {
          _id: pinMessage._id,
          messageId: pinMessage.messageId,
          conversationId: pinMessage.conversationId,
          pinnedAt: pinMessage.pinnedAt,
          content: message.content,
          type: message.type,
          pinnedBy: {
            name: user.name,
            avatar: user.avatar,
            _id: member._id,
          },
        };
      })
    );

    return mapped;
  },

  async addPinMessage(pinMessage) {
    const { messageId, conversationId, pinnedBy } = pinMessage;
    if (!messageId) throw new CustomError("messageId is required", 400);
    if (!conversationId)
      throw new CustomError("conversationId is required", 400);
    if (!pinnedBy) throw new CustomError("pinnedBy is required", 400);

    const message = await Message.findById(messageId).lean();
    if (!message) throw new NotFoundError("Message");

    const conversation = await Conversation.findById(conversationId).lean();
    if (!conversation) throw new NotFoundError("Conversation");

    const member = await Member.findOne({ _id: pinnedBy }).lean();
    const memberSend = await Member.findById({ _id: message.memberId }).lean();
    const members = conversation.members.map((member) => member._id.toString());
    if (!members.includes(member._id.toString()))
      throw new CustomError("Member is not in conversation", 400);

    // check message is in conversation
    const isMessageInConversation = await Message.findOne({
      _id: messageId,
      conversationId,
    }).lean();
    if (!isMessageInConversation)
      throw new CustomError("Message not in conversation", 400);

    // message pinned
    const existingPinMessage = await PinMessage.findOne({
      messageId,
      conversationId,
    }).lean();
    if (existingPinMessage)
      throw new CustomError("Message already pinned in this conversation", 400);

    const user = await User.findById(memberSend.userId).lean();
    const newPinMessage = await PinMessage.addPinMessage(pinMessage);
    return {
      _id: newPinMessage._id,
      messageId: newPinMessage.messageId,
      conversationId: newPinMessage.conversationId,
      pinnedAt: newPinMessage.pinnedAt,
      content: message.content,
      type: message.type,
      pinnedBy: {
        name: user.name,
        avatar: user.avatar,
        _id: member._id,
      },
    };
  },

  async deletePinMessage(messageId, pinnedBy) {
    if (!messageId) throw new CustomError("messageId is required", 400);
    if (!pinnedBy) throw new CustomError("pinnedBy is required", 400);

    const pinMessage = await PinMessage.findOne({ messageId }).lean();
    if (!pinMessage) throw new NotFoundError("Pin message");

    const member = await Member.findOne({ _id: pinnedBy }).lean();
    if (!member) throw new NotFoundError("Member");

    const conversation = await Conversation.findById(
      pinMessage.conversationId
    ).lean();

    const message = await Message.findById(messageId).lean();
    if (!message) throw new NotFoundError("Message");

    const user = await User.findById(member.userId).lean();

    if (conversation.type) {
      if (
        !conversation.managerIds.includes(pinnedBy) && // manager
        !conversation.leaderId.toString() === pinnedBy && // leader
        pinMessage.pinnedBy !== pinnedBy // member pinned
      )
        throw new CustomError("Member is not allowed to unpin message", 400);
    }

    const deleted = await PinMessage.deletePinMessage(messageId, pinnedBy);

    return {
      _id: deleted._id,
      messageId: deleted.messageId,
      conversationId: deleted.conversationId,
      pinnedAt: deleted.pinnedAt,
      content: message.content,
      type: message.type,
      pinnedBy: {
        name: user.name,
        avatar: user.avatar,
        _id: member._id,
      },
    };
  },
};

module.exports = PinMessageService;
