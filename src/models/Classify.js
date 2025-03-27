const mongoose = require("mongoose");
const Schema = mongoose.Schema;
const ObjectId = mongoose.Types.ObjectId;
const NotFoundError = require("../exceptions/NotFoundError");

const classifySchema = new Schema(
  {
    name: {
      type: String,
    },
    conversationIds: {
      type: [ObjectId],
      default: [],
    },
    colorId: {
      type: ObjectId,
    },
    userId: {
      type: ObjectId,
    },
  },
  { timestamps: true }
);

classifySchema.index({ userId: 1 });
classifySchema.index({ conversationIds: 1 });

classifySchema.statics.getAllByUserId = async function (userId) {
  if (!userId) {
    throw new NotFoundError("User not found");
  }
  const classifies = await Classify.find({ userId: userId });
  if (!classifies) {
    throw new NotFoundError("Classify not found");
  }
  return classifies;
};

classifySchema.statics.addClassify = async function (classify) {
  const newClassify = await Classify.create(classify);
  return newClassify;
};

classifySchema.statics.updateClassify = async function (classify, classifyId) {
  const classifyCheck = await Classify.findOne({ _id: classifyId }).lean();
  if (!classifyCheck) {
    throw new NotFoundError("Classify not found");
  }
  const updatedClassify = await Classify.findOneAndUpdate(
    { _id: classifyId },
    { $set: classify },
    { new: true }
  );
  return updatedClassify;
};

classifySchema.statics.deleteClassify = async function (classifyId) {
  const classifyCheck = await Classify.findOne({ _id: classifyId }).lean();
  if (!classifyCheck) {
    throw new NotFoundError("Classify");
  }
  const classifyRemoved = await Classify.findOneAndDelete({ _id: classifyId });
  return classifyRemoved;
};

classifySchema.statics.addConversationToClassify = async function (
  classifyId,
  conversationId
) {
  console.log(classifyId, conversationId);
  const classifyCheck = await Classify.findOne({ _id: classifyId }).lean();
  if (!classifyCheck) {
    throw new NotFoundError("Classify");
  }
  const classify = await Classify.findOneAndUpdate(
    { _id: classifyId },
    { $push: { conversationIds: conversationId } },
    { new: true }
  );
  return classify;
};

classifySchema.statics.removeConversationFromClassify = async function (
  classifyId,
  conversationId
) {
  const classifyCheck = await Classify.findOne({ _id: classifyId }).lean();
  if (!classifyCheck) {
    throw new NotFoundError("Classify");
  }
  const classify = await Classify.findOneAndUpdate(
    { _id: classifyId },
    { $pull: { conversationIds: conversationId } },
    { new: true }
  );
  return classify;
};

const Classify = mongoose.model("Classify", classifySchema);

module.exports = Classify;
