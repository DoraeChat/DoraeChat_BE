const mongoose = require("mongoose");
const Schema = mongoose.Schema;
const ObjectId = mongoose.Types.ObjectId;
const NotFoundError = require("../exceptions/NotFoundError");
const Channel = require("./Channel");
const Member = require("./Member");

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
  },
};

const messageSchema = new Schema(
  {
    memberId: {
      type: ObjectId,
      required: true,
      index: true,
    },
    manipulatedMemberIds: {
      // member được nhắc đến trong thông báo
      type: [ObjectId],
      default: [],
    },
    content: {
      type: String,
      required: true,
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
        "FILE", // docx, pdf, pptx, xlsx, zip, rar, txt, gif
        "NOTIFY", // Thông báo
        "VOTE",
        "AUDIO",
      ],
      required: true,
      index: true,
    },
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
          name: String,
          memberIds: {
            type: [ObjectId],
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
        lockedStatus: Boolean, // true: locked
        lockedBy: ObjectId,
        lockedAt: Date,
      },
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
  conversationId,
  channelId = null,
}) {
  // Kiểm tra các trường bắt buộc
  if (!memberId || !content || !conversationId) {
    throw new Error("memberId, content, and conversationId are required");
  }

  // Tạo tin nhắn mới
  const message = new this({
    memberId,
    content,
    type,
    conversationId,
    channelId,
  });

  // Lưu tin nhắn vào database
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

messageSchema.statics.getListByConversationIdAndUserIdOfGroup = async function (
  conversationId,
  userId,
  skip,
  limit
) {
  const pipeline = [
    {
      $match: {
        conversationId: ObjectId(conversationId),
        deletedMemberIds: { $nin: [ObjectId(userId)] },
      },
    },
    ...getBaseGroupMessagePipeline(),
    ...getPaginationStages(skip, limit),
  ];

  return await Message.aggregate(pipeline);
};

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
  limit
) {
  // Tìm conversationId từ channelId
  const channel = await Channel.findById(channelId).lean();
  if (!channel) {
    throw new Error("Channel not found");
  }
  const conversationId = channel.conversationId;

  // Tìm memberId từ userId và conversationId
  const member = await Member.getByConversationIdAndUserId(
    conversationId,
    userId
  );
  if (!member) {
    throw new Error("User is not a member of this conversation");
  }

  // Thiết lập pipeline với memberId
  const pipeline = [
    {
      $match: {
        channelId: new ObjectId(channelId),
        deletedUserIds: { $nin: [member._id] },
        ...(member.hideBeforeTime && {
          createdAt: { $gt: member.hideBeforeTime }, //  hiển thị tin nhắn sau hideBeforeTime
        }),
      },
    },
    ...getBaseGroupMessagePipeline(),
    ...getPaginationStages(skip, limit),
  ];

  return await Message.aggregate(pipeline);
};

messageSchema.statics.getListByConversationIdAndUserIdOfIndividual =
  async function (conversationId, userId, skip, limit) {
    const pipeline = [
      {
        $match: {
          conversationId: ObjectId(conversationId),
          deletedMemberIds: { $nin: [ObjectId(userId)] },
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
      ...getPaginationStages(skip, limit),
    ];

    return await Message.aggregate(pipeline);
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

messageSchema.statics.getVotesByConversationId = async function (
  conversationId,
  skip = 0,
  limit = 20
) {
  const pipeline = [
    {
      $match: {
        conversationId: new ObjectId(conversationId),
        type: "VOTE",
      },
    },
    ...getBaseGroupMessagePipeline(),
    ...getPaginationStages(skip, limit),
  ];

  return await Message.aggregate(pipeline);
};

messageSchema.statics.createVote = async function (vote) {
  // Validate required fields
  if (
    !vote.memberId ||
    !vote.conversationId ||
    !vote.content ||
    !vote.options
  ) {
    throw new Error("Missing required vote fields");
  }

  // Ensure options are valid
  if (!Array.isArray(vote.options) || vote.options.length === 0) {
    throw new Error("Vote must have at least one option");
  }

  const newVote = new Message({
    ...vote,
    type: "VOTE",
    reacts: [],
    tags: vote.tags || [],
    manipulatedUserIds: [],
    deletedMemberIds: [],
    isDeleted: false,
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
  // newOption is object { name, memberIds, memberCreated }

  const vote = await Message.getById(voteId);
  if (!vote) {
    throw new NotFoundError("Vote not found");
  }

  // Ensure the option has a name
  if (!newOption.name) {
    throw new Error("Option must have a name");
  }

  return await Message.findByIdAndUpdate(
    voteId,
    {
      $push: {
        options: {
          _id: new ObjectId(),
          name: newOption.name,
          memberIds: [],
          memberCreated: memberId,
        },
      },
    },
    { new: true }
  );
};

messageSchema.statics.removeVoteOption = async function (voteId, optionId) {
  const vote = await Message.getById(voteId);

  // Ensure optionId is valid
  const optionIndex = vote.options.findIndex(
    (option) => option._id.toString() === optionId
  );
  if (optionIndex === -1) {
    throw new Error("Invalid option ID");
  }

  return await Message.findByIdAndUpdate(
    voteId,
    {
      $pull: {
        options: { _id: optionId },
      },
    },
    { new: true }
  );
};

messageSchema.statics.selectVoteOption = async function (
  voteId,
  memberId,
  optionId
) {
  const vote = await Message.getById(voteId);

  // Ensure optionId is valid
  const optionIndex = vote.options.findIndex(
    (option) => option._id.toString() === optionId
  );
  if (optionIndex === -1) {
    throw new Error("Invalid option ID");
  }

  // Check if user has already selected this option
  const currentOption = vote.options[optionIndex];
  if (currentOption.memberIds.includes(memberId)) {
    return vote;
  }

  // Remove user from other options first
  const updatedOptions = vote.options.map((option) => ({
    name: option.name,
    memberIds: option.memberIds.filter((id) => id.toString() !== memberId),
  }));

  // Add user to the selected option
  updatedOptions[optionIndex].memberIds.push(memberId);

  return await Message.findByIdAndUpdate(
    voteId,
    { $set: { options: updatedOptions } },
    { new: true }
  );
};

messageSchema.statics.deselectVoteOption = async function (
  voteId,
  memberId,
  optionId
) {
  const vote = await Message.getById(voteId);

  // Ensure optionId is valid
  const optionIndex = vote.options.findIndex(
    (option) => option._id.toString() === optionId
  );
  if (optionIndex === -1) {
    throw new Error("Invalid option ID");
  }

  const updatedOptions = vote.options.map((option, index) => ({
    name: option.name,
    memberIds:
      index === optionIndex
        ? option.memberIds.filter((id) => id.toString() !== memberId)
        : option.memberIds,
  }));

  return await Message.findByIdAndUpdate(
    voteId,
    { $set: { options: updatedOptions } },
    { new: true }
  );
};

const Message = mongoose.model("message", messageSchema);

module.exports = Message;
