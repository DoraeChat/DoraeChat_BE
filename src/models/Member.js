const mongoose = require("mongoose");
const Schema = mongoose.Schema;
const ObjectId = mongoose.Types.ObjectId;
const NotFoundError = require("../exceptions/NotFoundError");

const memberSchema = new Schema(
  {
    conversationId: ObjectId,
    userId: ObjectId,
    lastView: {
      type: Date,
      default: () => new Date(),
    },
    name: String,
    lastViewOfChannels: [
      {
        channelId: ObjectId,
        lastView: Date,
      },
    ],
    isNotify: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true }
);

memberSchema.index({ conversationId: 1, userId: 1 }, { unique: true });
memberSchema.index({ conversationId: 1 });

memberSchema.statics.getByConversationIdAndUserId = async (
  conversationId,
  userId,
  message = "Conversation"
) => {
  if (!ObjectId.isValid(conversationId) || !ObjectId.isValid(userId))
    throw new NotFoundError("Invalid conversationId or userId");
  const member = await Member.findOne({
    conversationId,
    userId,
  }).lean();
  if (!member) throw new NotFoundError(message);
  return member;
};

memberSchema.statics.existsByConversationIdAndUserId = async (
  conversationId,
  userId
) => {
  if (!ObjectId.isValid(conversationId) || !ObjectId.isValid(userId))
    throw new NotFoundError("Invalid conversationId or userId");
  const member = await Member.findOne({
    conversationId,
    userId,
  }).lean();
  return !!member;
};

memberSchema.statics.getListInfosByConversationId = async (conversationId) => {
  if (!ObjectId.isValid(conversationId))
    throw new NotFoundError("Invalid conversationId");
  const users = await Member.aggregate([
    { $match: { conversationId: new ObjectId(conversationId) } },
    {
      $lookup: {
        from: "users",
        localField: "userId",
        foreignField: "_id",
        as: "user",
      },
    },
    { $unwind: "$user" },
    {
      $project: {
        _id: 0,
        user: {
          _id: 1,
          name: 1,
          username: 1,
          avatar: 1,
          avatarColor: 1,
        },
      },
    },
    { $replaceWith: "$user" },
  ]).exec();
  return users;
};

const Member = mongoose.model("Member", memberSchema);

module.exports = Member;
