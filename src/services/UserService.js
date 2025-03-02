const User = require('../models/User');
const NotFoundError = require('../exceptions/NotFoundError');

const UserService = {
    async existsById(id) {
        return await User.existsById(id);
    },

    async checkByIds(ids) {
        return await User.checkByIds(ids);
    },

    async getById(id) {
        const user = await User.getById(id);
        if (!user) {
            throw new NotFoundError('User not found');
        }
        return user;
    },

    async existsByUsername(username) {
        return await User.existsByUsername(username);
    },

    async findByUsername(username) {
        const user = await User.findByUsername(username);
        if (!user) {
            throw new NotFoundError('User not found');
        }
        return user;
    },

    async checkById(id) {
        return await User.checkById(id);
    },

    async getSummaryById(id) {
        const userSummary = await User.getSummaryById(id);
        if (!userSummary) {
            throw new NotFoundError('User summary not found');
        }
        return userSummary;
    }
};

module.exports = UserService;
