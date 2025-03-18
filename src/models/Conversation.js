const mongoose = require("mongoose");
const Schema = mongoose.Schema;
const ObjectId = mongoose.Types.ObjectId;
const NotFoundError = require("../exceptions/NotFoundError");

const conversationSchema = new Schema(
  {
    name: String,
    avatar: String,
    leaderId: ObjectId,
    managerIds: {
      type: [ObjectId],
      default: [],
    },
    lastMessageId: ObjectId,
    pinMessageIds: {
      type: [ObjectId],
      default: [],
    },
    members: [ObjectId],
    joinRequests: {
      type: [ObjectId],
      default: [],
    },
    isJoinFromLink: {
      type: Boolean,
      default: true,
    },
    type: Boolean,
  },
  { timestamps: true }
);

conversationSchema.index({ name: "text" });

conversationSchema.statics.getListByUserId = async (userId) => {
  return Conversation.find({
    members: { $in: [userId] },
  })
    .sort({ updatedAt: -1 })
    .lean();
};

conversationSchema.statics.getListGroupByNameContainAndUserId = async (
  name,
  userId
) => {
  return Conversation.find({
    name: {
      $regex: name,
      $options: "i",
    },
    members: {
      $in: [userId],
    },
    type: true,
  })
    .sort({ updatedAt: -1 })
    .lean();
};

conversationSchema.statics.getListIndividualByNameContainAndUserId = async (
  name,
  userId
) => {
  return Conversation.aggregate([
    {
      $match: {
        members: {
          $in: [ObjectId(userId)],
        },
        type: false,
      },
    },
    {
      $lookup: {
        from: "members",
        localField: "_id",
        foreignField: "conversationId",
        as: "users",
      },
    },
    {
      $unwind: "$users",
    },
    {
      $match: {
        "users.userId": { $ne: ObjectId(userId) },
        "users.name": { $regex: name, $options: "i" },
      },
    },
    {
      $sort: { updatedAt: -1 },
    },
    {
      $project: { _id: 1 },
    },
  ]).exec();
};

conversationSchema.statics.getListNameAndAvatarOfMembersById = async (_id) => {
  return Conversation.aggregate([
    {
      $match: {
        _id: ObjectId(_id),
      },
    },
    {
      $project: {
        _id: 0,
        members: 1,
      },
    },
    {
      $unwind: "$members",
    },
    {
      $lookup: {
        from: "users",
        localField: "members",
        foreignField: "_id",
        as: "user",
      },
    },
    {
      $unwind: "$user",
    },
    {
      $project: {
        name: "$user.name",
        avatar: "$user.avatar",
        avatarColor: "$user.avatarColor",
      },
    },
  ]).exec();
};

conversationSchema.statics.existsIndividualConversation = async (
  userId1,
  userId2
) => {
  const conversation = await Conversation.findOne({
    type: false,
    members: {
      $all: [userId1, userId2],
    },
  }).lean();
  return conversation ? conversation._id : null;
};

conversationSchema.statics.getByIdAndUserId = async (
  _id,
  userId,
  message = "Conversation"
) => {
  const conversation = await Conversation.findOne({
    _id,
    members: {
      $in: [userId],
    },
  }).lean();
  if (!conversation) throw new NotFoundError(message);
  return conversation;
};

conversationSchema.statics.getById = async (_id, message = "Conversation") => {
  const conversation = await Conversation.findById(_id).lean();
  if (!conversation) throw new NotFoundError(message);
  return conversation;
};

conversationSchema.statics.existsByUserIds = async (
  _id,
  userIds,
  message = "Conversation"
) => {
  const conversation = await Conversation.findOne({
    _id,
    members: {
      $all: userIds,
    },
  }).lean();
  if (!conversation) throw new NotFoundError(message);
  return conversation;
};

conversationSchema.statics.acceptJoinRequest = async (
  conversationId,
  userId
) => {
  const conversation = await Conversation.findById(conversationId).lean();
  if (!conversation) throw new NotFoundError("Conversation");
  if (!conversation.joinRequests.includes(userId))
    throw new Error("User has not requested to join this group");
  conversation.members.push(userId);
  conversation.joinRequests = conversation.joinRequests.filter(
    (id) => id.toString() !== userId.toString()
  );
  await Conversation.findByIdAndUpdate(conversationId, conversation);
  return conversation;
};

conversationSchema.statics.rejectJoinRequest = async (
  conversationId,
  userId
) => {
  const conversation = await Conversation.findById(conversationId).lean();
  if (!conversation) throw new NotFoundError("Conversation");
  if (!conversation.joinRequests.includes(userId))
    throw new Error("User has not requested to join this group");
  conversation.joinRequests = conversation.joinRequests.filter(
    (id) => id.toString() !== userId.toString()
  );
  await Conversation.findByIdAndUpdate(conversationId, conversation);
  return conversation;
};

const Conversation = mongoose.model("conversation", conversationSchema);
module.exports = Conversation;
