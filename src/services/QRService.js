const QRCode = require("qrcode");
const UserService = require('./UserService');
const ConversationService = require('./ConversationService');

const QRService = {
    // generate qr code
    async generateQRUser(userId) {
        const user = await UserService.getById(userId);
        const qrData = `https://localhost:3001/api/qr/group/${user._id}`;
        return await QRCode.toDataURL(qrData);
    },

    async generateQRGroup(groupId) {
        const group = await ConversationService.getById(groupId);
        const qrData = `https://localhost:3001/api/qr/group/${group._id}`;
        return await QRCode.toDataURL(qrData);
    }
}

module.exports = QRService;