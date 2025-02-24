const mongoose = require('mongoose');
const Schema = mongoose.Schema;
const ObjectId = mongoose.Types.ObjectId;
const NotFoundError = require('../exception/NotFoundError');

const channelSchema = new Schema(
    {
        name: {
            type: String,
            required: true,
        },
        conversationId: {
            type: ObjectId,
            required: true,
        },
    },
    { timestamps: true }
);

channelSchema.index({ conversationId: 1 });

channelSchema.statics.checkExistence = async (query, message) => {
    const channel = await this.findOne(query).lean();
    if (!channel) throw new NotFoundError(message);
    return channel;
};

channelSchema.statics.getById = async (_id, message = 'Channel') => {
    if (!ObjectId.isValid(_id)) throw new NotFoundError(`${message} ID không hợp lệ`);
    return this.checkExistence({ _id }, message);
};

channelSchema.statics.getByIdAndConversationId = async (_id, conversationId, message = 'Channel') => {
    if (!ObjectId.isValid(_id) || !ObjectId.isValid(conversationId)) throw new NotFoundError(`${message} ID không hợp lệ`);
    return this.checkExistence({ _id, conversationId }, message);
};

const Channel = mongoose.model('Channel', channelSchema);

module.exports = Channel;