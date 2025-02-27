const AuthService = require('../services/AuthService');
const CustomError = require('../exceptions/CustomError');

class AuthController {
    async registerContact(req, res, next) {
        try {
            const { contact } = req.body;
            const result = await AuthService.validate(contact);
            res.status(200).json(result);
        } catch (err) {
            next(err);
        }
    }

    async submitInformation(req, res, next) {
        try {
            const submitInformation = req.body;
            const { contact } = submitInformation;
            const result = await AuthService.saveUserInfo(submitInformation);
            if (result.message === 'Đã lưu thông tin người dùng') {
                await AuthService.generateAndSendOTP(contact);
                res.status(200).json(result);
            } else {
                res.status(200).json('Lưu thông tin người dùng không thành công');
            }
        } catch (err) {
            next(err);
        }
    }

    async verifyOTP(req, res, next) {
        try {
            const { contact, otp } = req.body;
            console.log(req.body);
            const result = await AuthService.verifyOTP(contact, otp);
            res.status(200).json(result);
        } catch (err) {
            next(err);
        }
    }

    async resendOTP(req, res, next) {
        try {
            const { contact } = req.body;
            const result = await AuthService.resendOTP(contact);
            res.status(200).json(result);
        } catch (err) {
            next(err);
        }
    }

    async login(req, res, next) {
        const { username, password } = req.body;
        let source = req.headers['user-agent'] || 'unknown';

        try {
            if (!username || !password) {
                throw new CustomError('Thiếu username hoặc password', 400);
            }

            source = source.substring(0, 5050);

            const result = await AuthService.login(username, password, source);

            res.status(200).json({
                success: true,
                data: {
                    user: result.user,
                    token: result.token,
                    refreshToken: result.refreshToken
                }
            });
        } catch (err) {
            next(err);
        }
    }
}

module.exports = new AuthController();