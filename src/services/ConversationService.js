const Conversation = require("../models/Conversation");
const Member = require("../models/Member");
const User = require("../models/User");
const Message = require("../models/Message");
const Channel = require("../models/Channel");
const ConversationService = {
  // Lấy danh sách hội thoại của người dùng
  async getListByUserId(userId) {
    // đã conver member
    return await Conversation.getListByUserId(userId);
  },
  // 🔍 Kiểm tra xem cuộc trò chuyện cá nhân giữa 2 user có tồn tại không
  async findOrCreateIndividualConversation(userId1, userId2) {
    // Kiểm tra nếu đã có cuộc trò chuyện 1-1 giữa hai user
    // đã conver member
    let conversation = await Conversation.existsIndividualConversation(
      userId1,
      userId2
    );
    if (conversation) {
      return await Conversation.getById(conversation);
    }

    // Nếu chưa có, tạo cuộc trò chuyện mới
    conversation = new Conversation({
      // members: [userId1, userId2],
      type: false, // Chat cá nhân
    });
    // Lấy thông tin User để lấy name
    const user1 = await User.getSummaryById(userId1);
    const user2 = await User.getSummaryById(userId2);

    // Tạo Member với name từ User
    const membersToCreate = [
      {
        conversationId: conversation._id,
        userId: userId1,
        name: user1.name,
      },
      {
        conversationId: conversation._id,
        userId: userId2,
        name: user2.name,
      },
    ];
    const createdMembers = await Member.insertMany(membersToCreate);
    // Thêm các thành viên vào hội thoại
    conversation.members = createdMembers.map((member) => member._id);
    await conversation.save();
    return conversation;
  },
  // tạo cuộc trò chuyện nhóm
  async createGroupConversation(name, members, leaderId) {
    if (members.length < 2) {
      throw new Error("Group conversation must have at least 2 members");
    }
    const conversation = new Conversation({
      name,
      // leaderId, // Người tạo nhóm
      type: true, // Chat nhóm
    });
    // Lấy thông tin tất cả User trong members
    const users = await User.find({ _id: { $in: members }, isActived: true })
      .select("_id name")
      .lean();
    if (users.length !== members.length) {
      throw new Error("One or more users not found");
    }
    // Tạo map để ánh xạ userId với name
    const userMap = new Map(
      users.map((user) => [user._id.toString(), user.name])
    );

    // Tạo Member với name từ User
    const membersToCreate = members.map((userId) => ({
      conversationId: conversation._id,
      userId,
      name: userMap.get(userId.toString()) || "Unknown", // Mặc định "Unknown" nếu không tìm thấy
    }));
    const createdMembers = await Member.insertMany(membersToCreate);

    // Lấy memberId từ các Member vừa tạo
    const memberIds = createdMembers.map((member) => member._id);
    const leaderMember = createdMembers.find(
      (member) => member.userId.toString() === leaderId.toString()
    );
    // Tạo channel mặc định "Main"
    const defaultChannel = new Channel({
      name: "Main",
      conversationId: conversation._id,
    });
    await defaultChannel.save();
    // Cập nhật members trong Conversation
    conversation.members = memberIds;
    conversation.leaderId = leaderMember._id; // Cập nhật leaderId từ memberId
    await conversation.save();
    return {
      conversation,
      defaultChannel,
    };
  },
  // 🔹 Đổi tên nhóm hội thoại
  async updateGroupName(conversationId, newName, userId) {
    const conversation = await Conversation.findById(conversationId);
    const member = await Member.getByConversationIdAndUserId(
      conversationId,
      userId
    );
    if (!conversation) {
      throw new Error("Conversation not found");
    }

    if (!conversation.type) {
      throw new Error("Cannot rename an individual conversation");
    }

    // Kiểm tra xem user có phải là leader hoặc quản trị viên không
    if (!this.checkManager(conversation, member._id.toString())) {
      throw new Error("You do not have permission to rename this group");
    }
    conversation.name = newName;
    await conversation.save();
    return conversation;
  },
  // 🔹 Cập nhật ảnh đại diện nhóm hội thoại
  async updateAvatar(conversationId, userId, avatar) {
    const conversation = await Conversation.findById(conversationId);
    if (!conversation) {
      throw new Error("Conversation not found");
    }
    // Tìm memberId từ userId
    const member = await Member.getByConversationIdAndUserId(
      conversationId,
      userId
    );
    if (!member) {
      throw new Error("You are not a member of this conversation");
    }

    // Kiểm tra quyền: Chỉ leader hoặc manager được cập nhật avatar
    if (!this.checkManager(conversation, member._id.toString())) {
      throw new Error("You do not have permission to update the avatar");
    }
    // Cập nhật avatar
    conversation.avatar = avatar;
    await conversation.save();
    // Tạo tin nhắn notify
    const notifyMessage = await Message.createMessage({
      memberId: member._id,
      content: `${member.name} đã thay đổi ảnh đại diện của nhóm`,
      type: "NOTIFY",
      conversationId: conversation._id,
    });
    // Cập nhật lastMessageId trong Conversation
    conversation.lastMessageId = notifyMessage._id;
    await conversation.save();
    return conversation;
  },
  // Lấy hội thoại theo ID
  async getConversationById(conversationId) {
    return await Conversation.getById(conversationId);
  },
  async getByIdAndUserId(conversationId, userId) {
    return await Conversation.getByIdAndUserId(conversationId, userId);
  },
  checkManager(conversation, id) {
    let isManager = false;
    if (
      conversation.leaderId.toString() === id ||
      conversation.managerIds.includes(id)
    ) {
      isManager = true;
    }
    return isManager;
  },
  // ( ẩn tin nhắn trong hội thoại cho member có nhu cầu xóa hội thoại)
  async hideConversationBeforeTime(conversationId, userId) {
    const conversation = await Conversation.findById(conversationId);
    if (!conversation) {
      throw new Error("Conversation not found");
    }
    // Tìm memberId từ userId
    const member = await Member.getByConversationIdAndUserId(
      conversationId,
      userId
    );
    if (!member) {
      throw new Error("You are not a member of this conversation");
    }
    // Ghi nhận thời gian hiện tại vào hideBeforeTime
    member.hideBeforeTime = new Date();
    await member.save();
    return {
      message:
        "Conversation messages before this time have been hidden for you",
    };
  },
  // Lấy danh sách thành viên trong hội thoại
  async getMembersByConversationId(conversationId, userId) {
    // Kiểm tra hội thoại
    const conversation = await Conversation.findById(conversationId);
    if (!conversation) {
      throw new Error("Conversation not found");
    }

    // Kiểm tra xem userId có phải thành viên không
    const requestingMember = await Member.getByConversationIdAndUserId(
      conversationId,
      userId
    );
    if (!requestingMember) {
      throw new Error("You are not a member of this conversation");
    }
    // Lấy danh sách thành viên
    const members = await Member.getMembersWithUserInfo(conversationId);

    const memberList = members.map((member) => ({
      memberId: member._id,
      userId: member.userId._id,
      name: member.name,
      avatar: member.userId.avatar,
      avatarColor: member.userId.avatarColor,
    }));

    return memberList;
  },
  // Thêm thành viên vào hội thoại
  async addMembersToConversation(conversationId, userId, newUserIds) {
    // Kiểm tra xem hội thoại có tồn tại không
    const conversation = await Conversation.findById(conversationId);
    if (!conversation) {
      throw new Error("Conversation not found");
    }
    if (!conversation.type) {
      throw new Error("Cannot add members to an individual conversation");
    }
    // Kiểm tra xem người dùng có phải là thành viên không
    const requestingMember = await Member.findOne({ conversationId, userId });
    if (!requestingMember) {
      throw new Error("You are not a member of this conversation");
    }

    if (!this.checkManager(conversation, requestingMember._id.toString())) {
      throw new Error("You do not have permission to add members");
    }
    // Kiểm tra xem các userId có tồn tại và hoạt động không
    const users = await User.find({ _id: { $in: newUserIds }, isActived: true })
      .select("_id name")
      .lean();

    if (users.length !== newUserIds.length) {
      throw new Error("One or more users not found or inactive");
    }
    // Tạo map để ánh xạ userId với name
    const userMap = new Map(
      users.map((user) => [user._id.toString(), user.name])
    );
    // Kiểm tra xem các thành viên đã tồn tại trong hội thoại chưa
    const existingMembers = await Member.find({
      conversationId,
      userId: { $in: newUserIds },
    });
    // Lấy danh sách userId của các thành viên đã tồn tại
    const existingUserIds = existingMembers.map((m) => m.userId.toString());
    const userIdsToAdd = newUserIds.filter(
      (id) => !existingUserIds.includes(id.toString())
    );
    const membersToReactivate = existingMembers.filter((m) => !m.active);

    // Tái kích hoạt các Member đã tồn tại nhưng không active
    if (membersToReactivate.length > 0) {
      await Member.updateMany(
        { _id: { $in: membersToReactivate.map((m) => m._id) } },
        { active: true }
      );
    }
    // Tạo các thành viên mới
    const membersToCreate = userIdsToAdd.map((userId) => ({
      conversationId,
      userId,
      name: userMap.get(userId.toString()) || "Unknown",
      active: true,
    }));
    // Tạo các thành viên mới trong cơ sở dữ liệu
    const newMembers =
      membersToCreate.length > 0
        ? await Member.insertMany(membersToCreate)
        : [];
    const allAddedMembers = [...membersToReactivate, ...newMembers];
    conversation.members.push(...newMembers.map((m) => m._id));
    if (allAddedMembers.length === 0) {
      throw new Error("All provided users are already active members");
    }
    // Cập nhật danh sách thành viên trong hội thoại
    const channelId = await this.getDefaultChannelId(conversationId);

    // Tạo tin nhắn NOTIFY riêng cho từng thành viên được thêm
    const notifyMessages = await Promise.all(
      allAddedMembers.map(async (newMember) => {
        const message = await Message.createMessage({
          memberId: requestingMember._id, // Người gửi (A)
          content: `${requestingMember.name} đã thêm ${newMember.name} vào nhóm`,
          type: "NOTIFY",
          action: "ADD",
          actionData: {
            targetId: newMember._id, // Người được thêm (B)
          },
          conversationId,
          channelId,
        });
        return message;
      })
    );

    conversation.lastMessageId = notifyMessages[notifyMessages.length - 1]._id;
    await conversation.save();

    const addedMembers = allAddedMembers.map((member) => ({
      memberId: member._id,
      userId: member.userId,
      name: member.name,
    }));

    return { addedMembers, notifyMessages };
  },
  // Xóa thành viên khỏi hội thoại
  async removeMemberFromConversation(conversationId, userId, memberIdToRemove) {
    const conversation = await Conversation.findById(conversationId);
    if (!conversation) {
      throw new Error("Conversation not found");
    }
    if (!conversation.type) {
      throw new Error("Cannot remove members from an individual conversation");
    }

    const requestingMember = await Member.findOne({ conversationId, userId });
    if (!requestingMember) {
      throw new Error("You are not a member of this conversation");
    }

    if (!this.checkManager(conversation, requestingMember._id.toString())) {
      throw new Error("You do not have permission to remove members");
    }

    const memberToRemove = await Member.findOne({
      _id: memberIdToRemove,
      conversationId,
    });
    if (!memberToRemove) {
      throw new Error("Member not found in this conversation");
    }

    if (conversation.leaderId.toString() === memberIdToRemove.toString()) {
      throw new Error("Leader cannot remove themselves from the group");
    }

    // Cập nhật active thành false thay vì xóa
    memberToRemove.active = false;
    memberToRemove.leftAt = new Date();
    await memberToRemove.save();

    // Không cần cập nhật Conversation.members, vì Member vẫn tồn tại trong DB
    // Chỉ cần kiểm tra active khi lấy danh sách thành viên

    const channelId = await this.getDefaultChannelId(conversationId);
    const notifyMessage = await Message.createMessage({
      memberId: requestingMember._id,
      content: `${requestingMember.name} đã xóa ${memberToRemove.name} khỏi nhóm`,
      type: "NOTIFY",
      action: "REMOVE",
      actionData: {
        targetId: memberToRemove._id,
      },
      conversationId,
      channelId,
    });

    conversation.lastMessageId = notifyMessage._id;
    await conversation.save();

    return {
      removedMember: {
        memberId: memberToRemove._id,
        userId: memberToRemove.userId,
        name: memberToRemove.name,
      },
      notifyMessage,
    };
  },
  // Thêm phó nhóm vào hội thoại
  async addManagersToConversation(conversationId, userId, newManagerIds) {
    const conversation = await Conversation.findById(conversationId);
    if (!conversation) {
      throw new Error("Conversation not found");
    }
    if (!conversation.type) {
      throw new Error("Cannot add managers to an individual conversation");
    }

    const requestingMember = await Member.findOne({ conversationId, userId });
    if (!requestingMember) {
      throw new Error("You are not a member of this conversation");
    }

    // Chỉ leader được thêm phó nhóm
    if (conversation.leaderId.toString() !== requestingMember._id.toString()) {
      throw new Error("Only the group leader can add managers");
    }

    // Kiểm tra các memberIds hợp lệ và active
    const members = await Member.find({
      _id: { $in: newManagerIds },
      conversationId,
      active: { $ne: false },
    }).lean();
    if (members.length !== newManagerIds.length) {
      throw new Error(
        "One or more members not found or inactive in this conversation"
      );
    }

    // Loại bỏ các memberIds đã là manager
    const existingManagerIds = conversation.managerIds.map((id) =>
      id.toString()
    );
    const managerIdsToAdd = newManagerIds.filter(
      (id) => !existingManagerIds.includes(id.toString())
    );

    if (managerIdsToAdd.length === 0) {
      throw new Error("All provided members are already managers");
    }

    // Cập nhật managerIds trong Conversation
    conversation.managerIds.push(...managerIdsToAdd);

    // Tạo tin nhắn NOTIFY cho từng phó nhóm được thêm
    const channelId = await this.getDefaultChannelId(conversationId);
    const notifyMessages = await Promise.all(
      managerIdsToAdd.map(async (managerId) => {
        const newManager = members.find(
          (m) => m._id.toString() === managerId.toString()
        );
        const message = await Message.createMessage({
          memberId: requestingMember._id, // Người thêm (A)
          content: `${requestingMember.name} đã thêm ${newManager.name} làm phó nhóm`,
          type: "NOTIFY",
          action: "UPDATE",
          actionData: {
            targetId: newManager._id, // Người được thêm làm phó nhóm (B)
          },
          conversationId,
          channelId,
        });
        return message;
      })
    );

    conversation.lastMessageId = notifyMessages[notifyMessages.length - 1]._id;
    await conversation.save();

    // Trả về danh sách phó nhóm mới được thêm
    const addedManagers = members
      .filter((m) => managerIdsToAdd.includes(m._id.toString()))
      .map((member) => ({
        memberId: member._id,
        userId: member.userId,
        name: member.name,
      }));

    return { addedManagers, notifyMessages };
  },
  async getDefaultChannelId(conversationId) {
    const channel = await Channel.findOne({
      conversationId,
      name: "Main",
    }).lean();
    return channel ? channel._id : null;
  },
};
module.exports = ConversationService;
