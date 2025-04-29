const jwt = require('jsonwebtoken');
const CustomError = require('../exceptions/CustomError');

const tokenUtils = {
    generateToken: (data, tokenLife) => {
        if (!data) throw new CustomError('Invalid token generation data', 400);

        return jwt.sign(
            { ...data, createdAt: Date.now() },
            process.env.JWT_KEY,
            { expiresIn: tokenLife }
        );
    },

    verifyToken: (token) => {
        if (!token) throw new CustomError('Token is invalid', 401);

        try {
            return jwt.verify(token, process.env.JWT_KEY);
        } catch (err) {
            throw new CustomError('Token expired or invalid', 401);
        }
    }
};

module.exports = tokenUtils;
