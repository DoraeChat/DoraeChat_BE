const ConversationService = require("../services/ConversationService");
const MessageService = require("../services/MessageService");
const MemberService = require("../services/MemberService");
const UserService = require("../services/UserService");
const SOCKET_EVENTS = require("../constants/socketEvents");

class ConversationController {
  constructor(socketHandler) {
    this.socketHandler = socketHandler; // Nhận io từ Socket.IO
    this.updateAvatar = this.updateAvatar.bind(this);
    this.removeMemberFromConversation =
      this.removeMemberFromConversation.bind(this);
    this.addMembersToConversation = this.addMembersToConversation.bind(this);
    this.addManagersToConversation = this.addManagersToConversation.bind(this);
    this.removeManager = this.removeManager.bind(this);
    this.toggleJoinApproval = this.toggleJoinApproval.bind(this);
    this.acceptJoinRequest = this.acceptJoinRequest.bind(this);
    this.rejectJoinRequest = this.rejectJoinRequest.bind(this);
    this.acceptAllJoinRequests = this.acceptAllJoinRequests.bind(this);
    this.rejectAllJoinRequests = this.rejectAllJoinRequests.bind(this);
    this.getJoinRequests = this.getJoinRequests.bind(this);
    this.inviteUserToGroup = this.inviteUserToGroup.bind(this);
    this.createInviteLink = this.createInviteLink.bind(this);
    this.acceptInvite = this.acceptInvite.bind(this);
    this.createGroupConversation = this.createGroupConversation.bind(this);
    this.disbandConversation = this.disbandConversation.bind(this);
    this.hideConversationBeforeTime =
      this.hideConversationBeforeTime.bind(this);
    this.transferAdmin = this.transferAdmin.bind(this);
    this.leaveConversation = this.leaveConversation.bind(this);
    this.updateGroupName = this.updateGroupName.bind(this);
  }

  // [GET] /api/conversations - Lấy danh sách hội thoại của người dùng
  async getListByUserId(req, res) {
    try {
      const userId = req._id; // Lấy userId từ token
      const conversations = await ConversationService.getListByUserId(userId);
      res.status(200).json(conversations);
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  }
  // [POST] /api/conversations/individuals/:userId - Tạo hoặc lấy cuộc trò chuyện cá nhân
  async createOrGetIndividualConversation(req, res) {
    try {
      const userId = req._id;
      const userId2 = req.params.userId;
      if (userId === userId2) {
        return res
          .status(400)
          .json({ message: "Cannot create conversation with yourself" });
      }

      const conversation =
        await ConversationService.findOrCreateIndividualConversation(
          userId,
          userId2
        );
      res.status(201).json(conversation);
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  }
  //  [POST] /api/conversations/groups - Tạo cuộc trò chuyện nhóm
  async createGroupConversation(req, res) {
    try {
      const { name, members } = req.body;
      const leaderId = req._id; // Người tạo nhóm

      // Đảm bảo danh sách thành viên chứa leaderId
      if (!members.includes(leaderId)) {
        members.push(leaderId);
      }

      const conversation = await ConversationService.createGroupConversation(
        name,
        members,
        leaderId
      );
      // Phát sự kiện socket real-time createGroupConversation
      if (this.socketHandler) {
        this.socketHandler.emitToUsers(
          members,
          SOCKET_EVENTS.NEW_GROUP_CONVERSATION,
          conversation
        );
      }
      res.status(201).json(conversation);
    } catch (error) {
      res.status(400).json({ message: error.message });
    }
  }
  // [PATCH] /api/conversations/:id/name - Cập nhật tên nhóm
  async updateGroupName(req, res) {
    try {
      const { name } = req.body;
      const conversationId = req.params.id;
      const userId = req._id; // Người thực hiện đổi tên
      if (!name) {
        return res.status(400).json({ message: "Group name is required" });
      }

      const conversation = await ConversationService.updateGroupName(
        conversationId,
        name,
        userId
      );

      // phát sự kiện change name
      if (this.socketHandler) {
        this.socketHandler.emitToConversation(
          conversationId,
          SOCKET_EVENTS.UPDATE_NAME_CONVERSATION,
          { conversationId, name }
        );
      }

      res.status(200).json(conversation);
    } catch (error) {
      res.status(400).json({ message: error.message });
    }
  }
  // [GET] /api/conversations/:id - Lấy thông tin cuộc trò chuyện theo ID
  async getConversationById(req, res) {
    try {
      const conversation = await ConversationService.getConversationById(
        req.params.id
      );
      res.status(200).json(conversation);
    } catch (error) {
      res.status(404).json({ message: "Conversation not found" });
    }
  }
  // [PATCH] /api/conversations/:id/avatar - Cập nhật ảnh đại diện nhóm
  async updateAvatar(req, res) {
    try {
      const conversationId = req.params.id;
      const userId = req._id;
      const { avatar } = req.body;

      if (!avatar) {
        return res.status(400).json({ message: "Avatar URL is required" });
      }
      const updatedConversation = await ConversationService.updateAvatar(
        conversationId,
        userId,
        avatar
      );
      // Phát sự kiện real-time
      if (this.socketHandler) {
        const notifyMessage = await MessageService.getMessageById(
          updatedConversation.lastMessageId
        );
        this.socketHandler.emitToConversation(
          conversationId,
          SOCKET_EVENTS.RECEIVE_MESSAGE,
          notifyMessage
        );
      }
      res.status(200).json(updatedConversation);
    } catch (error) {
      res.status(400).json({ message: error.message });
    }
  }
  // [DELETE] /api/conversations/:id - Ẩn tin nhắn cũ bằng thời gian
  async hideConversationBeforeTime(req, res) {
    try {
      const conversationId = req.params.id;
      const userId = req._id; // Lấy từ token

      const result = await ConversationService.hideConversationBeforeTime(
        conversationId,
        userId
      );
      if (this.socketHandler) {
        this.socketHandler.emitToUser(
          userId,
          SOCKET_EVENTS.DELETE_CONVERSATION,
          result
        );
      }
      res.status(200).json(result);
    } catch (error) {
      res.status(400).json({ message: error.message });
    }
  }
  // [GET] /api/conversations/:id/members - Lấy danh sách thành viên trong hội thoại
  async getMembersByConversationId(req, res) {
    try {
      const conversationId = req.params.id;
      const userId = req._id;

      const members = await ConversationService.getMembersByConversationId(
        conversationId,
        userId
      );

      res.status(200).json(members);
    } catch (error) {
      res.status(400).json({ message: error.message });
    }
  } // [POST] /api/conversations/:id/members - Thêm thành viên vào nhóm
  async addMembersToConversation(req, res) {
    try {
      const conversationId = req.params.id;
      const userId = req._id;
      const { userIds } = req.body;

      if (!userIds || !Array.isArray(userIds) || userIds.length === 0) {
        return res
          .status(400)
          .json({ message: "userIds must be a non-empty array" });
      }

      const { addedMembers, notifyMessages } =
        await ConversationService.addMembersToConversation(
          conversationId,
          userId,
          userIds
        );

      if (this.socketHandler) {
        notifyMessages.forEach((message) => {
          const targetMember = addedMembers.find(
            (m) =>
              m.memberId.toString() === message.actionData.targetId.toString()
          );
          const contentForSelf = `Bạn đã được ${message.memberId.name} thêm vào nhóm`;
          this.socketHandler.emitToConversation(
            conversationId,
            SOCKET_EVENTS.RECEIVE_MESSAGE,
            {
              ...message.toObject(),
              content:
                targetMember.userId.toString() === userId.toString()
                  ? contentForSelf
                  : message.content,
            }
          );
        });
      }

      res.status(201).json(addedMembers);
    } catch (error) {
      res.status(400).json({ message: error.message });
    }
  }
  // [DELETE] /api/conversations/:id/members/:memberId - Xóa thành viên khỏi nhóm
  async removeMemberFromConversation(req, res) {
    try {
      const conversationId = req.params.id;
      const memberIdToRemove = req.params.memberId;
      const userId = req._id;

      const { removedMember, notifyMessage } =
        await ConversationService.removeMemberFromConversation(
          conversationId,
          userId,
          memberIdToRemove
        );

      if (this.socketHandler) {
        const contentForSelf = `You have been removed from the group by ${notifyMessage.memberId.name}`;
        this.socketHandler.emitToConversation(
          conversationId,
          SOCKET_EVENTS.RECEIVE_MESSAGE,
          {
            ...notifyMessage.toObject(),
            content:
              removedMember.userId.toString() === userId.toString()
                ? contentForSelf
                : notifyMessage.content,
          }
        );
        // this.io.to(removedMember.userId.toString()).emit("member-removed", {
        //   conversationId,
        //   message: "You have been removed from the group",
        // });
      }

      res.status(200).json({ removedMember });
    } catch (error) {
      res.status(400).json({ message: error.message });
    }
  }
  //[POST] /api/conversations/:id/managers - thêm  phó nhóm
  async addManagersToConversation(req, res) {
    try {
      const conversationId = req.params.id;
      const userId = req._id;
      const { memberIds } = req.body;

      if (!memberIds || !Array.isArray(memberIds) || memberIds.length === 0) {
        return res
          .status(400)
          .json({ message: "memberIds must be a non-empty array" });
      }

      const { addedManagers, notifyMessages } =
        await ConversationService.addManagersToConversation(
          conversationId,
          userId,
          memberIds
        );

      if (this.socketHandler) {
        notifyMessages.forEach((message) => {
          const targetManager = addedManagers.find(
            (m) =>
              m.memberId.toString() === message.actionData.targetId.toString()
          );
          const contentForSelf = `Bạn đã được ${message.memberId.name} thêm làm phó nhóm`;

          this.socketHandler.emitToConversation(
            conversationId,
            SOCKET_EVENTS.RECEIVE_MESSAGE,
            {
              ...message.toObject(),
              content:
                targetManager.userId.toString() === userId.toString()
                  ? contentForSelf
                  : message.content,
            }
          );
        });
      }

      res.status(201).json(addedManagers);
    } catch (error) {
      res.status(400).json({ message: error.message });
    }
  }
  // [DELETE] /api/conversations/:id/managers - Xóa phó nhóm
  async removeManager(req, res) {
    try {
      const { id: conversationId } = req.params;
      const { managerId } = req.body;
      const userId = req._id;

      if (!conversationId || !managerId) {
        return res
          .status(400)
          .json({ message: "Conversation ID and Manager ID are required" });
      }

      const { removedManager, notifyMessage } =
        await ConversationService.removeManagerFromConversation(
          conversationId,
          userId,
          managerId
        );

      // Phát sự kiện socket
      this.socketHandler.emitToConversation(
        conversationId,
        SOCKET_EVENTS.RECEIVE_MESSAGE,
        notifyMessage
      );

      res.status(200).json({ removedManager, notifyMessage });
    } catch (error) {
      res.status(400).json({ message: error.message });
    }
  } // PATCH /:id/acceptGroupRequest/:isStatus
  async toggleJoinApproval(req, res) {
    try {
      const { id: conversationId, isStatus } = req.params;
      const userId = req._id;

      const conversation = await ConversationService.toggleJoinApproval(
        conversationId,
        userId,
        isStatus
      );
      res.status(200).json(conversation);
    } catch (error) {
      res.status(400).json({ message: error.message });
    }
  }

  // POST /:id/groupRequest/accept/:userId
  async acceptJoinRequest(req, res) {
    try {
      const { id: conversationId, userId: requestingUserId } = req.params;
      const userId = req._id;

      const { newMember, notifyMessage } =
        await ConversationService.acceptJoinRequest(
          conversationId,
          userId,
          requestingUserId
        );

      this.socketHandler.emitToConversation(
        conversationId,
        SOCKET_EVENTS.RECEIVE_MESSAGE,
        { newMember, notifyMessage }
      );

      res.status(200).json({ newMember, notifyMessage });
    } catch (error) {
      res.status(400).json({ message: error.message });
    }
  }

  // DELETE /:id/groupRequest/reject/:userId
  async rejectJoinRequest(req, res) {
    try {
      const { id: conversationId, userId: requestingUserId } = req.params;
      const userId = req._id;

      const conversation = await ConversationService.rejectJoinRequest(
        conversationId,
        userId,
        requestingUserId
      );

      this.socketHandler.emitToUser(
        requestingUserId,
        SOCKET_EVENTS.RECEIVE_MESSAGE,
        { conversationId }
      );

      res.status(200).json(conversation);
    } catch (error) {
      res.status(400).json({ message: error.message });
    }
  }

  // POST /:id/groupRequest/accept
  async acceptAllJoinRequests(req, res) {
    try {
      const { id: conversationId } = req.params;
      const userId = req._id;

      const { newMembers, notifyMessage } =
        await ConversationService.acceptAllJoinRequests(conversationId, userId);

      this.socketHandler.emitToConversation(
        conversationId,
        SOCKET_EVENTS.RECEIVE_MESSAGE,
        { newMembers, notifyMessage }
      );

      res.status(200).json({ newMembers, notifyMessage });
    } catch (error) {
      res.status(400).json({ message: error.message });
    }
  }

  // DELETE /:id/groupRequest/reject
  async rejectAllJoinRequests(req, res) {
    try {
      const { id: conversationId } = req.params;
      const userId = req._id;

      const conversation = await ConversationService.rejectAllJoinRequests(
        conversationId,
        userId
      );

      this.socketHandler.emitToConversation(
        conversationId,
        SOCKET_EVENTS.RECEIVE_MESSAGE,
        { conversationId }
      );

      res.status(200).json(conversation);
    } catch (error) {
      res.status(400).json({ message: error.message });
    }
  }

  // GET /:id/groupRequest
  async getJoinRequests(req, res) {
    try {
      const { id: conversationId } = req.params;
      const userId = req._id;

      const joinRequests = await ConversationService.getJoinRequests(
        conversationId,
        userId
      );
      res.status(200).json(joinRequests);
    } catch (error) {
      res.status(400).json({ message: error.message });
    }
  }
  // POST /:id/invite
  async inviteUserToGroup(req, res) {
    try {
      const { id: conversationId } = req.params;
      const { inviteeId } = req.body;
      const userId = req._id;

      const result = await ConversationService.inviteUserToGroup(
        conversationId,
        userId,
        inviteeId
      );

      if (result.newMember) {
        // Nếu tự động tham gia
        this.socketHandler.emitToConversation(
          conversationId,
          SOCKET_EVENTS.MEMBER_JOINED,
          { newMember: result.newMember, notifyMessage: result.notifyMessage }
        );
      } else {
        // Nếu tạo yêu cầu tham gia
        this.socketHandler.emitToUser(
          inviteeId,
          SOCKET_EVENTS.INVITE_RECEIVED,
          { conversationId, invite: result.invite }
        );
      }

      res.status(201).json(result);
    } catch (error) {
      res.status(400).json({ message: error.message });
    }
  }

  // POST /:id/invite/link
  async createInviteLink(req, res) {
    try {
      const { id: conversationId } = req.params;
      const userId = req._id;

      const { inviteLink, invite } = await ConversationService.createInviteLink(
        conversationId,
        userId
      );
      res.status(201).json({ inviteLink, invite });
    } catch (error) {
      res.status(400).json({ message: error.message });
    }
  }

  // POST /join/:token
  async acceptInvite(req, res) {
    try {
      const { token } = req.params;
      const userId = req._id;

      const { newMember, notifyMessage, status, conversationId } =
        await ConversationService.acceptInvite(token, userId);

      if (newMember) {
        // Nếu tự động tham gia
        this.socketHandler.emitToConversation(
          conversationId,
          SOCKET_EVENTS.MEMBER_JOINED,
          { newMember, notifyMessage }
        );
      } else {
        // Nếu tạo yêu cầu tham gia
        this.socketHandler.emitToConversation(
          conversationId,
          SOCKET_EVENTS.JOIN_REQUEST_ADDED,
          { userId }
        );
      }

      res.status(200).json({ newMember, notifyMessage, status });
    } catch (error) {
      res.status(400).json({ message: error.message });
    }
  }

  async disbandConversation(req, res) {
    try {
      const { id } = req.params;
      const userId = req._id;
      const conversation = await ConversationService.getConversationById(id);
      await ConversationService.disbandConversation(id, userId);
      res.status(200).json({ message: "Conversation disbanded successfully" });

      this.socketHandler.emitToConversation(
        id,
        SOCKET_EVENTS.CONVERSATION_DISBANDED,
        { conversationId: id, userId }
      );
    } catch (error) {
      res.status(400).json({ message: error.message });
    }
  }

  async leaveConversation(req, res) {
    try {
      const { id } = req.params;
      const userId = req._id;
      console.log("success", id, userId);
      const { member, notifyMessage, disbanded } =
        await ConversationService.leaveConversation(id, userId);
      if (this.socketHandler) {
        this.socketHandler.emitToConversation(
          id,
          SOCKET_EVENTS.LEAVE_CONVERSATION,
          {
            member,
            notifyMessage,
            disbanded,
          }
        );
      }
      res.status(200).json({ member, notifyMessage });
    } catch (error) {
      res.status(400).json({ message: error.message });
    }
  }
  async transferAdmin(req, res) {
    try {
      const { id } = req.params;
      const { newAdminId } = req.body;
      const userId = req._id;
      const { newAdmin, notifyMessage } =
        await ConversationService.transferAdmin(id, userId, newAdminId);
      if (this.socketHandler) {
        this.socketHandler.emitToConversation(
          id,
          SOCKET_EVENTS.TRANSFER_ADMIN,
          {
            newAdmin,
            notifyMessage,
          }
        );
      }

      res.status(200).json({ newAdmin, notifyMessage });
    } catch (error) {
      res.status(400).json({ message: error.message });
    }
  }
}
module.exports = ConversationController;
