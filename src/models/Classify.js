const mongoose = require('mongoose');
const Schema = mongoose.Schema;
const ObjectId = mongoose.Types.ObjectId;
const NotFoundError = require('../exception/NotFoundError');

const classifySchema = new Schema({
    name: {
        type: String
    },
    conversationIds: {
        type: [ObjectId],
        default: []
    },
    colorId: {
        type: ObjectId
    },
    userId: {
        type: ObjectId
    },
}, { timestamps: true });

classifySchema.index({ userId: 1 });
classifySchema.index({ conversationIds: 1 });

classifySchema.statics.checkExistence = async (query, message) => {
    const result = await this.findOne(query).lean();
    if (!result) throw new NotFoundError(message);
    return result;
};

classifySchema.statics.checkById = async (_id, message = 'Classify') => {
    if (!ObjectId.isValid(_id)) throw new NotFoundError(`${message} ID không hợp lệ`);
    return this.checkExistence({ _id }, message);
};

classifySchema.statics.getByIdAndUserId = async (_id, userId, message = 'Classify') => {
    if (!ObjectId.isValid(_id) || !ObjectId.isValid(userId)) throw new NotFoundError(`${message} ID không hợp lệ`);
    return this.checkExistence({ _id, userId }, message);
};

const Classify = mongoose.model('Classify', classifySchema);

module.exports = Classify;