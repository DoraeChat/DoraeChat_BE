const jwt = require('jsonwebtoken');
const CustomError = require('../exceptions/CustomError');

const tokenUtils = {
    generateToken: (data, tokenLife) => {
        if (!data) throw new CustomError('Dữ liệu tạo token không hợp lệ', 400);

        return jwt.sign(
            { ...data, createdAt: Date.now() },
            process.env.JWT_KEY,
            { expiresIn: tokenLife }
        );
    },

    verifyToken: (token) => {
        if (!token) throw new CustomError('Token không hợp lệ', 401);

        try {
            return jwt.verify(token, process.env.JWT_KEY);
        } catch (err) {
            throw new CustomError('Token hết hạn hoặc không hợp lệ', 401);
        }
    }
};

module.exports = tokenUtils;
