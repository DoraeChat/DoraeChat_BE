const QRService = require('../services/QRService');

const QRController = {
    async generateQRUser(req, res, next) {
        try {
            const { userId } = req.params;
            const qrCodeUrl = await QRService.generateQRUser(userId);
            res.json(qrCodeUrl);
        } catch (error) {
            next(error);
        }
    },

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