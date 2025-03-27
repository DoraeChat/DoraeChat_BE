const express = require('express');
const router = express.Router();
const ColorController = require('../controllers/ColorController');

router.get('/', ColorController.getAll);
router.get('/:colorId', ColorController.getById);
router.get('/name/:name', ColorController.getByName);

module.exports = router;