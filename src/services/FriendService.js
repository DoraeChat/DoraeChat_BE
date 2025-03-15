const User = require('../models/User');
const Friend = require('../models/Friend');
const FriendRequest = require('../models/FriendRequest');
const ObjectId = require('mongoose').Types.ObjectId;
const CustomError = require('../exceptions/CustomError')

class FriendService {

    async getList(name, _id) {
        if (!_id) {
            throw new CustomError('User ID is required');
        }

        await User.getById(_id);

        const friends = await Friend.aggregate([
            { $project: { _id: 0, userIds: 1 } },
            {
                $match: {
                    userIds: { $in: [ObjectId(_id)] },
                },
            },
            { $unwind: '$userIds' },
            {
                $match: {
                    userIds: { $ne: ObjectId(_id) },
                },
            },
            {
                $lookup: {
                    from: 'users',
                    localField: 'userIds',
                    foreignField: '_id',
                    as: 'user',
                },
            },
            { $unwind: '$user' },
            { $replaceWith: '$user' },
            {
                $match: {
                    name: { $regex: name, $options: 'i' },
                },
            },
            {
                $project: {
                    _id: 1,
                    name: 1,
                    username: 1,
                    avatar: 1,
                    avatarColor: 1,
                },
            },
        ]);

        return friends;
    }

    async deleteFriend(_id, userId) {
        if (!_id || !userId) {
            throw new CustomError('Both user IDs are required');
        }

        await Friend.deleteByIds(_id, userId);
    }


    async sendFriendInvite(_id, userId) {
        if (!_id || !userId) {
            throw new CustomError('Both user IDs are required');
        }

        // Prevent sending invite to self
        if (_id.toString() === userId.toString()) {
            throw new CustomError('Cannot send friend invite to yourself');
        }

        await User.checkById(_id);
        await User.checkById(userId);

        // check có bạn bè hay chưa
        if (await Friend.existsByIds(_id, userId))
            throw new CustomError('Friend exists');

        // check không có lời mời nào
        if (
            (await FriendRequest.existsByIds(_id, userId)) ||
            (await FriendRequest.existsByIds(userId, _id))
        )
            throw new CustomError('Invite exists');

        const friendRequest = new FriendRequest({
            senderId: _id,
            receiverId: userId,
        });

        await friendRequest.save();
    }

    async deleteFriendInvite(_id, senderId) {
        await FriendRequest.deleteByIds(senderId, _id);
    }

    async deleteInviteWasSend(_id, userId) {
        await FriendRequest.deleteByIds(_id, userId);
    }
}

module.exports = new FriendService();
