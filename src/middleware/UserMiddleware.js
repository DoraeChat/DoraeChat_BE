const UserService = require('../services/UserService');
const ForbiddenError = require('../exceptions/ForbiddenError');

const UserMiddleware = {
    async checkAdminRole(req, res, next) {
        const user = await UserService.getById(req._id);
        if (!user || user.role !== 'admin') {
            return next(new ForbiddenError('Access denied: Admins only'));
        }
        next();
    }
};

module.exports = UserMiddleware;