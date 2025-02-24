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

    async saveContact(email, sessionId) {
        const validateEmail = await this.validateEmail(email);
        if (validateEmail !== true) {
            throw new CustomError(validateEmail);
        } else {
            await redis.set(`temp_contact_${sessionId}`, { contact: email });
            return { message: 'Đã lưu thông tin liên lạc', sessionId };
        }
    }

    async saveUserInfo(submitInformation) {
        const { contact, sessionId, firstName, lastName, password, dateOfBirth, gender, bio } = submitInformation;
        const tempContact = await redis.get(`temp_contact_${sessionId}`);
        if (!tempContact || tempContact.contact !== contact) {
            throw new Error('Liên lạc không hợp lệ hoặc đã hết hạn', 400);
        }

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

        await user.save();
        return { message: 'Đã lưu thông tin người dùng', sessionId };
    }

    async generateAndSendOTP(email, sessionId) {
        const tempContact = await redis.get(`temp_contact_${sessionId}`);
        if (!tempContact || tempContact.contact !== email) {
            console.log(tempContact);
            console.log(email);
            throw new Error('Liên lạc không hợp lệ hoặc đã hết hạn', 400);
        }

        let otpData = await redis.get(`otp_${sessionId}`);
        if (!otpData) {
            const otp = otplib.authenticator.generate(6);
            const expiresAt = new Date(Date.now() + 2 * 60 * 1000);

            await redis.set(`otp_${sessionId}`, { otp, expiresAt }, parseInt(process.env.OTP_EXPIRATION));
            await this.transporter.sendMail({
                from: process.env.GOOGLE_USERNAME,
                to: email,
                subject: 'Mã xác minh DORA',
                text: `Mã xác minh của bạn là: ${otp}`,
            });
        }
        return { message: 'Đã gửi OTP qua email', sessionId };
    }

    async verifyOTP(email, sessionId, otp) {

        const otpData = await redis.get(`otp_${sessionId}`);
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
        await redis.set(`temp_contact_${sessionId}`, null);
        await redis.set(`otp_${sessionId}`, null);

        return { message: 'Xác minh OTP thành công', sessionId };
    }

}

module.exports = new AuthService();