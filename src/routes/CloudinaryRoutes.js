const express = require('express');
const router = express.Router();
const CloudinaryController = require('../controllers/CloudinaryController');
const { upload, checkFileSize } = require('../config/cloudinary');

router.post('/images', upload.array('image'), CloudinaryController.uploadImages);
router.post('/videos', upload.single('video'), CloudinaryController.uploadVideo);

module.exports = router;    