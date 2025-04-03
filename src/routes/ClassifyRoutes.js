const express = require('express');
const router = express.Router();
const ClassifyController = require('../controllers/ClassifyController');

router.get('/', ClassifyController.getAllByUserId);
router.post('/', ClassifyController.addClassify);
router.put('/:classifyId', ClassifyController.updateClassify);
router.delete('/:classifyId', ClassifyController.deleteClassify);
router.get('/:classifyId', ClassifyController.getById);
router.post('/:classifyId/:conversationId', ClassifyController.addConversationToClassify);
router.delete('/:classifyId/:conversationId', ClassifyController.removeConversationFromClassify);

module.exports = router;    