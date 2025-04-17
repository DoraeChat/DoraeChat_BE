const User = require('../models/User');
const Friend = require('../models/Friend');
const FriendRequest = require('../models/FriendRequest');
const Conversation = require('../models/Conversation');
const ObjectId = require('mongoose').Types.ObjectId;
const CustomError = require('../exceptions/CustomError');
const userService = require('./UserService');
const conversationService = require('./ConversationService');
const messageService = require('./MessageService');

class FriendService {
    async getList(name, _id) {
        const objectUserId = new ObjectId(_id);
        await User.getById(_id);

        const friends = await Friend.aggregate([
            { $match: { userIds: objectUserId } },
            { $unwind: '$userIds' },
            { $match: { userIds: { $ne: objectUserId } } },
            {
                $lookup: {
                    from: 'users',
                    localField: 'userIds',
                    foreignField: '_id',
                    as: 'user'
                }
            },
            { $unwind: '$user' },
            { $replaceWith: '$user' },
            {
                $match: {
                    name: { $regex: name, $options: 'i' },
                    isActived: true
                }
            },
            {
                $project: {
                    _id: { $toString: '$_id' },
                    name: 1,
                    username: 1,
                    avatar: 1,
                    avatarColor: 1
                }
            }
        ]);

        return friends;
    }

    async deleteFriend(_id, userId) {
        if (!_id || !userId)
            throw new CustomError('Both user IDs are required');
        const friendExists = await Friend.existsByIds(_id, userId);
        if (!friendExists)
            throw new CustomError('Friend does not exist');

        const result = await Friend.deleteByIds(_id, userId);


        return result;

    }

    async sendFriendInvite(_id, userId) {
        if (!_id || !userId)
            throw new CustomError('Both user IDs are required');

        if (_id.toString() === userId.toString())
            throw new CustomError('Cannot send friend invite to yourself');

        await Promise.all([
            User.checkById(_id),
            User.checkById(userId)
        ]);

        if (await Friend.existsByIds(_id, userId))
            throw new CustomError('Friend exists');

        if (
            await FriendRequest.existsByIds(_id, userId) ||
            await FriendRequest.existsByIds(userId, _id)
        )
            throw new CustomError('Invite exists');

        const friendRequest = new FriendRequest({ senderId: _id, receiverId: userId });
        await friendRequest.save();
    }

    async deleteFriendInvite(_id, senderId) {
        await FriendRequest.deleteByIds(senderId, _id);
    }

    async deleteInviteWasSend(_id, userId) {
        await FriendRequest.deleteByIds(_id, userId);
    }

    async acceptFriend(_id, senderId) {
        console.log('acceptFriend', _id, senderId);
        await FriendRequest.checkByIds(senderId, _id);

        if (await Friend.existsByIds(_id, senderId))
            throw new CustomError('Friend exists');

        await FriendRequest.deleteOne({ senderId, receiverId: _id });

        const friend = new Friend({ userIds: [_id, senderId] });
        await friend.save();


        return friend;
    }

    async getListInvites(_id) {
        const objectUserId = new ObjectId(_id);

        const users = await FriendRequest.aggregate([
            { $match: { receiverId: objectUserId } },
            { $project: { _id: 0, senderId: 1 } },
            {
                $lookup: {
                    from: 'users',
                    localField: 'senderId',
                    foreignField: '_id',
                    as: 'user',
                }
            },
            { $unwind: '$user' },
            { $replaceWith: '$user' },
            {
                $project: {
                    _id: 1,
                    name: 1,
                    username: 1,
                    avatar: 1,
                    avatarColor: 1,
                }
            }
        ]);

        const userResults = await Promise.all(users.map(async user => {
            const [group, friend] = await Promise.all([
                userService.getNumberCommonGroup(_id, user._id),
                userService.getNumberCommonFriend(_id, user._id)
            ]);

            return {
                ...user,
                numberCommonGroup: group,
                numberCommonFriend: friend
            };
        }));

        return userResults;
    }

    async getListInvitesWasSend(_id) {
        const objectUserId = new ObjectId(_id);
        await User.checkById(_id);

        const users = await FriendRequest.aggregate([
            { $match: { senderId: objectUserId } },
            { $project: { _id: 0, receiverId: 1 } },
            {
                $lookup: {
                    from: 'users',
                    localField: 'receiverId',
                    foreignField: '_id',
                    as: 'user',
                }
            },
            { $unwind: '$user' },
            { $replaceWith: '$user' },
            {
                $project: {
                    _id: 1,
                    name: 1,
                    username: 1,
                    avatar: 1,
                    avatarColor: 1,
                }
            }
        ]);

        const userResults = await Promise.all(users.map(async user => {
            const [group, friend] = await Promise.all([
                userService.getNumberCommonGroup(_id, user._id),
                userService.getNumberCommonFriend(_id, user._id)
            ]);

            return {
                ...user,
                numberCommonGroup: group,
                numberCommonFriend: friend
            };
        }));

        return userResults;
    }

    async getSuggestFriends(_id, page, size) {
        if (!size || page < 0 || size <= 0)
            throw new CustomError('Params suggest friend invalid');

        const objectUserId = new ObjectId(_id);

        const friendIdsRaw = await Friend.aggregate([
            { $match: { userIds: { $in: [objectUserId] } } },
            { $unwind: '$userIds' },
            { $match: { userIds: { $ne: objectUserId } } }
        ]);
        const friendObjectIds = friendIdsRaw.map(ele => new ObjectId(ele.userIds));

        const conversations = await Conversation.aggregate([
            { $match: { type: true, members: { $in: [objectUserId] } } },
            { $unwind: '$members' },
            {
                $match: {
                    members: { $ne: objectUserId, $nin: friendObjectIds }
                }
            },
            { $group: { _id: '$members' } }
        ]);

        const suggestions = await Promise.allSettled(conversations.map(conver =>
            userService.getStatusFriendOfUserById(_id, conver._id)
        ));

        const result = suggestions
            .filter(res => res.status === 'fulfilled')
            .map(res => {
                const user = res.value;
                return {
                    ...user,
                    total: user.numberCommonGroup + user.numberCommonFriend
                };
            })
            .sort((a, b) => b.total - a.total);

        const start = page * size;
        const end = start + size;
        return result.slice(start, end);
    }
}

module.exports = new FriendService();
