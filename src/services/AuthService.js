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
        if (!userValidate.validateEmail(email)) {
            throw new CustomError("Email không hợp lệ", 400);
        }

        const exists = await User.existsByUsername(email);
        if (exists) {
            throw new CustomError("Email đã đăng ký", 400);
        }

        return { message: 'Email hợp lệ để đăng ký' };
    }

    async saveUserInfo(submitInformation) {
        const { contact, firstName, lastName, password, dateOfBirth, gender, bio } = submitInformation;

        await this.validate(contact);

        const user = new User({
            username: contact,
            name: firstName + ' ' + lastName,
            password,
            dateOfBirth: new Date(dateOfBirth),
            gender,
            bio,
            isActived: false
        });

        await user.save();
        return { message: 'Đã lưu thông tin người dùng' };
    }

    async generateAndSendOTP(email) {
        const secret = otplib.authenticator.generateSecret();
        const otp = otplib.authenticator.generate(secret);

        const expiresMinutes = parseInt(process.env.OTP_EXPIRE_MINUTES) || 120;
        const expiresAt = new Date(Date.now() + expiresMinutes * 60 * 1000);

        const otpData = {
            otp,
            expiresAt: expiresAt.toISOString()
        };

        await redis.set(email, otpData, expiresMinutes);

        await this.transporter.sendMail({
            from: process.env.GOOGLE_USERNAME,
            to: email,
            subject: 'Mã xác minh DORA',
            text: `Mã xác minh của bạn là: ${otp}`,
            html: `<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                   <h2 style="color: #4a86e8;">DORA Chat - Xác minh tài khoản</h2>
                   <p>Xin chào,</p>
                   <p>Mã xác minh của bạn là:</p>
                   <h1 style="font-size: 32px; letter-spacing: 5px; background: #f0f0f0; padding: 10px; text-align: center;">${otp}</h1>
                   <p>Mã này sẽ hết hạn sau ${expiresMinutes / 60} phút.</p>
                   <p>Nếu bạn không yêu cầu mã này, vui lòng bỏ qua email này.</p>
                   </div>`
        });

        return { message: 'Đã gửi OTP qua email' };
    }

    async resendOTP(email) {
        const user = await User.findOne({ username: email.toLowerCase() });
        if (!user) {
            throw new CustomError('Người dùng không hợp lệ', 404);
        }

        return this.generateAndSendOTP(email);
    }

    async verifyOTP(email, otp) {
        const otpData = await redis.get(email);
        if (!otpData) {
            throw new CustomError('OTP không tồn tại hoặc đã hết hạn', 400);
        }

        if (otpData.otp !== otp || new Date() > new Date(otpData.expiresAt)) {
            throw new CustomError('OTP không hợp lệ hoặc đã hết hạn', 400);
        }

        const user = await User.findOne({ username: email.toLowerCase() });
        if (!user) {
            throw new CustomError('Không tìm thấy người dùng', 404);
        }

        await User.updateOne({ username: email.toLowerCase() }, { isActived: true });
        await redis.set(email, null, 1);

        return { message: 'Xác minh OTP thành công', email };
    }

    async login(username, password, source) {
        if (!source || typeof source !== 'string') {
            throw new CustomError('Nguồn không hợp lệ', 400);
        }

        try {
            userValidate.validateLogin(username, password);
        } catch (error) {
            throw new CustomError('Thông tin đăng nhập không hợp lệ', 400);
        }

        const user = await User.findByCredentials(username, password);
        if (!user) {
            throw new CustomError('Thông tin đăng nhập không hợp lệ', 401);
        }

        const tokens = await this.generateAndUpdateAccessTokenAndRefreshToken(user._id, source);

        return {
            user: {
                _id: user._id,
                username: user.username,
                name: user.name
            },
            ...tokens
        };
    }

    async generateAndUpdateAccessTokenAndRefreshToken(_id, source) {
        try {
            const token = tokenUtils.generateToken(
                { _id, source },
                process.env.JWT_LIFE_ACCESS_TOKEN
            );

            const refreshToken = tokenUtils.generateToken(
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