const User = require('../models/User');
const userValidate = require('../validates/userValidate');

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
    }
};

module.exports = UserService;
