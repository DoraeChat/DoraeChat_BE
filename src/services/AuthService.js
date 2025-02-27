require('dotenv').config();
const User = require('../models/User');
const redis = require('../config/redis');
const otplib = require('otplib');
const nodemailer = require('nodemailer');
const CustomError = require('../exceptions/CustomError');
const userValidate = require('../validates/userValidate');
const tokenUtils = require('../utils/tokenUtils');

class AuthService {
    constructor() {
        this.transporter = nodemailer.createTransport({
            service: 'gmail',
            auth: { user: process.env.GOOGLE_USERNAME, pass: process.env.GOOGLE_APP_PASSWORD },
        });
    }

    async validate(email) {
        const validateEmail = await userValidate.validateEmail(email);
        if (validateEmail !== true) {
            throw new CustomError("Email không hợp lệ", 400);
        } else {
            const exists = await User.existsByUsername(email);
            if (exists) {
                console.log(exists);
                throw new CustomError("Email đã đăng ký", 400);
            }
        }
        return { message: 'Email hợp lệ để đăng ký' };
    }

    async saveUserInfo(submitInformation) {
        const { contact, firstName, lastName, password, dateOfBirth, gender, bio } = submitInformation;

        const user = new User({
            username: contact,
            name: firstName + ' ' + lastName,
            password,
            dateOfBirth: new Date(dateOfBirth),
            gender,
            bio
        });
        const result = await this.validateEmail(contact);
        if (result !== true) {
            throw new CustomError(result.message, 400);
        }
        await user.save();
        return { message: 'Đã lưu thông tin người dùng' };
    }

    async generateAndSendOTP(email) {
        let otpData = await redis.get(email);
        console.log(otpData);
        if (!otpData) {
            const otp = otplib.authenticator.generate(6);
            const expiresMinutes = parseInt(process.env.OTP_EXPIRE_MINUTES);
            await redis.set(email, otp, expiresMinutes);
            await this.transporter.sendMail({
                from: process.env.GOOGLE_USERNAME,
                to: email,
                subject: 'Mã xác minh DORA',
                text: `Mã xác minh của bạn là: ${otp}`,
            });
        }
        return { message: 'Đã gửi OTP qua email' };
    }

    async resendOTP(email) {
        const otpData = await redis.get(email);
        if (!otpData) {
            throw new CustomError('OTP không tồn tại', 400);
        }
        const otp = otplib.authenticator.generate(6);
        const expiresMinutes = parseInt(process.env.OTP_EXPIRE_MINUTES);
        await redis.set(email, otp, expiresMinutes);
        await this.transporter.sendMail({
            from: process.env.GOOGLE_USERNAME,
            to: email,
            subject: 'Mã xác minh DORA',
            text: `Mã xác minh của bạn là: ${otp}`,
        });
        return { message: 'Đã gửi lại OTP qua email' };
    }

    async verifyOTP(email, otp) {
        const otpData = await redis.get(email);
        if (!otpData) {
            throw new CustomError('OTP không tồn tại', 400);
        }

        if (otpData.otp !== otp || new Date() > otpData.expiresAt) {
            throw new CustomError('OTP không hợp lệ hoặc đã hết hạn', 400);
        }

        const user = User.findOne({ username: email.toLowerCase() });
        if (!user) {
            throw new CustomError('Không tìm thấy người dùng', 404);
        }
        await User.updateOne({ username: email.toLowerCase() }, { isActived: true });
        await redis.set(email, null);

        return { message: 'Xác minh OTP thành công', email };
    }


    async login(username, password, source) {
        if (!source || typeof source !== 'string') throw new CustomError('Nguồn không hợp lệ', 400);

        userValidate.validateLogin(username, password);

        const user = await User.findByCredentials(username, password, '_id username');
        if (!user) throw new CustomError('Thông tin đăng nhập không hợp lệ', 401);
        else {
            const tokens = await this.generateAndUpdateAccessTokenAndRefreshToken(user._id, source);

            return {
                user: { username: user.username },
                ...tokens
            };
        }

    }

    async generateAndUpdateAccessTokenAndRefreshToken(_id, source) {
        try {
            const token = await tokenUtils.generateToken(
                { _id, source },
                process.env.JWT_LIFE_ACCESS_TOKEN
            );
            const refreshToken = await tokenUtils.generateToken(
                { _id, source },
                process.env.JWT_LIFE_REFRESH_TOKEN
            );

            await User.updateOne({ _id }, { $pull: { refreshTokens: { source } } });
            await User.updateOne(
                { _id },
                { $push: { refreshTokens: { token: refreshToken, source } } }
            );

            return { token, refreshToken };
        } catch (error) {
            throw new CustomError(`Lỗi tạo token: ${error.message}`, 400);
        }
    }
}

module.exports = new AuthService();