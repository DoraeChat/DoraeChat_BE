const ClassifyService = require('../services/ClassifyService');

const ClassifyController = {
    // [GET] /api/classifies
    async getAllByUserId(req, res) {
        const userId = req.body.userId;
        const classifies = await ClassifyService.getAllByUserId(userId);
        res.json(classifies);
    },

    // [POST] /api/classifies
    async addClassify(req, res) {
        const classify = req.body;
        const newClassify = await ClassifyService.addClassify(classify);
        res.json(newClassify);
    },

    // [PUT] /api/classifies/:classifyId
    async updateClassify(req, res) {
        const classifyId = req.params.classifyId;
        const classify = req.body;
        const updatedClassify = await ClassifyService.updateClassify(classify, classifyId);
        res.json(updatedClassify);
    },

    // [DELETE] /api/classifies/:classifyId
    async deleteClassify(req, res) {
        const classifyId = req.params.classifyId;
        const classifyRemoved = await ClassifyService.deleteClassify(classifyId);
        res.json(classifyRemoved);
    },

    // [GET] /api/classifies/:classifyId
    async getById(req, res) {
        const classifyId = req.params.classifyId;
        const classify = await ClassifyService.getById(classifyId);
        res.json(classify);
    },

    // [POST] /api/classifies/:classifyId/:conversationId
    async addConversationToClassify(req, res) {
        const classifyId = req.params.classifyId;
        const conversationId = req.params.conversationId;
        const classify = await ClassifyService.addConversationToClassify(classifyId, conversationId);
        res.json(classify);
    },

    // [DELETE] /api/classifies/:classifyId/:conversationId
    async removeConversationFromClassify(req, res) {
        const classifyId = req.params.classifyId;
        const conversationId = req.params.conversationId;
        const classify = await ClassifyService.removeConversationFromClassify(classifyId, conversationId);
        res.json(classify);
    }
};

module.exports = ClassifyController;