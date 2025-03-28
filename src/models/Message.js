const mongoose = require("mongoose");
const redisClient = require("../config/redis");
const Schema = mongoose.Schema;
const ObjectId = mongoose.Types.ObjectId;
const NotFoundError = require("../exceptions/NotFoundError");

const MESSAGE_CACHE_PREFIX = 'message:';
const CONVERSATION_MESSAGES_PREFIX = 'conv_msgs:';

const commonLookupStages = {
  userLookup: {
    $lookup: {
      from: "users",
      localField: "userId",
      foreignField: "_id",
      as: "user",
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
    userId: {
      type: ObjectId,
      required: true,
      index: true,
    },
    manipulatedUserIds: {
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
        "FILE",
        "HTML",
        "NOTIFY",
        "VOTE",
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
          userIds: {
            type: [ObjectId],
            default: [],
          },
          userCreated: {
            type: ObjectId,
            required: true,
          },
        },
      ],
      required: false,
    },
    deletedUserIds: {
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
      { conversationId: 1, deletedUserIds: 1 },
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
  commonLookupStages.userLookup,
  { $unwind: "$user" },
  commonLookupStages.manipulatedUsersLookup,
  commonLookupStages.userOptionsLookup,
  commonLookupStages.replyMessageLookup,
  commonLookupStages.replyUserLookup,
  commonLookupStages.reactUsersLookup,
  commonLookupStages.tagUsersLookup,
  { $project: commonProjections.groupMessage },
];

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
  const cacheKey = `${MESSAGE_CACHE_PREFIX}${_id}`;

  // Thử lấy từ cache trước
  const cachedMessage = await redisClient.get(cacheKey);
  if (cachedMessage) {
    return cachedMessage;
  }

  const messageResult = await Message.findById(_id).lean();
  if (!messageResult) throw new NotFoundError(message);
  await redisClient.set(cacheKey, messageResult, 3600); // Cache trong 1 giờ 
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
    deletedUserIds: {
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
        deletedUserIds: { $nin: [ObjectId(userId)] },
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
        deletedUserIds: { $nin: [ObjectId(userId)] },
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
  const pipeline = [
    {
      $match: {
        channelId: ObjectId(channelId),
        deletedUserIds: { $nin: [ObjectId(userId)] },
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
          deletedUserIds: { $nin: [ObjectId(userId)] },
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
      deletedUserIds: { $nin: [userId] },
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

messageSchema.statics.createVote = async function (voteData) {
  // Validate required fields
  if (
    !voteData.userId ||
    !voteData.conversationId ||
    !voteData.content ||
    !voteData.options
  ) {
    throw new Error("Missing required vote fields");
  }

  // Ensure options are valid
  if (!Array.isArray(voteData.options) || voteData.options.length === 0) {
    throw new Error("Vote must have at least one option");
  }

  const newVote = new Message({
    ...voteData,
    type: "VOTE",
    reacts: [],
    tags: voteData.tags || [],
    manipulatedUserIds: [],
    deletedUserIds: [],
    isDeleted: false,
  });

  return await newVote.save();
};

messageSchema.statics.deleteVote = async function (voteId, userId) {
  // Verify vote exists
  const vote = await Message.getById(voteId);

  // Optional: Add check to ensure only the creator can delete
  if (vote.userId.toString() !== userId) {
    throw new Error("Only the vote creator can delete the vote");
  }

  return await Message.findByIdAndUpdate(
    voteId,
    {
      $set: {
        isDeleted: true,
        deletedUserIds: [userId],
      },
    },
    { new: true }
  );
};

messageSchema.statics.addVoteOption = async function (
  voteId,
  userId,
  newOption
) {
  // newOption is object { name, userIds, userCreated }
  // Verify vote exists and is owned by the user
  const vote = await Message.getById(voteId);

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
          userIds: [],
          userCreated: userId,
        },
      },
    },
    { new: true }
  );
};

messageSchema.statics.removeVoteOption = async function (
  voteId,
  userId,
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
  userId,
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
  if (currentOption.userIds.includes(userId)) {
    return vote;
  }

  // Remove user from other options first
  const updatedOptions = vote.options.map((option) => ({
    name: option.name,
    userIds: option.userIds.filter((id) => id.toString() !== userId),
  }));

  // Add user to the selected option
  updatedOptions[optionIndex].userIds.push(userId);

  return await Message.findByIdAndUpdate(
    voteId,
    { $set: { options: updatedOptions } },
    { new: true }
  );
};

messageSchema.statics.deselectVoteOption = async function (
  voteId,
  userId,
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
    userIds:
      index === optionIndex
        ? option.userIds.filter((id) => id.toString() !== userId)
        : option.userIds,
  }));

  return await Message.findByIdAndUpdate(
    voteId,
    { $set: { options: updatedOptions } },
    { new: true }
  );
};

const Message = mongoose.model("message", messageSchema);

module.exports = Message;
