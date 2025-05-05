const MemberService = require("../services/MemberService");
const SOCKET_EVENTS = require("../constants/socketEvents");

class MemberController {
  constructor(socketHandler) {
    this.socketHandler = socketHandler;
    this.updateMemberName = this.updateMemberName.bind(this);
  }

  async isMember(req, res, next) {
    try {
      const { conversationId, userId } = req.query;

      const isMember = await MemberService.isMember(conversationId, userId);

      return res.status(200).json({
        message: "Check member successfully",
        data: isMember,
      });
    } catch (error) {
      next(error);
    }
  }

  async getByConversationId(req, res, next) {
    try {
      const { conversationId } = req.params;

      const member = await MemberService.getByConversationId(conversationId);

      return res.status(200).json({
        message: "Get member successfully",
        data: member,
      });
    } catch (error) {
      next(error);
    }
  }

  async getByConversationIdAndUserId(req, res, next) {
    try {
      const { conversationId, userId } = req.params;

      const member = await MemberService.getByConversationIdAndUserId(
        conversationId,
        userId
      );

      return res.status(200).json({
        message: "Get member successfully",
        data: member,
      });
    } catch (error) {
      next(error);
    }
  }

  async getByMemberId(req, res, next) {
    try {
      const { memberId } = req.params;

      const member = await MemberService.getByMemberId(memberId);

      return res.status(200).json({
        message: "Get member successfully",
        data: member,
      });
    } catch (error) {
      next(error);
    }
  }

  async updateMemberName(req, res, next) {
    try {
      const { conversationId, memberId } = req.params;
      const { name } = req.body;

      const member = await MemberService.updateMemberName(memberId, name);

      if (this.socketHandler) {
        this.socketHandler.emitToConversation(
          conversationId.toString(),
          SOCKET_EVENTS.UPDATE_MEMBER_NAME,
          member
        );
      }

      return res.status(200).json({
        message: "Update member successfully",
        data: member,
      });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = MemberController;
