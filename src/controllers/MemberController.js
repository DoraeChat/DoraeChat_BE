const MemberService = require('../services/MemberService');

const MemberController = {
    async isMember(req, res, next) {
        try {
            const { conversationId, userId } = req.query;

            const isMember = await MemberService.isMember(conversationId, userId);

            return res.status(200).json({
                message: 'Check member successfully',
                data: isMember,
            });
        } catch (error) {
            next(error);
            return res.status(500).json({
                message: error.message,
            });
        }
    },
}

module.exports = MemberController;