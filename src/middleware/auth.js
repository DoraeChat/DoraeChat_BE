const User = require('../models/User');
const tokenUtils = require('../utils/tokenUtils');

const auth = async (req, res, next) => {
    try {
        const authHeader = req.header('Authorization');
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(401).json({ status: 401, error: 'Unauthorized: No token provided' });
        }
        const token = authHeader.replace('Bearer ', '');

        let data;
        try {
            data = tokenUtils.verifyToken(token);
        } catch (err) {
            return res.status(401).json({ status: 401, error: 'Unauthorized: Invalid or expired token' });
        }

        const user = await User.findOne({
            _id: data._id,
            isActived: true,
            isDeleted: false,
        });

        if (!user) {
            return res.status(401).json({ status: 401, error: 'Unauthorized: User not found or inactive' });
        }

        const { timeRevokeToken } = user;
        if (data.createdAt < timeRevokeToken) {
            return res.status(401).json({ status: 401, error: 'Unauthorized: Token revoked' });
        }

        const source = req.headers['user-agent'];
        if (!data.source || source !== data.source) {
            console.log('source !== data.source:', source !== data.source);
            return res.status(401).json({ status: 401, error: 'Unauthorized: Invalid source' });
        }

        req._id = data._id;

        next();
    } catch (error) {
        console.error('Authentication Error:', error);
        res.status(500).json({ status: 500, error: 'Internal Server Error' });
    }
};

module.exports = auth;
