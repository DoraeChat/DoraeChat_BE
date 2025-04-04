const mongoose = require("mongoose");
const Schema = mongoose.Schema;
const ObjectId = mongoose.Types.ObjectId;
const NotFoundError = require("../exceptions/NotFoundError");

const pinMessageSchema = new Schema({
  messageId: { type: ObjectId, required: true, ref: "Message" },
  conversationId: { type: Schema.Types.ObjectId, index: true },
  pinnedBy: { type: ObjectId, required: true },
  pinnedAt: { type: Date, default: Date.now },
});

pinMessageSchema.index({ conversationId: 1, pinnedAt: -1 });

pinMessageSchema.statics.getAllByConversationId = async (conversationId) => {
  return await PinMessage.find({ conversationId });
};

pinMessageSchema.statics.addPinMessage = async (pinMessage) => {
  return await PinMessage.create(pinMessage);
};

pinMessageSchema.statics.deletePinMessage = async (messageId, pinnedBy) => {
  const pinMessageDelete = await PinMessage.findOneAndDelete({
    messageId,
    pinnedBy,
  });
  if (!pinMessageDelete) throw new NotFoundError("Pin message");
  return pinMessageDelete;
};

const PinMessage = mongoose.model("PinMessage", pinMessageSchema);

module.exports = PinMessage;
