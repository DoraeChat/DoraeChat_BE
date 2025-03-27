const User = require('../models/User');
const Conversation = require('../models/Conversation');
const Friend = require('../models/Friend');
const userValidate = require('../validates/userValidate');
const ObjectId = require('mongoose').Types.ObjectId;

const UserService = {
    async existsById(id) {
        return await User.existsById(id);
    },

    async checkByIds(ids) {
        return await User.checkByIds(ids);
    },

    async getById(id) {
        const user = await User.getById(id);
        return user;
    },

    async existsByUsername(username) {
        return await User.existsByUsername(username);
    },

    async findByUsername(username) {
        const user = await User.findByUsername(username);
        return user;
    },

    async checkById(id) {
        return await User.checkById(id);
    },

    async getSummaryById(id) {
        const userSummary = await User.getSummaryById(id);
        return userSummary;
    },

    // add user
    async addUser(user) {
        return await User.addUser(user);
    },

    // update user
    async updateUser(id, user) {
        return await User.updateUser(id, user);
    },

    // delete user
    async deleteUser(id) {
        return await User.deleteUser(id);
    },

    async getNumberCommonGroup(myId, searchUserId) {
        const objectMyId = new ObjectId(myId);
        const objectSearchUserId = new ObjectId(searchUserId);

        return await Conversation.countDocuments({
            type: true,
            members: { $all: [objectMyId, objectSearchUserId] },
        });
    },

    async getNumberCommonFriend(myId, searchUserId) {
        const objectSearchUserId = new ObjectId(searchUserId);
        const objectMyId = new ObjectId(myId);

        let friendIdsOfSearchUser = await Friend.aggregate([
            { $match: { userIds: { $in: [objectSearchUserId] } } },
            { $project: { userIds: 1 } },
            { $unwind: '$userIds' },
            { $match: { userIds: { $ne: objectSearchUserId } } },
        ]);

        friendIdsOfSearchUser = friendIdsOfSearchUser
            .map(ele => ele.userIds)
            .filter(id => id.toString() !== myId.toString());

        const commonFriends = await Friend.find({
            userIds: { $in: friendIdsOfSearchUser },
            userIds: objectMyId,
        });

        return commonFriends.length;
    }
};

module.exports = UserService;
