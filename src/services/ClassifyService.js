const Classify = require("../models/Classify");
const Conversation = require("../models/Conversation");
const Color = require("../models/Color");
const User = require("../models/User");
const NotFoundError = require("../exceptions/NotFoundError");
const CustomError = require("../exceptions/CustomError");

const ClassifyService = {
  async getAllByUserId(userId) {
    const classifies = await Classify.getAllByUserId(userId);
    const classifiesWithColor = await Promise.all(
      classifies.map(async (classify) => {
        const color = await Color.findById(classify.colorId).lean();
        if (!color) throw new NotFoundError("Color");

        return {
          ...classify._doc,
          color: {
            _id: color._id,
            name: color.name,
            code: color.code,
            type: color.type,
          },
        };
      })
    );
    return classifiesWithColor;
  },

  async addClassify(classify) {
    const userId = classify.userId;
    const colorId = classify.colorId;
    const conversationIds = classify.conversationIds;

    if (!userId) throw new CustomError("User cannot empty", 400);
    if (!colorId) throw new CustomError("Color cannot empty", 400);
    if (!conversationIds)
      throw new CustomError("Conversation cannot empty", 400);
    if (!Array.isArray(conversationIds))
      throw new CustomError("Conversation must be an array", 400);

    const user = await User.findById(userId).lean();
    if (!user) throw new NotFoundError("User");

    const color = await Color.findById(colorId).lean();
    if (!color) throw new NotFoundError("Color");

    const conversations = await Conversation.find({
      _id: { $in: conversationIds },
    }).lean();
    if (conversations.length !== conversationIds.length) {
      throw new NotFoundError("Some conversations");
    }

    return await Classify.addClassify(classify);
  },

  async updateClassify(classify, classifyId) {
    const userId = classify.userId;
    const colorId = classify.colorId;
    const conversationIds = classify.conversationIds;

    if (!userId) throw new CustomError("User cannot empty", 400);
    if (!colorId) throw new CustomError("Color cannot empty", 400);
    if (!conversationIds)
      throw new CustomError("Conversation cannot empty", 400);
    if (!Array.isArray(conversationIds))
      throw new CustomError("Conversation must be an array", 400);

    const user = await User.findById(userId).lean();
    if (!user) throw new NotFoundError("User");

    const color = await Color.findById(colorId).lean();
    if (!color) throw new NotFoundError("Color");

    const conversations = await Conversation.find({
      _id: { $in: conversationIds },
    }).lean();
    if (conversations.length !== conversationIds.length) {
      throw new NotFoundError("Some conversations");
    }

    return await Classify.updateClassify(classify, classifyId);
  },

  async deleteClassify(classifyId, userId) {
    if (!userId) throw new CustomError("User cannot empty", 400);
    if (!classifyId) throw new CustomError("Classify cannot empty", 400);

    const classify = await Classify.findById(classifyId).lean();
    if (!classify) throw new NotFoundError("Classify");

    if (classify.userId.toString() !== userId) {
      throw new CustomError("User not authorized to delete this classify", 403);
    }

    return await Classify.deleteClassify(classifyId);
  },

  async addConversationToClassify(classifyId, conversationId) {
    if (!conversationId)
      throw new CustomError("Conversation cannot empty", 400);
    const conversation = await Conversation.findById(conversationId).lean();
    if (!conversation) throw new NotFoundError("Conversation");

    const classify = await Classify.findById(classifyId).lean();
    if (!classify) throw new NotFoundError("Classify");

    if (classify.conversationIds.includes(conversationId)) {
      throw new CustomError("Conversation already in classify", 400);
    }

    return await Classify.addConversationToClassify(classifyId, conversationId);
  },

  async removeConversationFromClassify(classifyId, conversationId) {
    if (!conversationId)
      throw new CustomError("Conversation cannot empty", 400);
    const conversation = await Conversation.findById(conversationId).lean();
    if (!conversation) throw new NotFoundError("Conversation");

    const classify = await Classify.findById(classifyId).lean();
    if (!classify) throw new NotFoundError("Classify");

    const conversationIds = classify.conversationIds.map((id) => id.toString());
    if (!conversationIds.includes(conversationId)) {
      throw new CustomError("Conversation not in classify", 400);
    }

    return await Classify.removeConversationFromClassify(
      classifyId,
      conversationId
    );
  },

  async getById(classifyId) {
    return await Classify.getById(classifyId);
  },
};

module.exports = ClassifyService;
