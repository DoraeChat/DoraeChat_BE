const mongoose = require("mongoose");
const Schema = mongoose.Schema;
const ObjectId = mongoose.Types.ObjectId;
const NotFoundError = require("../exceptions/NotFoundError");
const User = require("./User");
const CustomError = require("../exceptions/CustomError");

const memberSchema = new Schema(
  {
    conversationId: ObjectId,
    userId: {
      type: ObjectId,
      ref: "User",
    },
    lastView: {
      type: Date,
      default: () => new Date(),
    },
    name: String,
    active: {
      type: Boolean,
    },
    lastViewOfChannels: [
      {
        channelId: ObjectId,
        lastView: Date,
      },
    ],
    hideBeforeTime: {
      type: Date,
      default: null,
    },
    leftAt: { type: Date, default: null },
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
  const user = await User.findById(userId).lean();

  member.avatar = user.avatar;
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
// Lấy danh sách thành viên trong cuộc hội thoại kèm thông tin user
memberSchema.statics.getMembersWithUserInfo = async (conversationId) => {
  if (!ObjectId.isValid(conversationId)) {
    throw new NotFoundError("Invalid conversationId");
  }

  const members = await Member.find({
    conversationId,
    active: { $ne: false },
  })
    .populate("userId", "name avatar avatarColor")
    .lean();

  return members;
};

memberSchema.statics.isMember = async (conversationId, userId) => {
  if (!ObjectId.isValid(conversationId) || !ObjectId.isValid(userId)) {
    throw new NotFoundError("Invalid conversationId or userId");
  }

  const member = await Member.findOne({
    conversationId,
    userId,
  }).lean();
  if (!member?.active) return false;

  return !!member;
};

memberSchema.statics.getByConversationId = async (conversationId) => {
  if (!ObjectId.isValid(conversationId)) {
    throw new NotFoundError("Invalid conversationId");
  }

  const members = await Member.find({
    conversationId,
    active: { $ne: false },
  }).lean();

  const membersWithAvatars = await Promise.all(
    members.map(async (member) => {
      const user = await User.findById(member.userId).lean();
      return {
        ...member,
        avatar: user?.avatar,
      };
    })
  );

  return membersWithAvatars;
};

memberSchema.statics.getByConversationIdAndUserId = async (
  conversationId,
  userId
) => {
  if (!ObjectId.isValid(conversationId) || !ObjectId.isValid(userId)) {
    console.log("Invalid conversationId or userId", conversationId, userId);
    throw new CustomError("Invalid conversationId or userId", 400);
  }

  const member = await Member.findOne({
    conversationId,
    userId,
  }).lean();
  if (!member) throw new NotFoundError("Member");

  const user = await User.findById(userId).lean();
  member.avatar = user.avatar;

  return member;
};

const Member = mongoose.model("Member", memberSchema);

module.exports = Member;
