const express = require('express');
const router = express.Router();
const CloudinaryController = require('../controllers/CloudinaryController');
const { upload, checkFileSize } = require('../config/cloudinary');

router.post('/images', upload.array('image'), CloudinaryController.uploadImages);

module.exports = router;    