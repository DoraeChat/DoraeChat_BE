const AuthService = require('../services/AuthService');
const CustomError = require('../exceptions/CustomError');

class AuthController {
    // [POST] /api/auth/contact
    async registerContact(req, res, next) {
        try {
            const { contact } = req.body;
            const result = await AuthService.checkEmail(contact);
            res.status(200).json(result);
        } catch (err) {
            next(err);
        }
    }

    // [POST] /api/auth/information
    async submitInformation(req, res, next) {
        try {
            const submitInformation = req.body;
            const { contact } = submitInformation;
            const result = await AuthService.saveUserInfo(submitInformation);
            if (result.message === 'User information saved successfully') {
                res.status(200).json(result);
            } else {
                res.status(200).json('Save user information success');
            }
        } catch (err) {
            next(err);
        }
    }

    // [POST] /api/auth/verify-otp
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

    // [POST] /api/auth/resend-otp
    async resendOTP(req, res, next) {
        try {
            const { contact } = req.body;
            console.log(contact);
            const result = await AuthService.resendOTP(contact);
            res.status(200).json(result);
        } catch (err) {
            next(err);
        }
    }

    // [POST] /api/auth/login
    async login(req, res, next) {
        const { username, password } = req.body;
        let source = req.headers['user-agent'] || 'unknown';

        try {
            if (!username || !password) {
                throw new CustomError('Missing username or password', 400);
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

    async refreshToken(req, res, next) {
        try {
            const { refreshToken } = req.body;
            const source = req.headers['user-agent'] || 'unknown';
            const result = await AuthService.refreshToken(refreshToken, source);
            res.status(200).json(result);
        } catch (err) {
            next(err);
        }
    }

    async logout(req, res, next) {
        try {
            const { user, refreshToken } = req.body;
            const userData = typeof user === 'string' ? JSON.parse(user) : user;
            const source = req.headers['user-agent'] || 'unknown';
            const userId = userData._id;
            const result = await AuthService.logout(userId, refreshToken, source);
            res.status(200).json(result);
        } catch (err) {
            next(err);
        }
    }

    async verifyEmailResetPassword(req, res, next) {
        try {
            const { email } = req.body;
            const result = await AuthService.verifyEmailResetPassword(email);
            res.status(200).json(result);
        } catch (err) {
            next(err);
        }
    }

    async resetPassword(req, res, next) {
        try {
            const { email, otp, newPassword } = req.body;
            const result = await AuthService.resetPassword(email, otp, newPassword);
            res.status(200).json(result);
        } catch (err) {
            next(err);
        }
    }

    // [GET] /api/auth/qr
    // [GET] /api/auth/qr
    async getQRSession(req, res, next) {
        try {
            const source = req.headers['user-agent'] || 'unknown';
            const result = await AuthService.createQRSession(source);
            res.status(200).json(result);
        } catch (err) {
            next(err);
        }
    }

    // [POST] /api/auth/qr/verify
    async verifyQRSession(req, res, next) {
        try {
            const { sessionId, userId } = req.body;
            const result = await AuthService.verifyQRSession(sessionId, userId);
            res.status(200).json(result);
        } catch (err) {
            next(err);
        }
    }


    // [GET] /api/auth/qr/status/:sessionId
    async getQRSessionStatus(req, res, next) {
        try {
            const { sessionId } = req.params;
            const result = await AuthService.checkQRSession(sessionId);
            res.status(200).json(result);
        } catch (err) {
            next(err);
        }
    }

}

module.exports = new AuthController();