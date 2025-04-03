const Conversation = require("../models/Conversation");
const Member = require("../models/Member");
const User = require("../models/User");
const ConversationService = {
  // Lấy danh sách hội thoại của người dùng
  async getListByUserId(userId) {
    return await Conversation.getListByUserId(userId);
  },
  // 🔍 Kiểm tra xem cuộc trò chuyện cá nhân giữa 2 user có tồn tại không
  async findOrCreateIndividualConversation(userId1, userId2) {
    // Kiểm tra nếu đã có cuộc trò chuyện 1-1 giữa hai user
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
      leaderId, // Người tạo nhóm
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

    // Cập nhật members trong Conversation
    conversation.members = memberIds;
    await conversation.save();

    return conversation;
  },
  // 🔹 Đổi tên nhóm hội thoại
  async updateGroupName(conversationId, newName, userId) {
    const conversation = await Conversation.findById(conversationId);
    const member = await Member.findOne({
      conversationId,
      userId,
    });
    if (!conversation) {
      throw new Error("Conversation not found");
    }

    if (!conversation.type) {
      throw new Error("Cannot rename an individual conversation");
    }

    // Kiểm tra xem user có phải là leader hoặc quản trị viên không
    if (
      conversation.leaderId.toString() !== member._id &&
      !conversation.managerIds.includes(member._id)
    ) {
      throw new Error("You do not have permission to rename this group");
    }
    conversation.name = newName;
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
};

module.exports = ConversationService;
