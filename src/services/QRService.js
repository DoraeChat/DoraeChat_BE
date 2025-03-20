const QRCode = require("qrcode");
const UserService = require('./UserService');
const ConversationService = require('./ConversationService');

const QRService = {
    // generate qr code
    async generateQRUser(userId) {
        const user = await UserService.getById(userId);
        const qrData = JSON.stringify({type: 'user', userId: user._id });
        return await QRCode.toDataURL(qrData);
    },

    async generateQRGroup(groupId) {
        const group = await ConversationService.getById(groupId);
        const qrData = JSON.stringify({type: 'group', groupId: group._id });
        return await QRCode.toDataURL(qrData);
    }
}

module.exports = QRService;