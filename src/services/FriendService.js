const User = require('../models/User');
const Friend = require('../models/Friend');
const FriendRequest = require('../models/FriendRequest');
const ObjectId = require('mongoose').Types.ObjectId;
const CustomError = require('../exceptions/CustomError')

class FriendService {

    async getList(name, _id) {
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
        await Friend.deleteByIds(_id, userId);
    }


    async deleteFriendInvite(_id, senderId) {
        await FriendRequest.deleteByIds(senderId, _id);
    }


    async sendFriendInvite(_id, userId) {
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

    async deleteInviteWasSend(_id, userId) {
        await FriendRequest.deleteByIds(_id, userId);
    }

}

module.exports = new FriendService();
