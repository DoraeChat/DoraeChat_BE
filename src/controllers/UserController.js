const User = require('../models/User');
const UserService = require('../services/UserService');
const CustomError = require('../exceptions/CustomError');
const NotFoundError = require('../exceptions/NotFoundError');

const UserController = {
    async existsById(req, res, next) {
        try {
            const { id } = req.params;
            const exists = await UserService.existsById(id);
            res.json({ exists });
        } catch (error) {
            next(error);
        }
    },

    async checkByIds(req, res, next) {
        try {
            const { ids } = req.body;
            await UserService.checkByIds(ids);
            res.json({ message: 'Users are valid' });
        } catch (error) {
            next(error);
        }
    },

    async getById(req, res, next) {
        try {
            const { id } = req.params;
            const user = await UserService.getById(id);
            res.json(user);
        } catch (error) {
            next(error);
        }
    },

    async existsByUsername(req, res, next) {
        try {
            const { username } = req.params;
            const exists = await UserService.existsByUsername(username);
            res.json({ exists });
        } catch (error) {
            next(error);
        }
    },

    async findByUsername(req, res, next) {
        try {
            const { username } = req.params;
            const user = await UserService.findByUsername(username);
            res.json(user);
        } catch (error) {
            next(error);
        }
    },

    async checkById(req, res, next) {
        try {
            const { id } = req.params;
            const user = await UserService.checkById(id);
            res.json(user);
        } catch (error) {
            next(error);
        }
    },

    async getSummaryById(req, res, next) {
        try {
            const { id } = req.params;
            const userSummary = await UserService.getSummaryById(id);
            res.json(userSummary);
        } catch (error) {
            next(error);
        }
    }
};

module.exports = UserController;
