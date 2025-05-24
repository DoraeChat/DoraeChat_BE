require('dotenv').config();
const User = require('../models/User');
const redis = require('../config/redis');
const otplib = require('otplib');
const nodemailer = require('nodemailer');
const CustomError = require('../exceptions/CustomError');
const userValidate = require('../validates/userValidate');
const tokenUtils = require('../utils/tokenUtils');
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');

class AuthService {
    constructor() {
        this.transporter = nodemailer.createTransport({
            service: 'gmail',
            auth: { user: process.env.GOOGLE_USERNAME, pass: process.env.GOOGLE_APP_PASSWORD },
        });
    }

    async checkEmail(email) {
        if (!email) {
            throw new CustomError("Email không được để trống", 400);
        }

        email = email.toLowerCase().trim();

        if (!userValidate.validateEmail(email)) {
            throw new CustomError("Email không hợp lệ", 400);
        }

        const exists = await User.existsByUsername(email);
        if (exists) {
            throw new CustomError("Email đã đăng ký", 400);
        }

        return { message: 'Email hợp lệ để đăng ký' };
    }

    randomColor() {
        const colors = [
            'red',
            'blue',
            'green',
            'yellow',
            'purple',
            'pink',
            'orange',
            'teal',
            'cyan',
            'white',
            'black'
        ];

        const randomIndex = Math.floor(Math.random() * colors.length);
        return colors[randomIndex];
    }

    async saveUserInfo(submitInformation) {
        try {
            // Kiểm tra toàn bộ thông tin đầu vào
            userValidate.validateSubmitInfo(submitInformation);

            const { contact, firstName, lastName, password, dateOfBirth, gender, bio } = submitInformation;
            const normalizedContact = contact.toLowerCase().trim();

            // Kiểm tra email có tồn tại chưa
            const exists = await User.existsByUsername(normalizedContact);
            if (exists) {
                throw new CustomError("Email đã đăng ký", 400);
            }
            const genderBoolean = gender === 'male' ? true : false;
            // Tạo đối tượng user
            const user = new User({
                username: normalizedContact,
                name: `${firstName.trim()} ${lastName.trim()}`,
                password,
                dateOfBirth: new Date(dateOfBirth),
                genderBoolean,
                bio,
                isActived: false,
                avatarColor: this.randomColor(),
            });

            await user.save();
            await this.generateAndSendOTP(normalizedContact);
            return { message: 'Đã lưu thông tin người dùng' };
        } catch (error) {
            if (error instanceof CustomError) throw error;
            throw new CustomError(`Lỗi khi lưu thông tin: ${error.message}`, 400);
        }
    }

    async generateAndSendOTP(email) {
        try {
            email = email.toLowerCase().trim();

            // Kiểm tra người dùng tồn tại
            const user = await User.findOne({ username: email });
            if (!user) {
                throw new CustomError('Không tìm thấy người dùng', 404);
            }

            // Tạo OTP an toàn
            const secret = otplib.authenticator.generateSecret();
            const otp = otplib.authenticator.generate(secret);

            // Thời gian hết hạn
            const expiresMinutes = parseInt(process.env.OTP_EXPIRE_MINUTES) || 120;
            const expiresAt = new Date(Date.now() + expiresMinutes * 60 * 1000);

            // Lưu vào Redis
            const otpData = {
                otp,
                expiresAt: expiresAt.toISOString()
            };

            // Redis.set nhận tham số đơn vị giây
            await redis.set(email, otpData, expiresMinutes);

            // Gửi OTP qua email
            await this.transporter.sendMail({
                from: 'DoraChat',
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
        } catch (error) {
            if (error instanceof CustomError) throw error;
            throw new CustomError(`Lỗi khi gửi OTP: ${error.message}`, 500);
        }
    }

    async resendOTP(email) {
        email = email.toLowerCase().trim();

        // Kiểm tra người dùng tồn tại
        const user = await User.findOne({ username: email });
        if (!user) {
            throw new CustomError('Không tìm thấy người dùng', 404);
        }

        return this.generateAndSendOTP(email);
    }

    async verifyOTP(email, otp) {
        try {
            if (!email || !otp) {
                throw new CustomError('Email và OTP không được để trống', 400);
            }

            email = email.toLowerCase().trim();

            // Kiểm tra OTP có đúng định dạng không
            if (!userValidate.validateOtpAndUsername(email, otp)) {
                throw new CustomError('Thông tin xác nhận không đúng định dạng', 400);
            }

            // Lấy OTP từ Redis
            const otpData = await redis.get(email);
            if (!otpData) {
                throw new CustomError('OTP không tồn tại hoặc đã hết hạn', 400);
            }

            // So sánh OTP và kiểm tra hết hạn
            if (otpData.otp !== otp) {
                throw new CustomError('OTP không chính xác', 400);
            }

            if (new Date() > new Date(otpData.expiresAt)) {
                throw new CustomError('OTP đã hết hạn', 400);
            }

            // Tìm và kích hoạt người dùng
            const user = await User.findOne({ username: email });
            if (!user) {
                throw new CustomError('Không tìm thấy người dùng', 404);
            }

            // Kích hoạt tài khoản
            await User.updateOne({ username: email }, { isActived: true });

            // Xóa OTP khỏi Redis
            await redis.set(email, null, 1);

            return {
                message: 'Xác minh OTP thành công',
                email,
                userId: user._id
            };
        } catch (error) {
            if (error instanceof CustomError) throw error;
            throw new CustomError(`Lỗi khi xác thực OTP: ${error.message}`, 400);
        }
    }

    async login(username, password, source) {
        try {
            if (!source || typeof source !== 'string') {
                throw new CustomError('Nguồn không hợp lệ', 400);
            }

            // Giới hạn độ dài của source
            source = source.substring(0, 255);

            username = username.toLowerCase().trim();

            // Xác thực thông tin đăng nhập
            userValidate.validateLogin(username, password);

            let user;
            try {
                user = await User.findByCredentials(username, password);
            } catch (error) {
                if (error.message.includes('Tài khoản chưa được kích hoạt')) {
                    await this.generateAndSendOTP(username);
                    throw new CustomError('Tài khoản chưa được kích hoạt. Đã gửi lại OTP.', 400);
                }
                throw error;
            }

            // Tạo token
            const tokens = await this.generateAndUpdateAccessTokenAndRefreshToken(user._id, source);

            return {
                user: {
                    _id: user._id,
                    username: user.username,
                    name: user.name,
                    avatar: user.avatar,
                    gender: user.gender
                },
                ...tokens
            };
        } catch (error) {
            if (error instanceof CustomError) throw error;
            throw new CustomError(`Lỗi đăng nhập: ${error.message}`, 401);
        }
    }

    async generateAndUpdateAccessTokenAndRefreshToken(_id, source) {
        try {
            // Tạo access token
            const token = tokenUtils.generateToken(
                { _id, source },
                process.env.JWT_LIFE_ACCESS_TOKEN
            );

            // Tạo refresh token
            const refreshToken = tokenUtils.generateToken(
                { _id, source },
                process.env.JWT_LIFE_REFRESH_TOKEN
            );

            // Xóa token cũ từ cùng nguồn
            await User.updateOne({ _id }, { $pull: { refreshTokens: { source } } });

            // Thêm token mới
            await User.updateOne(
                { _id },
                { $push: { refreshTokens: { token: refreshToken, source, createdAt: new Date() } } }
            );

            return { token, refreshToken };
        } catch (error) {
            throw new CustomError(`Lỗi tạo token: ${error.message}`, 500);
        }
    }

    async refreshToken(refreshToken, source) {
        try {
            if (!refreshToken || !source) {
                throw new CustomError('Thiếu thông tin token hoặc nguồn', 400);
            }

            source = source.substring(0, 255);

            // Xác thực refresh token
            const decoded = tokenUtils.verifyToken(refreshToken);
            if (!decoded || !decoded._id) {
                throw new CustomError('Token không hợp lệ', 401);
            }

            // Tìm user có token
            const user = await User.findOne({
                _id: decoded._id,
                'refreshTokens.token': refreshToken,
                'refreshTokens.source': source
            });

            if (!user) {
                throw new CustomError('Token không hợp lệ', 401);
            }

            // Tạo token mới
            const tokens = await this.generateAndUpdateAccessTokenAndRefreshToken(user._id, source);

            return {
                user: {
                    _id: user._id,
                    username: user.username,
                    name: user.name
                },
                ...tokens
            };
        } catch (error) {
            if (error instanceof CustomError) throw error;
            throw new CustomError('Không thể làm mới token', 401);
        }
    }

    async logout(_id, refreshToken, source) {
        try {
            if (!_id || !refreshToken || !source) {
                throw new CustomError('Thiếu thông tin người dùng hoặc token', 400);
            }

            source = source.substring(0, 255);

            // Xóa refresh token
            await User.updateOne(
                { _id },
                { $pull: { refreshTokens: { token: refreshToken, source } } }
            );

            return { message: 'Đăng xuất thành công' };
        } catch (error) {
            if (error instanceof CustomError) throw error;
            throw new CustomError('Không thể đăng xuất', 500);
        }
    }

    async verifyEmailResetPassword(email) {
        if (!email) {
            throw new CustomError("Email không được để trống", 400);
        }

        email = email.toLowerCase().trim();

        if (!userValidate.validateEmail(email)) {
            throw new CustomError("Email không hợp lệ", 400);
        }

        const exists = await User.existsByUsername(email);
        if (!exists) {
            throw new CustomError("Email chưa đăng ký", 400);
        }
        await this.generateAndSendOTP(email);
        return { message: 'Email hợp lệ để đặt lại mật khẩu' };
    }


    async resetPassword(email, otp, newPassword) {
        try {
            if (!email || !otp || !newPassword) {
                throw new CustomError('Thiếu thông tin xác thực', 400);
            }

            email = email.toLowerCase().trim();

            // Kiểm tra OTP có đúng định dạng không
            if (!userValidate.validateOtpAndUsername(email, otp)) {
                throw new CustomError('Thông tin xác nhận không đúng định dạng', 400);
            }

            // Lấy OTP từ Redis
            const otpData = await redis.get(email);
            if (!otpData) {
                throw new CustomError('OTP không tồn tại hoặc đã hết hạn', 400);
            }

            // So sánh OTP và kiểm tra hết hạn
            if (otpData.otp !== otp) {
                throw new CustomError('OTP không chính xác', 400);
            }

            if (new Date() > new Date(otpData.expiresAt)) {
                throw new CustomError('OTP đã hết hạn', 400);
            }

            // Tìm người dùng
            const user = await User.findOne({ username: email });
            if (!user) {
                throw new CustomError('Không tìm thấy người dùng', 404);
            }


            // Kiểm tra mật khẩu mới
            if (!userValidate.validatePassword(newPassword)) {
                throw new CustomError('Mật khẩu không hợp lệ', 400);
            }

            // Kiểm tra mật khẩu mới có giống mật khẩu cũ không
            const isPasswordMatch = await bcrypt.compare(newPassword, user.password);
            if (isPasswordMatch) {
                throw new CustomError('Mật khẩu mới không được giống mật khẩu cũ', 400);
            }

            // Lưu mật khẩu mới
            user.password = newPassword;
            await user.save();

            // Xóa OTP khỏi Redis
            await redis.set(email, null, 1);

            // Xóa refresh token, cập nhật thời gian revoke token
            const id = user._id;
            await User.updateOne(
                { id },
                { $set: { timeRevokeToken: new Date(), refreshTokens: [] } }
            );
            return { message: 'Đặt lại mật khẩu thành công' };
        } catch (error) {
            if (error instanceof CustomError) throw error;
            throw new CustomError(`Lỗi khi đặt lại mật khẩu: ${error.message}`, 400);
        }

    }

    async createQRSession(source = 'web') {
        const sessionId = uuidv4();
        const sessionData = JSON.stringify({
            status: 'PENDING',
            source,
            createdAt: Date.now(),
            userId: null,
        });

        console.log(`qr-session:${sessionId}`);
        await redis.set(`qr-session:${sessionId}`, sessionData, 180);

        return {
            sessionId,
            qrContent: `qrlogin:${sessionId}`,
            source,
            expiresIn: 180,
        };
    }



    async verifyQRSession(sessionId, userId) {
        const existing = await redis.get(`qr-session:${sessionId}`);
        if (!existing || existing === 'null') {
            throw new CustomError('Session không tồn tại hoặc đã hết hạn', 400);
        }

        const user = await User.findById(userId);
        if (!user) throw new CustomError('Không tìm thấy người dùng', 404);
        if (!user.isActived) throw new CustomError('Tài khoản chưa được kích hoạt', 401);

        const sessionData = JSON.parse(existing);
        const source = sessionData.source || 'qr';

        const tokens = await this.generateAndUpdateAccessTokenAndRefreshToken(user._id, source);

        // Cập nhật trạng thái thành VERIFIED
        const updatedSession = JSON.stringify({
            status: 'VERIFIED',
            source,
            userId: user._id,
            createdAt: sessionData.createdAt,
        });

        await redis.set(`qr-session:${sessionId}`, updatedSession, 30);

        console.log(`QR session verified: ${sessionId} by user ${user.username}`);
        return {
            ...tokens,
            user: {
                _id: user._id,
                username: user.username,
                name: user.name,
                avatar: user.avatar,
                gender: user.gender,
            },
        };
    }

    async checkQRSession(sessionId) {
        const value = await redis.get(`qr-session:${sessionId}`);
        if (!value || value === 'null') {
            return { status: 'EXPIRED' };
        }

        try {
            const session = JSON.parse(value);

            if (session.status === 'VERIFIED') {
                const user = await User.findById(session.userId);
                const tokens = await this.generateAndUpdateAccessTokenAndRefreshToken(session.userId, session.source);

                // Có thể xóa session nếu muốn
                await redis.del(`qr-session:${sessionId}`);

                return {
                    status: 'VERIFIED',
                    user: {
                        _id: user._id,
                        username: user.username,
                        name: user.name,
                        avatar: user.avatar,
                        gender: user.gender,
                    },
                    ...tokens,
                };
            }

            return { status: 'PENDING' };
        } catch (err) {
            return { status: 'ERROR', message: 'Dữ liệu QR không hợp lệ' };
        }
    }


}

module.exports = new AuthService();