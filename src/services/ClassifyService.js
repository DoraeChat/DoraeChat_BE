const Classify = require('../models/Classify');

const ClassifyService = {
    async getAllByUserId(userId) {
        return await Classify.getAllByUserId(userId);
    },

    async addClassify(classify) {
        return await Classify.addClassify(classify);
    },

    async updateClassify(classify, classifyId) {
        return await Classify.updateClassify(classify, classifyId);
    },

    async deleteClassify(classifyId) {
        return await Classify.deleteClassify(classifyId);
    },

    async addConversationToClassify(classifyId, conversationId) {
        return await Classify.addConversationToClassify(classifyId, conversationId);
    },

    async removeConversationFromClassify(classifyId, conversationId) {
        return await Classify.removeConversationFromClassify(classifyId, conversationId);
    },

    async getById(classifyId) {
        return await Classify.getById(classifyId);
    }
};

module.exports = ClassifyService;