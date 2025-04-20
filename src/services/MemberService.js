const Member = require("../models/Member");

const MemberService = {
    async isMember(conversationId, userId) {
        const member = await Member.isMember(
            conversationId,
            userId
        );
        if (!member) return false;
        return true;
    },
}

module.exports = MemberService;