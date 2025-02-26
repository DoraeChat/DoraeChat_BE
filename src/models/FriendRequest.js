const mongoose = require('mongoose');
const Schema = mongoose.Schema;
const ObjectId = mongoose.Types.ObjectId;
const NotFoundError = require('../exception/NotFoundError');

const friendRequestSchema = new Schema(
    {
        senderId: ObjectId,
        receiverId: ObjectId,
    },
    { timestamps: true }
);

friendRequestSchema.index({ senderId: 1, receiverId: 1 }, { unique: true });

friendRequestSchema.statics.findFriendRequest = async (senderId, receiverId) => {
    return FriendRequest.findOne({ senderId, receiverId }).lean();
};

friendRequestSchema.statics.existsByIds = async (senderId, receiverId) => {
    if (!ObjectId.isValid(senderId) || !ObjectId.isValid(receiverId)) throw new NotFoundError('Invalid User ID');
    const isExists = await FriendRequest.findFriendRequest(senderId, receiverId);
    return !!isExists;
};

friendRequestSchema.statics.checkByIds = async (senderId, receiverId, message = 'Invite') => {
    if (!ObjectId.isValid(senderId) || !ObjectId.isValid(receiverId)) throw new NotFoundError('Invalid User ID');
    const isExists = await FriendRequest.findFriendRequest(senderId, receiverId);
    if (!isExists) throw new NotFoundError(message);
};

friendRequestSchema.statics.deleteByIds = async (senderId, receiverId, message = 'Invite') => {
    if (!ObjectId.isValid(senderId) || !ObjectId.isValid(receiverId)) throw new NotFoundError('Invalid User ID');
    const { deletedCount } = await FriendRequest.deleteOne({ senderId, receiverId });
    if (deletedCount === 0) throw new NotFoundError(message);
};

const FriendRequest = mongoose.model('FriendRequest', friendRequestSchema);

module.exports = FriendRequest;