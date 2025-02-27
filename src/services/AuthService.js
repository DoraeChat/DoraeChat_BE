require('dotenv').config();
const User = require('../models/User');
const redis = require('../config/redis');
const otplib = require('otplib');
const nodemailer = require('nodemailer');
const CustomError = require('../exceptions/CustomError');

class AuthService {
    constructor() {
        this.transporter = nodemailer.createTransport({
            service: 'gmail',
            auth: { user: process.env.GOOGLE_USERNAME, pass: process.env.GOOGLE_APP_PASSWORD },
        });
    }

    async validateEmail(email) {
        if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
            return new CustomError('Email không hợp lệ', 400);
        }
        console.log(email);
        const exists = await User.existsByUsername(email);
        console.log(exists);
        if (exists) {
            console.log('Email đã được đăng ký');
            return new CustomError('Email đã được đăng ký', 400);
        }
        return true;
    }

    async validate(email) {
        const validateEmail = await this.validateEmail(email);
        if (validateEmail !== true) {
            throw new CustomError(validateEmail.message, 400);
        } else {
            return { message: 'Email hợp lệ để đăng ký' };
        }
    }

    async saveUserInfo(submitInformation) {
        const { contact, firstName, lastName, password, dateOfBirth, gender, bio } = submitInformation;

        const username = `${firstName.toLowerCase()}.${lastName.toLowerCase()}`;
        const fullName = `${firstName} ${lastName}`;

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
            throw new Error('OTP không tồn tại');
        }

        if (otpData.otp !== otp || new Date() > otpData.expiresAt) {
            throw new Error('OTP không hợp lệ hoặc đã hết hạn', 400);
        }

        const user = User.findOne({ username: email.toLowerCase() });
        if (!user) {
            throw new CustomError('Không tìm thấy người dùng', 404);
        }
        await User.updateOne({ username: email.toLowerCase() }, { isActived: true });
        await redis.set(email, null);

        return { message: 'Xác minh OTP thành công', email };
    }

}

module.exports = new AuthService();