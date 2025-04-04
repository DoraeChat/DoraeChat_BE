const QRService = require('../services/QRService');

const QRController = {
    // [GET] /api/qr/user/:userId 
    async generateQRUser(req, res, next) {
        try {
            const { userId } = req.params;
            const qrCodeUrl = await QRService.generateQRUser(userId);
            res.json(qrCodeUrl);
        } catch (error) {
            next(error);
        }
    },

    // [GET] /api/qr/group/:groupId
    async generateQRGroup(req, res, next) {
        try {
            const { groupId } = req.params;
            const qrCodeUrl = await QRService.generateQRGroup(groupId);
            res.json(qrCodeUrl);
        } catch (error) {
            next(error);
        }
    }
}

module.exports = QRController;    