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
};
module.exports = ConversationService;
