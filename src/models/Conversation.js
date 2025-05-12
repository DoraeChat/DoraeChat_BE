const mongoose = require("mongoose");
const Schema = mongoose.Schema;
const Member = require("./Member");
const ObjectId = mongoose.Types.ObjectId;
const NotFoundError = require("../exceptions/NotFoundError");

const conversationSchema = new Schema(
  {
    name: {
      type: String,
      // required: true,
      trim: true,
    },
    avatar: {
      type: String,
      default: function () {
        const firstChar = this.name ? this.name.charAt(0).toUpperCase() : 'A';
        const width = 150;
        const height = 150;
        const format = 'png';

        const lightColors = [
          'F0F8FF', 'FAEBD7', 'F5F5DC', 'FFFACD', 'FAF0E6',
          'FFE4C4', 'FFDAB9', 'EEE8AA', 'F0FFF0', 'F5FFFA',
          'F0FFFF', 'F8F8FF', 'F5F5F5', 'FFFFE0', 'FFFFF0',
          'FFFAFA', '7FFFD4', 'ADD8E6', 'B0E0E6', 'AFEEEE',
          'E0FFFF', '87CEFA', 'B0C4DE', 'D3D3D3', '98FB98',
          'F5F5DC', 'FAF0E6', 'FFF8DC', 'FFEBCD', 'FFF5EE',
        ];
        const darkColors = [
          '8B0000', 'A0522D', '800000', '8B4513', '4682B4',
          '00008B', '191970', '008080', '006400', '556B2F',
          '808000', '8B8682', '2F4F4F', '000000', '228B22',
          '3CB371', '2E8B57', '483D8B', '6A5ACD', '7B68EE',
          '4169E1', '6495ED', '00CED1', '40E0D0', '008B8B',
        ];

        const allColors = [...lightColors, ...darkColors];
        const randomIndex = Math.floor(Math.random() * allColors.length);
        const backgroundColor = allColors[randomIndex];

        const getRelativeLuminance = (hexColor) => {
          const r = parseInt(hexColor.slice(0, 2), 16) / 255;
          const g = parseInt(hexColor.slice(2, 4), 16) / 255;
          const b = parseInt(hexColor.slice(4, 6), 16) / 255;
          return 0.2126 * r + 0.7152 * g + 0.0722 * b;
        };

        const luminance = getRelativeLuminance(backgroundColor);
        const textColor = luminance > 0.5 ? '000000' : 'ffffff';

        return `https://placehold.jp/70/${backgroundColor}/${textColor}/${width}x${height}.${format}?text=${firstChar}&css=%7B%22font-weight%22%3A%22%20bold%22%7D`;
      }
    },
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
    // roomUrl: {
    //   type: String,
    //   default: null,
    // },

  },
  { timestamps: true }
);

conversationSchema.index({ name: "text" });

conversationSchema.statics.getListByUserId = async (userId) => {
  // Tìm tất cả Member của userId
  const members = await Member.find({ userId }).lean();
  const memberIds = members.map((m) => m._id);
  const memberIdMap = {};
  members.forEach((m) => {
    memberIdMap[m.conversationId.toString()] = m._id;
  });

  // Lấy tất cả conversation liên quan đến user, không lọc type
  const conversations = await Conversation.find({
    members: { $in: memberIds },
  })
    .sort({ updatedAt: -1 })
    .populate({
      path: "lastMessageId",
      match: (conversation) => ({
        deletedMemberIds: { $nin: [memberIdMap[conversation._id.toString()]] },
        isDeleted: { $ne: true },
      }),
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
      avatar: m.userId?.avatar || null,
    };
  });

  // Map lại conversation: nếu type === false thì bổ sung name + avatar cho members
  const result = conversations.map((conversation) => {
    const userMember = members.find(
      (m) => m.conversationId.toString() === conversation._id.toString()
    );

    // Nếu user thuộc conversation này nhưng bị inactive
    if (userMember && userMember.active === false) {
      if (conversation.lastMessageId) {
        conversation.lastMessageId.content = "You are no longer in this group";
      } else {
        // Nếu không có lastMessageId thì tạo tạm
        conversation.lastMessageId = {
          content: "You are no longer in this group",
        };
      }
    } else if (conversation.type === false) {
      // Nếu vẫn active và là nhóm thường => map member
      conversation.members = conversation.members.map((memberId) => {
        const info = memberMap[memberId.toString()] || {};
        return {
          _id: memberId,
          userId: info.userId?._id,
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
  // Lấy danh sách các conversation cá nhân có chứa cả 2 user dưới dạng Member
  const user1MemberIds = await Member.find({ userId: userId1 })
    .select("conversationId")
    .lean();
  const user2MemberIds = await Member.find({ userId: userId2 })
    .select("conversationId")
    .lean();

  const convIds1 = user1MemberIds.map((m) => m.conversationId.toString());
  const convIds2 = user2MemberIds.map((m) => m.conversationId.toString());

  // Tìm những conversationId mà cả hai user đều có mặt
  const commonConversationIds = convIds1.filter((id) => convIds2.includes(id));

  if (commonConversationIds.length === 0) return null;

  // Kiểm tra xem conversation đó có phải là chat cá nhân không
  const existingConversation = await Conversation.findOne({
    _id: { $in: commonConversationIds },
    type: false,
  }).lean();

  return existingConversation ? existingConversation._id : null;
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
  // Tìm conversation theo id
  const conversation = await Conversation.findById(_id)
    .populate({
      path: "lastMessageId",
      select: "content createdAt",
    })
    .lean();

  if (!conversation) throw new NotFoundError(message);

  // Chỉ format lại members nếu có members và type === false
  if (conversation.members?.length && conversation.type === false) {
    // Lấy tất cả member IDs trong conversation
    const memberIds = conversation.members;

    // Truy vấn Member và populate User để lấy thông tin chi tiết
    const membersData = await Member.find({ _id: { $in: memberIds } })
      .select("name userId")
      .populate({ path: "userId", select: "avatar" })
      .lean();

    // Map lại thành viên với thông tin chi tiết
    conversation.members = membersData.map((member) => ({
      _id: member._id,
      userId: member.userId?._id,
      name: member.name || null,
      avatar: member.userId?.avatar || null,
    }));
  }

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
