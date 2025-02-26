const mongoose = require('mongoose');
const Schema = mongoose.Schema;
const ObjectId = mongoose.Types.ObjectId;
const NotFoundError = require('../exception/NotFoundError');

const groupRequestSchema = new Schema(
    {
        senderId: ObjectId,
        receiverId: ObjectId,
        conversationId: ObjectId,
    },
    { timestamps: true }
);

groupRequestSchema.index({ senderId: 1, receiverId: 1, conversationId: 1 }, { unique: true });

groupRequestSchema.statics.findGroupRequest = async (senderId, receiverId, conversationId) => {
    return GroupRequest.findOne({
        senderId,
        receiverId,
        conversationId,
    }).lean();
};

groupRequestSchema.statics.existsByIds = async (senderId, receiverId, conversationId) => {
    if (!ObjectId.isValid(senderId) || !ObjectId.isValid(receiverId) || !ObjectId.isValid(conversationId)) throw new NotFoundError('Invalid ID');
    const isExists = await GroupRequest.findGroupRequest(senderId, receiverId, conversationId);
    return !!isExists;
};

groupRequestSchema.statics.checkByIds = async (senderId, receiverId, conversationId, message = 'Group Invite') => {
    if (!ObjectId.isValid(senderId) || !ObjectId.isValid(receiverId) || !ObjectId.isValid(conversationId)) throw new NotFoundError('Invalid ID');
    const isExists = await GroupRequest.findGroupRequest(senderId, receiverId, conversationId);
    if (!isExists) throw new NotFoundError(message);
};

groupRequestSchema.statics.deleteByIds = async (senderId, receiverId, conversationId, message = 'Group Invite') => {
    if (!ObjectId.isValid(senderId) || !ObjectId.isValid(receiverId) || !ObjectId.isValid(conversationId)) throw new NotFoundError('Invalid ID');
    const { deletedCount } = await GroupRequest.deleteOne({
        senderId,
        receiverId,
        conversationId,
    });
    if (deletedCount === 0) throw new NotFoundError(message);
};

const GroupRequest = mongoose.model('GroupRequest', groupRequestSchema);

module.exports = GroupRequest;