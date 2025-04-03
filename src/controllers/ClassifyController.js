const ClassifyService = require('../services/ClassifyService');

const ClassifyController = {
    async getAllByUserId(req, res) {
        const userId = req.body.userId;
        const classifies = await ClassifyService.getAllByUserId(userId);
        res.json(classifies);
    },

    async addClassify(req, res) {
        const classify = req.body;
        const newClassify = await ClassifyService.addClassify(classify);
        res.json(newClassify);
    },

    async updateClassify(req, res) {
        const classifyId = req.params.classifyId;
        const classify = req.body;
        const updatedClassify = await ClassifyService.updateClassify(classify, classifyId);
        res.json(updatedClassify);
    },

    async deleteClassify(req, res) {
        const classifyId = req.params.classifyId;
        const classifyRemoved = await ClassifyService.deleteClassify(classifyId);
        res.json(classifyRemoved);
    },

    async getById(req, res) {
        const classifyId = req.params.classifyId;
        const classify = await ClassifyService.getById(classifyId);
        res.json(classify);
    },

    async addConversationToClassify(req, res) {
        const classifyId = req.params.classifyId;
        const conversationId = req.params.conversationId;
        const classify = await ClassifyService.addConversationToClassify(classifyId, conversationId);
        res.json(classify);
    },

    async removeConversationFromClassify(req, res) {
        const classifyId = req.params.classifyId;
        const conversationId = req.params.conversationId;
        const classify = await ClassifyService.removeConversationFromClassify(classifyId, conversationId);
        res.json(classify);
    }
};

module.exports = ClassifyController;