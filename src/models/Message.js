const mongoose = require("mongoose");
const Schema = mongoose.Schema;
const ObjectId = mongoose.Types.ObjectId;
const NotFoundError = require("../exceptions/NotFoundError");
const Channel = require("./Channel");
const Member = require("./Member");
const { Types } = require("mongoose");

const commonLookupStages = {
  userLookup: {
    $lookup: {
      from: "users",
      localField: "userId",
      foreignField: "_id",
      as: "user",
    },
  },
  memberLookup: {
    $lookup: {
      from: "members",
      localField: "memberId",
      foreignField: "_id",
      as: "member",
    },
  },
  manipulatedUsersLookup: {
    $lookup: {
      from: "users",
      localField: "manipulatedUserIds",
      foreignField: "_id",
      as: "manipulatedUsers",
    },
  },
  userOptionsLookup: {
    $lookup: {
      from: "users",
      localField: "options.userIds",
      foreignField: "_id",
      as: "userOptions",
    },
  },
  replyMessageLookup: {
    $lookup: {
      from: "messages",
      localField: "replyMessageId",
      foreignField: "_id",
      as: "replyMessage",
    },
  },
  replyUserLookup: {
    $lookup: {
      from: "users",
      localField: "replyMessage.userId",
      foreignField: "_id",
      as: "replyUser",
    },
  },
  reactUsersLookup: {
    $lookup: {
      from: "users",
      localField: "reacts.userId",
      foreignField: "_id",
      as: "reactUsers",
    },
  },
  tagUsersLookup: {
    $lookup: {
      from: "users",
      localField: "tags",
      foreignField: "_id",
      as: "tagUsers",
    },
  },
};

const commonProjections = {
  groupMessage: {
    user: {
      _id: 1,
      name: 1,
      avatar: 1,
      avatarColor: 1,
    },
    manipulatedUsers: {
      _id: 1,
      name: 1,
      avatar: 1,
      avatarColor: 1,
    },
    userOptions: {
      _id: 1,
      name: 1,
      avatar: 1,
      avatarColor: 1,
    },
    options: 1,
    content: 1,
    type: 1,
    replyMessage: {
      _id: 1,
      content: 1,
      type: 1,
      isDeleted: 1,
      memberId: 1,
    },
    replyUser: {
      _id: 1,
      name: 1,
      avatar: 1,
      avatarColor: 1,
    },
    tagUsers: {
      _id: 1,
      name: 1,
    },
    reacts: 1,
    reactUsers: {
      _id: 1,
      name: 1,
      avatar: 1,
      avatarColor: 1,
    },
    isDeleted: 1,
    createdAt: 1,
    conversationId: 1,
    channelId: 1,
    replyMessageId: 1,
  },
  individualMessage: {
    userId: 1,
    members: {
      userId: 1,
      name: 1,
    },
    userInfos: {
      _id: 1,
      name: 1,
      avatar: 1,
      avatarColor: 1,
    },
    content: 1,
    type: 1,
    replyMessage: {
      _id: 1,
      content: 1,
      type: 1,
      isDeleted: 1,
      userId: 1,
    },
    reacts: {
      userId: 1,
      type: 1,
    },
    isDeleted: 1,
    createdAt: 1,
    replyMessageId: 1,
  },
};

const messageSchema = new Schema(
  {
    memberId: {
      type: ObjectId,
      required: true,
      index: true,
      ref: "Member",
    },
    content: {
      type: String,
      required: true,
    },
    action: {
      type: String,
      enum: [
        "ADD",
        "REMOVE",
        "UPDATE",
        "REMOVE_MANAGER",
        "ADD_MANAGER",
        "JOIN_GROUP",
        "LEAVE_GROUP",
        "INVITE",
        "ACCEPT_JOIN",
        "KICK",
        "FRIEND",
      ],
    }, // Loại hành động
    actionData: {
      targetId: { type: ObjectId }, // Người được thêm
    },
    tags: {
      type: [ObjectId],
      default: [],
    },
    replyMessageId: ObjectId,
    type: {
      type: String,
      enum: [
        "TEXT",
        "IMAGE",
        "STICKER",
        "VIDEO",
        "FILE", // docx, pdf, pptx, xlsx, zip, rar, txt, gif, mp3
        "NOTIFY", // Thông báo
        "VOTE",
      ],
      required: true,
      index: true,
    },
    fileName: {
      type: String,
      default: "",
    },
    fileSize: {
      type: Number,
      default: 0,
    }, // unit: byte
    reacts: {
      type: [
        {
          userId: ObjectId,
          type: {
            type: Number,
            enum: [0, 1, 2, 3, 4, 5, 6],
          },
        },
      ],
      default: [],
    },
    options: {
      type: [
        {
          name: { type: String, required: true },
          members: {
            type: [
              {
                memberId: ObjectId,
                name: String,
                avatar: String,
                avatarColor: String,
              },
            ],
            default: [],
          },
          memberCreated: {
            type: ObjectId,
            required: true,
          },
        },
      ],
      required: false,
    },
    lockedVote: {
      type: {
        lockedStatus: {
          type: Boolean, // true: locked
          default: false,
        },
        lockedBy: ObjectId,
        lockedAt: Date,
      },
    },
    isMultipleChoice: {
      type: Boolean,
      default: false,
    },
    isAnonymous: {
      type: Boolean,
      default: false,
    },
    deletedMemberIds: {
      type: [ObjectId],
      default: [],
    },
    isDeleted: {
      type: Boolean,
      default: false,
    },
    conversationId: {
      type: ObjectId,
      index: true,
    },
    channelId: {
      type: ObjectId,
      index: true,
    },
  },
  {
    timestamps: true,
    indexes: [
      { conversationId: 1, type: 1 },
      { channelId: 1, type: 1 },
      { conversationId: 1, createdAt: -1 },
      { channelId: 1, createdAt: -1 },
      { conversationId: 1, deletedMemberIds: 1 },
    ],
  }
);

const getPaginationStages = (skip, limit) => [
  { $sort: { createdAt: -1 } },
  { $skip: skip },
  { $limit: limit },
  { $sort: { createdAt: 1 } },
];

const getBaseGroupMessagePipeline = () => [
  commonLookupStages.memberLookup,
  { $unwind: "$member" },
  commonLookupStages.manipulatedUsersLookup,
  commonLookupStages.userOptionsLookup,
  commonLookupStages.replyMessageLookup,
  commonLookupStages.replyUserLookup,
  commonLookupStages.reactUsersLookup,
  commonLookupStages.tagUsersLookup,
  { $project: commonProjections.groupMessage },
];
// Hàm tĩnh để tạo tin nhắn
messageSchema.statics.createMessage = async function ({
  memberId,
  content,
  type = "TEXT",
  action,
  actionData,
  conversationId,
  channelId,
  replyMessageId,
}) {
  if (!memberId || !content || !conversationId) {
    throw new Error("memberId, content, and conversationId are required");
  }
  if (replyMessageId) {
    const replyMessage = await this.findById(replyMessageId);
    if (
      !replyMessage ||
      replyMessage.conversationId.toString() !== conversationId.toString()
    ) {
      throw new NotFoundError(
        "Reply message not found or does not belong to this conversation"
      );
    }
  }

  const message = new this({
    memberId,
    content,
    type,
    action,
    actionData,
    conversationId,
    channelId,
    replyMessageId,
  });

  await message.save();
  return message;
};
messageSchema.statics.getByIdOfGroup = async function (_id) {
  const pipeline = [
    {
      $match: {
        _id: ObjectId(_id),
      },
    },
    ...getBaseGroupMessagePipeline(),
  ];

  const messages = await Message.aggregate(pipeline);
  if (messages.length > 0) return messages[0];
  throw new NotFoundError("Message");
};

messageSchema.statics.getByIdOfIndividual = async function (_id) {
  const pipeline = [
    {
      $match: {
        _id: ObjectId(_id),
      },
    },
    commonLookupStages.replyMessageLookup,
    {
      $lookup: {
        from: "members",
        localField: "conversationId",
        foreignField: "conversationId",
        as: "members",
      },
    },
    {
      $lookup: {
        from: "users",
        localField: "members.userId",
        foreignField: "_id",
        as: "userInfos",
      },
    },
    {
      $project: commonProjections.individualMessage,
    },
  ];

  const messages = await Message.aggregate(pipeline);
  if (messages.length > 0) return messages[0];
  throw new NotFoundError("Message");
};

messageSchema.statics.countUnread = async function (time, conversationId) {
  return await Message.countDocuments({
    createdAt: { $gt: time },
    conversationId,
  }).lean();
};

messageSchema.statics.getById = async function (_id, message = "Message") {
  const messageResult = await Message.findById(_id).lean();
  if (!messageResult) throw new NotFoundError(message);
  return messageResult;
};

messageSchema.statics.getByIdAndConversationId = async function (
  _id,
  conversationId,
  message = "Message"
) {
  const messageResult = await Message.findOne({
    _id,
    conversationId,
  }).lean();

  if (!messageResult) throw new NotFoundError(message);
  return messageResult;
};

messageSchema.statics.getByIdAndChannelId = async function (
  _id,
  channelId,
  message = "Message"
) {
  const messageResult = await Message.findOne({
    _id,
    channelId,
  }).lean();

  if (!messageResult) throw new NotFoundError(message);
  return messageResult;
};

messageSchema.statics.countDocumentsByConversationIdAndUserId = async function (
  conversationId,
  userId
) {
  return await Message.countDocuments({
    conversationId,
    deletedMemberIds: {
      $nin: [userId],
    },
  }).lean();
};

// messageSchema.statics.getListByConversationIdAndUserIdOfGroup = async function (
//   conversationId,
//   userId,
//   skip,
//   limit
// ) {
//   const pipeline = [
//     {
//       $match: {
//         conversationId: ObjectId(conversationId),
//         deletedMemberIds: { $nin: [ObjectId(userId)] },
//       },
//     },
//     ...getBaseGroupMessagePipeline(),
//     ...getPaginationStages(skip, limit),
//   ];

//   return await Message.aggregate(pipeline);
// };

messageSchema.statics.getListByConversationIdAndTypeAndUserId = async function (
  conversationId,
  type,
  userId,
  skip,
  limit
) {
  const pipeline = [
    {
      $match: {
        conversationId: ObjectId(conversationId),
        type,
        deletedMemberIds: { $nin: [ObjectId(userId)] },
      },
    },
    ...getBaseGroupMessagePipeline(),
    ...getPaginationStages(skip, limit),
  ];

  return await Message.aggregate(pipeline);
};

messageSchema.statics.getListByChannelIdAndUserId = async function (
  channelId,
  userId,
  skip,
  limit,
  beforeTimestamp = null,
  hideBeforeTime = null
) {
  // Tìm conversationId từ channelId
  const channel = await Channel.findById(channelId).lean();
  if (!channel) {
    throw new Error("Channel not found");
  }

  const conversationId = channel.conversationId;

  // Tìm member từ userId và conversationId
  const member = await Member.getByConversationIdAndUserId(
    conversationId,
    userId
  );

  if (!member) {
    throw new Error("User is not a member of this conversation");
  }

  // Thiết lập điều kiện lọc
  const matchStage = {
    channelId: new ObjectId(channelId),
    deletedMemberIds: { $nin: [member._id] },
  };

  // Thêm điều kiện hideBeforeTime (nếu có)
  if (hideBeforeTime || member.hideBeforeTime) {
    matchStage.createdAt = {
      $gt: hideBeforeTime || member.hideBeforeTime,
    };
  }

  // Thêm điều kiện leftAt (nếu thành viên không active và đã rời nhóm)
  if (!member.active && member.leftAt) {
    matchStage.createdAt = matchStage.createdAt || {};
    matchStage.createdAt.$lte = member.leftAt;
  }

  // Thêm điều kiện beforeTimestamp (nếu có)
  if (beforeTimestamp) {
    matchStage.createdAt = matchStage.createdAt || {};
    matchStage.createdAt.$lt = new Date(beforeTimestamp);
  }

  // Thiết lập pipeline
  const pipeline = [
    { $match: matchStage },
    { $sort: { createdAt: 1 } }, // Sắp xếp theo createdAt tăng dần
    { $skip: skip },
    { $limit: limit },
    {
      $lookup: {
        from: "members", // Collection chứa member
        localField: "memberId",
        foreignField: "_id",
        as: "memberId",
      },
    },
    { $unwind: "$memberId" }, // Giải nén mảng memberId
    {
      $lookup: {
        from: "users", // Collection chứa user
        localField: "memberId.userId",
        foreignField: "_id",
        as: "memberId.user",
      },
    },
    { $unwind: "$memberId.user" }, // Giải nén mảng user
    {
      $project: {
        _id: 1,
        conversationId: 1,
        channelId: 1,
        content: 1,
        type: 1,
        createdAt: 1,
        updatedAt: 1,
        isDeleted: 1,
        deletedMemberIds: 1,
        fileName: 1,
        fileSize: 1,
        replyMessageId: 1,
        options: 1,
        isMultipleChoice: 1,
        lockedVote: 1,
        reacts: 1,
        memberId: {
          userId: "$memberId.user._id",
          name: "$memberId.user.name",
        },
      },
    },
  ];

  const messages = await this.aggregate(pipeline);
  return messages;
};

messageSchema.statics.getListForIndividualConversation = async function (
  conversationId,
  memberId,
  { skip = 0, limit = 20, beforeTimestamp = null, hideBeforeTime = null } = {}
) {
  const query = {
    conversationId: new ObjectId(conversationId),
    deletedMemberIds: { $nin: [new ObjectId(memberId)] },
  };

  // Thêm điều kiện hideBeforeTime (nếu có)
  if (hideBeforeTime) {
    query.createdAt = { $gt: hideBeforeTime };
  }

  // Nếu có beforeTimestamp, thêm điều kiện lọc trước thời gian đó
  if (beforeTimestamp) {
    query.createdAt = query.createdAt
      ? { $gt: hideBeforeTime, $lt: new Date(beforeTimestamp) }
      : { $lt: new Date(beforeTimestamp) };
  }

  const messages = await this.find(query)
    .sort({ createdAt: 1 })
    .skip(skip)
    .limit(limit)
    .populate({
      path: "memberId",
      select: "userId name",
    })
    .populate({
      path: "replyMessageId",
      select: "content type isDeleted memberId",
      populate: {
        path: "memberId",
        select: "userId name",
      },
    })
    .lean();

  return messages;
};
messageSchema.statics.getListFilesByTypeAndConversationId = async function (
  type,
  conversationId,
  userId,
  skip,
  limit
) {
  return await Message.find(
    {
      conversationId,
      type,
      isDeleted: false,
      deletedMemberIds: { $nin: [userId] },
    },
    {
      userId: 1,
      content: 1,
      type: 1,
      createdAt: 1,
    }
  )
    .lean()
    .skip(skip)
    .limit(limit);
};

messageSchema.statics.getVotesByChannelId = async function (
  channelId,
  skip = 0,
  limit = 20
) {
  const pipeline = [
    {
      $match: {
        channelId: new ObjectId(channelId),
        type: "VOTE",
      },
    },
    ...getBaseGroupMessagePipeline(),
    ...getPaginationStages(skip, limit),
  ];

  return await Message.aggregate(pipeline);
};

messageSchema.statics.createVote = async function (vote) {
  const newVote = new Message({
    channelId: vote.channelId,
    memberId: vote.memberId,
    conversationId: vote.conversationId,
    content: vote.content,
    isAnonymous: vote.isAnonymous || false,
    isMultipleChoice: vote.isMultipleChoice || false,
    options: vote.options.map((option) => ({
      name: option.name,
      members: [],
      memberCreated: vote.memberId,
    })),
    type: "VOTE",
    reacts: [],
    tags: vote.tags || [],
    manipulatedUserIds: [],
    deletedMemberIds: [],
    isDeleted: false,
    lockedVote: {
      lockedStatus: false,
      lockedBy: null,
      lockedAt: null,
    },
  });

  return await newVote.save();
};

messageSchema.statics.lockVote = async function (voteId, memberId) {
  return await Message.findByIdAndUpdate(
    voteId,
    {
      $set: {
        "lockedVote.lockedStatus": true,
        "lockedVote.lockedAt": new Date(),
        "lockedVote.lockedBy": memberId,
      },
    },
    { new: true }
  );
};

messageSchema.statics.addVoteOption = async function (
  voteId,
  memberId,
  newOption
) {
  return await Message.findByIdAndUpdate(
    voteId,
    {
      $push: {
        options: {
          _id: new ObjectId(),
          name: newOption.name,
          members: [],
          memberCreated: memberId,
        },
      },
    },
    { new: true }
  );
};

messageSchema.statics.removeVoteOption = async function (voteId, optionId) {
  return await this.findByIdAndUpdate(
    voteId,
    { $pull: { options: { _id: new Types.ObjectId(optionId) } } },
    { new: true }
  );
};

messageSchema.statics.selectVoteOption = async function (
  voteId,
  memberId,
  memberInfo, 
  optionId,
  isMultipleChoice = false
) {
  const newMember = {
    memberId: new Types.ObjectId(memberId),
    name: memberInfo.name,
    avatar: memberInfo.avatar,
    avatarColor: memberInfo.avatarColor
  };

  if (!isMultipleChoice) {
    await this.updateOne(
      { _id: voteId },
      { $pull: { "options.$[].members": { memberId: new Types.ObjectId(memberId) } } }
    );
  }

  return await this.findByIdAndUpdate(
    voteId,
    { $addToSet: { "options.$[option].members": newMember } },
    {
      arrayFilters: [{ "option._id": new Types.ObjectId(optionId) }],
      new: true,
    }
  );
};

messageSchema.statics.deselectVoteOption = async function (
  voteId,
  memberId,
  optionId
) {
  return await this.findByIdAndUpdate(
    voteId,
    { $pull: { "options.$[option].members": { memberId: new Types.ObjectId(memberId) } } },
    {
      arrayFilters: [{ "option._id": new Types.ObjectId(optionId) }],
      new: true,
    }
  );
};

const Message = mongoose.model("message", messageSchema);

module.exports = Message;
