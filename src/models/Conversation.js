const mongoose = require("mongoose");
const Schema = mongoose.Schema;
const Member = require("./Member");
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
    lastMessageId: {
      type: ObjectId,
      ref: "message",
    },
    pinMessageIds: {
      type: [ObjectId],
      default: [],
    },
    members: { type: [ObjectId], ref: "Member" },
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
  // Tìm tất cả Member của userId
  const members = await Member.find({ userId }).lean();
  const memberIds = members.map((m) => m._id);

  // Lấy tất cả conversation liên quan đến user, không lọc type
  const conversations = await Conversation.find({
    members: { $in: memberIds },
  })
    .sort({ updatedAt: -1 })
    .populate({
      path: "lastMessageId",
      select: "content createdAt",
    })
    .lean();

  // Nếu không có conversation thì trả luôn
  if (!conversations.length) return [];

  // Lấy toàn bộ memberIds xuất hiện trong các conversation
  const allMemberIds = [
    ...new Set(
      conversations.flatMap((c) => c.members.map((id) => id.toString()))
    ),
  ];

  // Truy vấn Member + User 1 lần, giảm số query
  const membersData = await Member.find({ _id: { $in: allMemberIds } })
    .select("name userId")
    .populate({ path: "userId", select: "avatar" })
    .lean();

  // Map về dạng object để dễ lookup
  const memberMap = {};
  membersData.forEach((m) => {
    memberMap[m._id.toString()] = {
      name: m.name,
      userId: m.userId,
      avatar: m.userId?.ava || null,
    };
  });

  // Map lại conversation: nếu type === false thì bổ sung name + avatar cho members
  const result = conversations.map((conversation) => {
    if (conversation.type === false) {
      conversation.members = conversation.members.map((memberId) => {
        const info = memberMap[memberId.toString()] || {};
        return {
          _id: memberId,
          userId: info.userId._id,
          name: info.name || null,
          avatar: info.avatar || null,
        };
      });
    }
    return conversation;
  });

  return result;
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
  const member1 = await Member.findOne({ userId: userId1 }).lean();
  const member2 = await Member.findOne({ userId: userId2 }).lean();
  if (!member1 || !member2) return null;

  const conversation = await Conversation.findOne({
    members: { $all: [member1._id, member2._id] },
    type: false,
  }).lean();
  return conversation ? conversation._id : null;
};

conversationSchema.statics.getByIdAndUserId = async (
  _id,
  userId,
  message = "Conversation"
) => {
  // Tìm memberId từ userId
  const member = await Member.findOne({ conversationId: _id, userId }).lean();
  if (!member) throw new NotFoundError(message);

  const conversation = await Conversation.findOne({
    _id,
    members: { $in: [member._id] }, // Kiểm tra memberId
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
