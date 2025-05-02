const ClassifyService = require("../services/ClassifyService");

const ClassifyController = {
  // [GET] /api/classifies
  async getAllByUserId(req, res) {
    const userId = req._id;
    const classifies = await ClassifyService.getAllByUserId(userId);
    res.json(classifies);
  },

  // [POST] /api/classifies
  async addClassify(req, res, next) {
    try {
      const userId = req._id;
      const { name, conversationIds, colorId } = req.body;
      const classifyData = {
        userId,
        name,
        conversationIds,
        colorId
      };
      const newClassify = await ClassifyService.addClassify(classifyData);
      res.status(200).json(newClassify);
    } catch (error) {
      next(error);
    }
  },

  // [PUT] /api/classifies/:classifyId
  async updateClassify(req, res, next) {
    try {
      const classifyId = req.params.classifyId;
      const userId = req._id;
      const { name, conversationIds, colorId } = req.body;
      const classifyData = {
        userId,
        name,
        conversationIds,
        colorId
      };
      const updatedClassify = await ClassifyService.updateClassify(
        classifyData,
        classifyId
      );
      res.status(200).json(updatedClassify);
    } catch (error) {
      next(error);
    }
  },

  // [DELETE] /api/classifies/:classifyId
  async deleteClassify(req, res, next) {
    try {
      const classifyId = req.params.classifyId;
      const userId = req._id;
      const classifyRemoved = await ClassifyService.deleteClassify(
        classifyId,
        userId
      );
      res.json(classifyRemoved);
    } catch (error) {
      next(error);
    }
  },

  // [GET] /api/classifies/:classifyId
  async getById(req, res) {
    const classifyId = req.params.classifyId;
    const classify = await ClassifyService.getById(classifyId);
    res.json(classify);
  },

  // [POST] /api/classifies/:classifyId/:conversationId
  async addConversationToClassify(req, res, next) {
    try {
      const classifyId = req.params.classifyId;
      const conversationId = req.params.conversationId;
      const classify = await ClassifyService.addConversationToClassify(
        classifyId,
        conversationId
      );
      res.status(200).json(classify);
    } catch (error) {
      next(error);
    }
  },

  // [DELETE] /api/classifies/:classifyId/:conversationId
  async removeConversationFromClassify(req, res, next) {
    try {
      const classifyId = req.params.classifyId;
      const conversationId = req.params.conversationId;
      const classify = await ClassifyService.removeConversationFromClassify(
        classifyId,
        conversationId
      );
      res.json(classify);
    } catch (error) {
      next(error);
    }
  },
};

module.exports = ClassifyController;
