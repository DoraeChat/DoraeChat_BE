const AuthService = require('../services/AuthService');
const CustomError = require('../exceptions/CustomError');

class AuthController {
    async registerContact(req, res) {
        try {
            const { contact } = req.body;
            const result = await AuthService.validate(contact);
            res.status(200).json(result);
        } catch (error) {
            console.error('Lỗi trong registerContact:', error);
            let status = 500;
            let errorMessage = 'Lỗi máy chủ nội bộ';
            if (error instanceof CustomError) {
                status = error.status || 500;
                errorMessage = error.cleanMessage;
            }
            res.status(status).json({ error: errorMessage });
        }
    }

    async submitInformation(req, res) {
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
        } catch (error) {
            console.error('Lỗi trong submitInformation:', error);
            let status = 500;
            let errorMessage = 'Lỗi máy chủ nội bộ';
            if (error instanceof CustomError) {
                status = error.status || 500;
                errorMessage = error.cleanMessage;
            }
            res.status(status).json({ error: errorMessage });
        }
    }

    async verifyOTP(req, res) {
        try {
            const { contact, otp } = req.body;
            console.log(req.body);
            const result = await AuthService.verifyOTP(contact, otp);
            res.status(200).json(result);
        } catch (error) {
            console.error('Lỗi trong verifyOTP:', error);
            let status = 500;
            let errorMessage = 'Lỗi máy chủ nội bộ';
            if (error instanceof CustomError) {
                status = error.status || 500;
                errorMessage = error.cleanMessage;
            }
            res.status(status).json({ error: errorMessage });
        }
    }

    async resendOTP(req, res) {
        try {
            const { contact } = req.body;
            const result = await AuthService.resendOTP(contact);
            res.status(200).json(result);
        } catch (error) {
            console.error('Lỗi trong resendOTP:', error);
            let status = 500;
            let errorMessage = 'Lỗi máy chủ nội bộ';
            if (error instanceof CustomError) {
                status = error.status || 500;
                errorMessage = error.cleanMessage;
            }
            res.status(status).json({ error: errorMessage });
        }
    }

}

module.exports = new AuthController();