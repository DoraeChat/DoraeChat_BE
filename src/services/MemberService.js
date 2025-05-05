const Member = require("../models/Member");

const MemberService = {
  async isMember(conversationId, userId) {
    const member = await Member.isMember(conversationId, userId);
    if (!member) return false;
    return true;
  },

  async getByConversationId(conversationId) {
    const member = await Member.getByConversationId(conversationId);
    return member;
  },
  async getByConversationIdAndUserId(conversationId, userId) {
    const member = await Member.getByConversationIdAndUserId(
      conversationId,
      userId
    );
    return member;
  },
  async updateMemberUnActive(conversationId, userId) {
    const member = await Member.findOne({
      conversationId,
      userId,
    });
    member.active = false;
    member.leftAt = new Date();
    await member.save();
    return member;
  },

  async getByConversationIdAndUserId(conversationId, userId) {
    const member = await Member.getByConversationIdAndUserId(
      conversationId,
      userId
    );
    return member;
  },

  async getByMemberId(memberId) {
    const member = await Member.findById(memberId);
    if (!member) throw new NotFoundError("Member");
    return member;
  },

  async updateMemberName(memberId, name) {
    const member = await Member.findById(memberId);
    if (!member) throw new NotFoundError("Member");
    member.name = name;
    await member.save();
    return member;
  },
};

module.exports = MemberService;
