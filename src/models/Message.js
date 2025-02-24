const mongoose = require('mongoose');
const Schema = mongoose.Schema;
const ObjectId = mongoose.Types.ObjectId;
const NotFoundError = require('../exception/NotFoundError');

const commonLookupStages = {
    userLookup: {
        $lookup: {
            from: 'users',
            localField: 'userId',
            foreignField: '_id',
            as: 'user'
        }
    },
    manipulatedUsersLookup: {
        $lookup: {
            from: 'users',
            localField: 'manipulatedUserIds',
            foreignField: '_id',
            as: 'manipulatedUsers'
        }
    },
    userOptionsLookup: {
        $lookup: {
            from: 'users',
            localField: 'options.userIds',
            foreignField: '_id',
            as: 'userOptions'
        }
    },
    replyMessageLookup: {
        $lookup: {
            from: 'messages',
            localField: 'replyMessageId',
            foreignField: '_id',
            as: 'replyMessage'
        }
    },
    replyUserLookup: {
        $lookup: {
            from: 'users',
            localField: 'replyMessage.userId',
            foreignField: '_id',
            as: 'replyUser'
        }
    },
    reactUsersLookup: {
        $lookup: {
            from: 'users',
            localField: 'reacts.userId',
            foreignField: '_id',
            as: 'reactUsers'
        }
    },
    tagUsersLookup: {
        $lookup: {
            from: 'users',
            localField: 'tags',
            foreignField: '_id',
            as: 'tagUsers'
        }
    }
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
    }
};

const messageSchema = new Schema(
    {
        userId: {
            type: ObjectId,
            required: true,
            index: true
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
                'TEXT',
                'IMAGE',
                'STICKER',
                'VIDEO',
                'FILE',
                'HTML',
                'NOTIFY',
                'VOTE',
            ],
            required: true,
            index: true
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
            index: true
        },
        channelId: {
            type: ObjectId,
            index: true
        }
    },
    {
        timestamps: true,
        indexes: [
            { conversationId: 1, type: 1 },
            { channelId: 1, type: 1 },
            { conversationId: 1, createdAt: -1 },
            { channelId: 1, createdAt: -1 },
            { conversationId: 1, deletedUserIds: 1 }
        ]
    }
);

const getPaginationStages = (skip, limit) => [
    { $sort: { createdAt: -1 } },
    { $skip: skip },
    { $limit: limit },
    { $sort: { createdAt: 1 } }
];

const getBaseGroupMessagePipeline = () => [
    commonLookupStages.userLookup,
    { $unwind: '$user' },
    commonLookupStages.manipulatedUsersLookup,
    commonLookupStages.userOptionsLookup,
    commonLookupStages.replyMessageLookup,
    commonLookupStages.replyUserLookup,
    commonLookupStages.reactUsersLookup,
    commonLookupStages.tagUsersLookup,
    { $project: commonProjections.groupMessage }
];

messageSchema.statics.getByIdOfGroup = async function (_id) {
    const pipeline = [
        {
            $match: {
                _id: ObjectId(_id),
            },
        },
        ...getBaseGroupMessagePipeline()
    ];

    const messages = await this.aggregate(pipeline);
    if (messages.length > 0) return messages[0];
    throw new NotFoundError('Message');
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
                from: 'members',
                localField: 'conversationId',
                foreignField: 'conversationId',
                as: 'members',
            },
        },
        {
            $lookup: {
                from: 'users',
                localField: 'members.userId',
                foreignField: '_id',
                as: 'userInfos',
            },
        },
        {
            $project: commonProjections.individualMessage
        }
    ];

    const messages = await this.aggregate(pipeline);
    if (messages.length > 0) return messages[0];
    throw new NotFoundError('Message');
};

messageSchema.statics.countUnread = async function (time, conversationId) {
    return await this.countDocuments({
        createdAt: { $gt: time },
        conversationId
    }).lean();
};

messageSchema.statics.getById = async function (_id, message = 'Message') {
    const messageResult = await this.findById(_id).lean();
    if (!messageResult) throw new NotFoundError(message);
    return messageResult;
};

messageSchema.statics.getByIdAndConversationId = async function (
    _id,
    conversationId,
    message = 'Message'
) {
    const messageResult = await this.findOne({
        _id,
        conversationId,
    }).lean();

    if (!messageResult) throw new NotFoundError(message);
    return messageResult;
};

messageSchema.statics.getByIdAndChannelId = async function (
    _id,
    channelId,
    message = 'Message'
) {
    const messageResult = await this.findOne({
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
    return await this.countDocuments({
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
        ...getPaginationStages(skip, limit)
    ];

    return await this.aggregate(pipeline);
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
        ...getPaginationStages(skip, limit)
    ];

    return await this.aggregate(pipeline);
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
        ...getPaginationStages(skip, limit)
    ];

    return await this.aggregate(pipeline);
};

messageSchema.statics.getListByConversationIdAndUserIdOfIndividual = async function (
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
        commonLookupStages.replyMessageLookup,
        {
            $lookup: {
                from: 'members',
                localField: 'conversationId',
                foreignField: 'conversationId',
                as: 'members',
            },
        },
        {
            $lookup: {
                from: 'users',
                localField: 'members.userId',
                foreignField: '_id',
                as: 'userInfos',
            },
        },
        {
            $project: commonProjections.individualMessage
        },
        ...getPaginationStages(skip, limit)
    ];

    return await this.aggregate(pipeline);
};

messageSchema.statics.getListFilesByTypeAndConversationId = async function (
    type,
    conversationId,
    userId,
    skip,
    limit
) {
    return await this.find(
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

const Message = mongoose.model('message', messageSchema);

module.exports = Message;