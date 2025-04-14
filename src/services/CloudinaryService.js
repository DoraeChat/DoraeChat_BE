const User = require('../models/User');
const NotFoundError = require('../exceptions/NotFoundError');
const { uploadImages, uploadVideo } = require('../config/cloudinary');
const fs = require('fs').promises;

const CloudinaryService = {
    async uploadImagesMessage(userId, files) {
        if (!files) {
            throw new Error('Please provide an avatar file');
        }
        if (!Array.isArray(files)) {
            files = [files];
        }
    
        try {
            const uploadResult = await uploadImages(files, userId, 'images');
    
            return uploadResult.map((result) => ({
                url: result.url,
                publicId: result.publicId,
            }));
        } catch (error) {
            throw error;
        }
    },

    async uploadVideoMessage(userId, file) {
        if (!file) {
            throw new Error('Please provide an video file');
        }
    
        try {
            const uploadResult = await uploadVideo(file.path, userId, 'videos');
    
            fs.unlink(file.path);

            return {
                url: uploadResult.url,
                publicId: uploadResult.publicId,
            };
        } catch (error) {
            throw error;
        }
    },
}

module.exports = CloudinaryService;